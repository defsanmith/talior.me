import { Injectable } from "@nestjs/common";
import {
  EditableResume,
  JobStage,
  JobStatus,
  ParsedJD,
} from "@tailor.me/shared";
import { Job, Worker } from "bullmq";
import { ContentSelection, ProfileData } from "../ai/ai-provider.interface";
import { AIService } from "../ai/ai.service";
import { BM25Processor } from "./bm25.processor";
import { PrismaService } from "../prisma/prisma.service";

interface JobData {
  jobId: string;
  userId: string;
  jobDescription: string;
  strategy?: string;
}

interface SelectedBullet {
  id: string;
  content: string;
  tags: string[];
  skills: string[];
  parentId: string; // experienceId or projectId
  parentType: "experience" | "project";
}

@Injectable()
export class ResumeProcessor {
  private worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AIService,
    private readonly bm25Processor: BM25Processor,
  ) {
    this.initializeWorker();
  }

  private initializeWorker() {
    const connection = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    };

    this.worker = new Worker<JobData>(
      "resume-build",
      async (job) => this.processJob(job),
      {
        connection,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || "10"),
      },
    );

    this.worker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    console.log("✅ Worker initialized and listening for jobs");
  }

  private async processJob(job: Job<JobData>): Promise<void> {
    const { jobId, userId, jobDescription } = job.data;

    const jobRecord = await this.prisma.resumeJob.findUnique({
      where: { id: jobId },
      select: { strategy: true },
    });
    if (jobRecord?.strategy === "bm25") {
      return this.bm25Processor.processBM25Job(job);
    }

    try {
      // Step A: Parse JD (includes metadata extraction)
      await this.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        JobStage.PARSING_JD,
        10,
      );
      await job.updateProgress({ progress: 10, stage: JobStage.PARSING_JD, userId });

      const parsedJd = await this.ai.parseJobDescription(jobDescription);

      // Upsert company, position, and team from parsed metadata
      let companyId: string | null = null;
      let positionId: string | null = null;
      let teamId: string | null = null;

      if (parsedJd.companyName) {
        const company = await this.prisma.company.upsert({
          where: {
            userId_name: {
              userId,
              name: parsedJd.companyName,
            },
          },
          create: {
            userId,
            name: parsedJd.companyName,
          },
          update: {},
        });
        companyId = company.id;
      }

      if (parsedJd.jobPosition) {
        const position = await this.prisma.position.upsert({
          where: {
            userId_title: {
              userId,
              title: parsedJd.jobPosition,
            },
          },
          create: {
            userId,
            title: parsedJd.jobPosition,
          },
          update: {},
        });
        positionId = position.id;
      }

      if (parsedJd.teamName) {
        const team = await this.prisma.team.upsert({
          where: {
            userId_name: {
              userId,
              name: parsedJd.teamName,
            },
          },
          create: {
            userId,
            name: parsedJd.teamName,
          },
          update: {},
        });
        teamId = team.id;
      }

      // Update job with parsed JD and linked metadata
      await this.prisma.resumeJob.update({
        where: { id: jobId },
        data: {
          parsedJd: parsedJd as any,
          companyId,
          positionId,
          teamId,
        },
      });

      // Step B: Retrieve full profile
      await this.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        JobStage.RETRIEVING_BULLETS,
        20,
      );
      await job.updateProgress({
        progress: 20,
        stage: JobStage.RETRIEVING_BULLETS,
        userId,
      });

      const profileData = await this.fetchFullProfile(userId);

      // Step C: AI-based content selection
      let contentSelection: ContentSelection;
      const skipSelection = process.env.SKIP_CONTENT_SELECTION === "true";

      if (skipSelection) {
        // Skip AI selection and include all experiences/projects with no bullets
        contentSelection = {
          experiences: profileData.experiences.map((exp) => ({
            id: exp.id,
            bulletIds: [],
            relevanceReason: "All experiences included (selection disabled)",
          })),
          projects: profileData.projects.map((proj) => ({
            id: proj.id,
            bulletIds: [],
            relevanceReason: "All projects included (selection disabled)",
          })),
          education: profileData.education.map((edu) => ({
            id: edu.id,
            selectedCoursework: [],
            relevanceReason: "All education included (selection disabled)",
          })),
        };
      } else {
        await this.updateJobStatus(
          jobId,
          JobStatus.PROCESSING,
          JobStage.SELECTING_BULLETS,
          35,
        );
        await job.updateProgress({
          progress: 35,
          stage: JobStage.SELECTING_BULLETS,
          userId,
        });

        contentSelection = await this.ai.selectRelevantContent(
          profileData,
          parsedJd,
        );
      }

      // Step D: Extract selected bullets for rewriting
      const selectedBullets = this.extractSelectedBullets(
        profileData,
        contentSelection,
      );

      // Step E: Rewrite bullets
      let rewrittenBullets: Map<string, any>;
      const skipRewriteBullets = process.env.SKIP_REWRITE_BULLETS === "true";

      if (skipRewriteBullets) {
        // Skip rewriting and use original bullets
        rewrittenBullets = new Map();
        for (const bullet of selectedBullets) {
          rewrittenBullets.set(bullet.id, {
            bulletId: bullet.id,
            rewrittenText: bullet.content,
            evidenceBulletIds: [bullet.id],
            riskFlags: [],
          });
        }
      } else {
        await this.updateJobStatus(
          jobId,
          JobStatus.PROCESSING,
          JobStage.REWRITING_BULLETS,
          50,
        );
        await job.updateProgress({
          progress: 50,
          stage: JobStage.REWRITING_BULLETS,
          userId,
        });

        rewrittenBullets = await this.rewriteBullets(selectedBullets, parsedJd);
      }

      // Step F: Verify
      await this.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        JobStage.VERIFYING,
        70,
      );
      await job.updateProgress({ progress: 70, stage: JobStage.VERIFYING, userId });

      const verifiedBullets = this.verifyBullets(
        selectedBullets,
        rewrittenBullets,
      );

      // Step G: Sort skills manually based on selected bullets
      const sortedSkills = this.sortSkillsByRelevance(
        profileData,
        contentSelection,
        parsedJd,
      );

      // Step H: Assemble resume
      await this.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        JobStage.ASSEMBLING,
        85,
      );
      await job.updateProgress({ progress: 85, stage: JobStage.ASSEMBLING, userId });

      const resume = this.assembleResumeFromSelection(
        profileData,
        contentSelection,
        verifiedBullets,
        sortedSkills,
      );

      // Step H: Save results
      await this.saveResults(jobId, resume, selectedBullets, verifiedBullets);

      await this.updateJobStatus(
        jobId,
        JobStatus.COMPLETED,
        JobStage.COMPLETED,
        100,
      );
      await job.updateProgress({ progress: 100, stage: JobStage.COMPLETED, userId });
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      await this.updateJobStatus(
        jobId,
        JobStatus.FAILED,
        JobStage.FAILED,
        0,
        error instanceof Error ? error.message : "Unknown error",
      );
      throw error;
    }
  }

  /**
   * Fetches the complete user profile for AI-based selection
   */
  private async fetchFullProfile(userId: string): Promise<ProfileData> {
    const [user, experiences, projects, education, skillCategories] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
        }),
        this.prisma.experience.findMany({
          where: { userId },
          orderBy: { startDate: "desc" },
          include: {
            bullets: {
              include: {
                skills: {
                  include: { skill: true },
                },
              },
            },
          },
        }),
        this.prisma.project.findMany({
          where: { userId },
          include: {
            bullets: true,
            skills: {
              include: { skill: true },
            },
          },
        }),
        this.prisma.education.findMany({
          where: { userId },
        }),
        this.prisma.skillCategory.findMany({
          where: { userId },
          include: {
            skills: true,
          },
        }),
      ]);

    return {
      user: user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            location: user.location,
            website: user.website,
            linkedin: user.linkedin,
          }
        : null,
      experiences: experiences.map((exp) => ({
        id: exp.id,
        company: exp.company,
        title: exp.title,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        bullets: exp.bullets.map((b) => ({
          id: b.id,
          content: b.content,
          skills: b.skills.map((bs: any) => bs.skill.name),
        })),
      })),
      projects: projects.map((proj) => ({
        id: proj.id,
        name: proj.name,
        date: proj.date,
        url: proj.url,
        skills: proj.skills.map((ps: any) => ps.skill.name),
        bullets: proj.bullets.map((b) => ({
          id: b.id,
          content: b.content,
        })),
      })),
      education: education.map((edu: any) => ({
        id: edu.id,
        institution: edu.institution,
        degree: edu.degree,
        location: edu.location,
        graduationDate: edu.graduationDate,
        coursework: edu.coursework || [],
      })),
      skillCategories: skillCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        skills: cat.skills.map((s) => ({
          id: s.id,
          name: s.name,
        })),
      })),
    };
  }

  /**
   * Extracts the selected bullets from the AI selection for rewriting
   */
  private extractSelectedBullets(
    profileData: ProfileData,
    selection: ContentSelection,
  ): SelectedBullet[] {
    const bullets: SelectedBullet[] = [];

    // Extract experience bullets
    for (const expSelection of selection.experiences) {
      const experience = profileData.experiences.find(
        (e) => e.id === expSelection.id,
      );
      if (!experience) continue;

      for (const bulletId of expSelection.bulletIds) {
        const bullet = experience.bullets.find((b) => b.id === bulletId);
        if (bullet) {
          bullets.push({
            id: bullet.id,
            content: bullet.content,
            tags: [],
            skills: bullet.skills,
            parentId: experience.id,
            parentType: "experience",
          });
        }
      }
    }

    // Extract project bullets
    for (const projSelection of selection.projects) {
      const project = profileData.projects.find(
        (p) => p.id === projSelection.id,
      );
      if (!project) continue;

      for (const bulletId of projSelection.bulletIds) {
        const bullet = project.bullets.find((b) => b.id === bulletId);
        if (bullet) {
          bullets.push({
            id: bullet.id,
            content: bullet.content,
            tags: [],
            skills: project.skills, // Use project skills for project bullets
            parentId: project.id,
            parentType: "project",
          });
        }
      }
    }

    return bullets;
  }

  private async rewriteBullets(
    bullets: SelectedBullet[],
    parsedJd: ParsedJD,
  ): Promise<Map<string, any>> {
    const rewritten = new Map();

    // Process bullets in parallel for better performance
    const results = await Promise.allSettled(
      bullets.map(async (bullet) => {
        try {
          const result = await this.ai.rewriteBullet(
            {
              id: bullet.id,
              content: bullet.content,
              tags: bullet.tags,
              skills: bullet.skills,
            },
            parsedJd,
          );
          return { id: bullet.id, result, success: true };
        } catch (error) {
          console.error(`Failed to rewrite bullet ${bullet.id}:`, error);
          return {
            id: bullet.id,
            result: {
              bulletId: bullet.id,
              rewrittenText: bullet.content,
              evidenceBulletIds: [bullet.id],
              riskFlags: ["rewrite_failed"],
            },
            success: false,
          };
        }
      }),
    );

    for (const res of results) {
      if (res.status === "fulfilled") {
        rewritten.set(res.value.id, res.value.result);
      }
    }

    return rewritten;
  }

  /**
   * Sorts all skills by relevance based on:
   * 1. Skills mentioned in selected bullets
   * 2. Skills matching job requirements
   * 3. Remaining skills in original order
   */
  private sortSkillsByRelevance(
    profileData: ProfileData,
    selection: ContentSelection,
    parsedJd: ParsedJD,
  ): Array<{ categoryId: string; skillIds: string[] }> {
    // Collect all skills mentioned in selected bullets
    const bulletSkills = new Set<string>();

    // From experiences
    for (const expSelection of selection.experiences) {
      const experience = profileData.experiences.find(
        (e) => e.id === expSelection.id,
      );
      if (!experience) continue;

      for (const bulletId of expSelection.bulletIds) {
        const bullet = experience.bullets.find((b) => b.id === bulletId);
        if (bullet) {
          bullet.skills.forEach((skill) =>
            bulletSkills.add(skill.toLowerCase()),
          );
        }
      }
    }

    // From projects
    for (const projSelection of selection.projects) {
      const project = profileData.projects.find(
        (p) => p.id === projSelection.id,
      );
      if (project) {
        project.skills.forEach((skill) =>
          bulletSkills.add(skill.toLowerCase()),
        );
      }
    }

    // Normalize job requirements for matching
    const jobRequirements = new Set<string>();
    [
      ...parsedJd.required_skills,
      ...parsedJd.nice_to_have,
      ...parsedJd.keywords,
    ].forEach((skill) => jobRequirements.add(skill.toLowerCase()));

    // Sort skills within each category
    const sortedCategories = profileData.skillCategories.map((category) => {
      const sortedSkillIds = [...category.skills].sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        // Priority 1: Skills in both selected bullets AND job requirements
        const aInBothBulletAndJob =
          bulletSkills.has(aName) && jobRequirements.has(aName);
        const bInBothBulletAndJob =
          bulletSkills.has(bName) && jobRequirements.has(bName);
        if (aInBothBulletAndJob !== bInBothBulletAndJob) {
          return aInBothBulletAndJob ? -1 : 1;
        }

        // Priority 2: Skills in selected bullets
        const aInBullets = bulletSkills.has(aName);
        const bInBullets = bulletSkills.has(bName);
        if (aInBullets !== bInBullets) {
          return aInBullets ? -1 : 1;
        }

        // Priority 3: Skills matching job requirements
        const aInJob = jobRequirements.has(aName);
        const bInJob = jobRequirements.has(bName);
        if (aInJob !== bInJob) {
          return aInJob ? -1 : 1;
        }

        // Priority 4: Keep original order (maintain stability)
        return 0;
      });

      return {
        categoryId: category.id,
        skillIds: sortedSkillIds.map((s) => s.id),
      };
    });

    return sortedCategories;
  }

  private verifyBullets(
    originalBullets: SelectedBullet[],
    rewrittenMap: Map<string, any>,
  ): Map<string, { text: string; verifierNote: string | null }> {
    const verified = new Map();

    for (const original of originalBullets) {
      const rewritten = rewrittenMap.get(original.id);
      if (!rewritten) continue;

      const issues: string[] = [];

      // Deterministic checks
      const originalText = original.content.toLowerCase();
      const rewrittenText = rewritten.rewrittenText.toLowerCase();

      // Check for new numbers
      const originalNumbers: string[] = originalText.match(/\d+/g) || [];
      const rewrittenNumbers: string[] = rewrittenText.match(/\d+/g) || [];
      const newNumbers = rewrittenNumbers.filter(
        (n) => !originalNumbers.includes(n),
      );
      if (newNumbers.length > 0) {
        issues.push(`New numbers added: ${newNumbers.join(", ")}`);
      }

      // Check for new tech (simple keyword check)
      const originalSkills = [...original.skills, ...original.tags].map((t) =>
        t.toLowerCase(),
      );
      const commonTechWords = [
        "react",
        "vue",
        "angular",
        "node",
        "python",
        "java",
        "go",
        "rust",
        "kubernetes",
        "docker",
        "aws",
        "azure",
        "gcp",
        "postgresql",
        "mongodb",
        "redis",
        "graphql",
        "rest",
      ];

      for (const tech of commonTechWords) {
        if (
          rewrittenText.includes(tech) &&
          !originalText.includes(tech) &&
          !originalSkills.includes(tech)
        ) {
          issues.push(`New tech mentioned: ${tech}`);
        }
      }

      // Check for scope inflation words
      const scopeWords = [
        "led",
        "owned",
        "architected",
        "managed",
        "directed",
        "spearheaded",
      ];
      for (const word of scopeWords) {
        if (rewrittenText.includes(word) && !originalText.includes(word)) {
          issues.push(`Scope inflation: ${word}`);
        }
      }

      // If issues found, revert to original
      if (issues.length > 0) {
        verified.set(original.id, {
          text: original.content,
          verifierNote: `Reverted due to: ${issues.join("; ")}`,
        });
      } else {
        verified.set(original.id, {
          text: rewritten.rewrittenText,
          verifierNote: null,
        });
      }
    }

    return verified;
  }

  /**
   * Assembles the final resume from AI selection and verified bullets
   * Returns EditableResume format with categorized skills and relevance reasons
   */
  private assembleResumeFromSelection(
    profileData: ProfileData,
    selection: ContentSelection,
    verifiedBullets: Map<string, { text: string; verifierNote: string | null }>,
    sortedSkills: Array<{
      categoryId: string;
      skillIds: string[];
    }>,
  ): EditableResume {
    // Build experience sections from AI selection with relevance reasons
    const experiences = selection.experiences
      .map((expSelection, index) => {
        const experience = profileData.experiences.find(
          (e) => e.id === expSelection.id,
        );
        if (!experience) return null;

        const bullets = expSelection.bulletIds
          .map((bulletId, bulletIndex) => {
            const verified = verifiedBullets.get(bulletId);
            if (!verified) return null;
            return {
              id: bulletId,
              text: verified.text,
              visible: true,
              order: bulletIndex,
            };
          })
          .filter((b): b is NonNullable<typeof b> => b !== null);

        return {
          id: experience.id,
          company: experience.company,
          title: experience.title,
          location: experience.location,
          startDate: experience.startDate,
          endDate: experience.endDate,
          bullets,
          visible: true,
          order: index,
          relevanceReason: expSelection.relevanceReason,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    // Build project sections from AI selection with relevance reasons
    const projects = selection.projects
      .map((projSelection, index) => {
        const project = profileData.projects.find(
          (p) => p.id === projSelection.id,
        );
        if (!project) return null;

        const bullets = projSelection.bulletIds
          .map((bulletId, bulletIndex) => {
            const verified = verifiedBullets.get(bulletId);
            if (!verified) return null;
            return {
              id: bulletId,
              text: verified.text,
              visible: true,
              order: bulletIndex,
            };
          })
          .filter((b): b is NonNullable<typeof b> => b !== null);

        return {
          id: project.id,
          name: project.name,
          date: project.date,
          url: project.url,
          tech: project.skills,
          bullets,
          visible: true,
          order: index,
          relevanceReason: projSelection.relevanceReason,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    // Build education sections from AI selection with coursework and relevance reasons
    const education = selection.education
      .map((eduSelection, index) => {
        const edu = profileData.education.find((e) => e.id === eduSelection.id);
        if (!edu) return null;

        return {
          id: edu.id,
          institution: edu.institution,
          degree: edu.degree,
          location: edu.location,
          graduationDate: edu.graduationDate,
          coursework: eduSelection.selectedCoursework.map((name, i) => ({
            id: `${edu.id}-cw-${i}`,
            name,
            visible: true,
          })),
          visible: true,
          order: index,
          relevanceReason: eduSelection.relevanceReason,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    // Build skill categories from manually sorted skills
    const skillCategories = sortedSkills
      .map((skillSelection, index) => {
        const category = profileData.skillCategories.find(
          (c) => c.id === skillSelection.categoryId,
        );
        if (!category) return null;

        const selectedSkills = skillSelection.skillIds
          .map((skillId) => {
            const skill = category.skills.find((s) => s.id === skillId);
            if (!skill) return null;
            return {
              id: skill.id,
              name: skill.name,
              visible: true,
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);

        if (selectedSkills.length === 0) return null;

        return {
          id: category.id,
          name: category.name,
          skills: selectedSkills,
          visible: true,
          order: index,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    return {
      user: profileData.user
        ? {
            firstName: profileData.user.firstName || undefined,
            lastName: profileData.user.lastName || undefined,
            email: profileData.user.email || undefined,
            phone: profileData.user.phone || undefined,
            location: profileData.user.location || undefined,
            website: profileData.user.website || undefined,
            linkedin: profileData.user.linkedin || undefined,
          }
        : undefined,
      sectionOrder: [
        {
          id: "education",
          type: "education" as const,
          visible: true,
          order: 0,
        },
        {
          id: "experience",
          type: "experience" as const,
          visible: true,
          order: 1,
        },
        { id: "skills", type: "skills" as const, visible: true, order: 2 },
        { id: "projects", type: "projects" as const, visible: true, order: 3 },
      ],
      education,
      experiences,
      skillCategories,
      projects,
    };
  }

  private async saveResults(
    jobId: string,
    resume: EditableResume,
    selectedBullets: SelectedBullet[],
    verifiedBullets: Map<string, any>,
  ): Promise<void> {
    // Save resume
    await this.prisma.resumeJob.update({
      where: { id: jobId },
      data: {
        resultResume: resume as any,
        completedAt: new Date(),
      },
    });

    // Save bullet mappings in parallel
    await Promise.all(
      selectedBullets.map(async (bullet) => {
        const verified = verifiedBullets.get(bullet.id);
        if (verified) {
          await this.prisma.resumeJobBullet.create({
            data: {
              resumeJobId: jobId,
              bulletId: bullet.id,
              originalText: bullet.content,
              rewrittenText: verified.text,
              evidence: { evidenceBulletIds: [bullet.id] },
              verifierNote: verified.verifierNote,
            },
          });
        }
      }),
    );
  }

  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    stage: string,
    progress: number,
    errorMessage?: string,
  ): Promise<void> {
    await this.prisma.resumeJob.update({
      where: { id: jobId },
      data: {
        status,
        stage,
        progress,
        errorMessage,
      },
    });
  }
}
