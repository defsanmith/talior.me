import { Injectable } from "@nestjs/common";
import {
  EditableResume,
  FontFamily,
  JobStage,
  JobStatus,
  ParsedJD,
  SectionOrder,
} from "@tailor.me/shared";
import { Job, Worker } from "bullmq";
import { randomBytes } from "crypto";
import { ContentSelection, ProfileData } from "../ai/ai-provider.interface";
import { AIService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { BM25Processor } from "./bm25.processor";
import { EvaluationProcessor } from "./evaluation.processor";
import { ProfileFetcher } from "./profile-fetcher";

interface JobData {
  jobId: string;
  userId: string;
  jobDescription: string;
  strategy?: string;
  phase?: "evaluate" | "generate";
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
    private readonly evaluationProcessor: EvaluationProcessor,
    private readonly profileFetcher: ProfileFetcher,
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
      async (job) => {
        const phase = job.data.phase;
        if (!phase) return this.processJob(job);
        if (phase === "evaluate")
          return this.evaluationProcessor.processEvaluation(job);
        return this.processJob(job);
      },
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
      select: {
        strategy: true,
        parsedJd: true,
        companyId: true,
        positionId: true,
        teamId: true,
      },
    });
    if (jobRecord?.strategy === "bm25") {
      return this.bm25Processor.processBM25Job(job);
    }

    try {
      // Step A: Parse JD (skip if already parsed from evaluation phase)
      await this.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        JobStage.PARSING_JD,
        10,
      );
      await job.updateProgress({
        progress: 10,
        stage: JobStage.PARSING_JD,
        userId,
      });

      let parsedJd: ParsedJD;

      if (jobRecord?.parsedJd) {
        parsedJd = jobRecord.parsedJd as unknown as ParsedJD;
      } else {
        parsedJd = await this.ai.parseJobDescription(jobDescription);

        let companyId: string | null = jobRecord?.companyId ?? null;
        let positionId: string | null = jobRecord?.positionId ?? null;
        let teamId: string | null = jobRecord?.teamId ?? null;

        if (!companyId && parsedJd.companyName) {
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

        if (!positionId && parsedJd.jobPosition) {
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

        if (!teamId && parsedJd.teamName) {
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

        await this.prisma.resumeJob.update({
          where: { id: jobId },
          data: {
            parsedJd: parsedJd as any,
            companyId,
            positionId,
            teamId,
          },
        });
      }

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
            relevanceScore: 3,
            relevanceReason: "All experiences included (selection disabled)",
          })),
          projects: profileData.projects.map((proj) => ({
            id: proj.id,
            bulletIds: [],
            relevanceScore: 3,
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

      // Filter experiences/projects:
      // 1. Drop anything with relevanceScore < 3 (genuinely irrelevant — threshold guard)
      // 2. Drop anything that ended up with zero valid bullets (ID hallucination guard)
      const extractedByParent = new Map<string, number>();
      for (const b of selectedBullets) {
        extractedByParent.set(b.parentId, (extractedByParent.get(b.parentId) ?? 0) + 1);
      }
      const validatedSelection = {
        ...contentSelection,
        experiences: contentSelection.experiences.filter((exp) => {
          const score = exp.relevanceScore ?? 3; // default to 3 if missing (backward compat)
          if (score < 3) {
            console.warn(`Experience ${exp.id} scored ${score}/5 relevance, removing from selection`);
            return false;
          }
          const count = extractedByParent.get(exp.id) ?? 0;
          if (count === 0) {
            console.warn(`Experience ${exp.id} had no valid bullets after extraction, removing from selection`);
          }
          return count > 0;
        }),
        projects: contentSelection.projects.filter((proj) => {
          const score = proj.relevanceScore ?? 3;
          if (score < 3) {
            console.warn(`Project ${proj.id} scored ${score}/5 relevance, removing from selection`);
            return false;
          }
          const count = extractedByParent.get(proj.id) ?? 0;
          if (count === 0) {
            console.warn(`Project ${proj.id} had no valid bullets after extraction, removing from selection`);
          }
          return count > 0;
        }),
      };
      contentSelection = validatedSelection;

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
      await job.updateProgress({
        progress: 70,
        stage: JobStage.VERIFYING,
        userId,
      });

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
      await job.updateProgress({
        progress: 85,
        stage: JobStage.ASSEMBLING,
        userId,
      });

      const resume = this.assembleResumeFromSelection(
        profileData,
        contentSelection,
        verifiedBullets,
        sortedSkills,
      );

      // Apply the user's default preset (section order + style) if one is set
      const defaultPreset = await this.prisma.resumePreset.findFirst({
        where: { userId, isDefault: true },
      });
      if (defaultPreset) {
        const presetSectionOrder = defaultPreset.sectionOrder as SectionOrder[];
        if (presetSectionOrder && presetSectionOrder.length > 0) {
          // Merge: keep the preset ordering but only include sections that exist in the assembled resume
          const assembledOrder = resume.sectionOrder;
          const assembledMap = new Map(assembledOrder.map((s) => [s.type, s]));
          const mergedOrder: SectionOrder[] = presetSectionOrder
            .map((ps, idx) => {
              const assembled = assembledMap.get(ps.type);
              return assembled
                ? { ...assembled, order: idx, visible: ps.visible }
                : null;
            })
            .filter(Boolean) as SectionOrder[];
          // Append any sections missing from the preset
          assembledOrder.forEach((s) => {
            if (!mergedOrder.find((m) => m.type === s.type)) {
              mergedOrder.push({ ...s, order: mergedOrder.length });
            }
          });
          resume.sectionOrder = mergedOrder;
        }
        resume.styleOptions = {
          fontFamily:
            (defaultPreset.fontFamily as FontFamily) ??
            FontFamily.COMPUTER_MODERN,
          fontSize: (defaultPreset.fontSize as 10 | 11 | 12) ?? 11,
        };
      }

      // Step H: Save results
      await this.saveResults(jobId, resume, selectedBullets, verifiedBullets);

      await this.updateJobStatus(
        jobId,
        JobStatus.COMPLETED,
        JobStage.COMPLETED,
        100,
      );
      await job.updateProgress({
        progress: 100,
        stage: JobStage.COMPLETED,
        userId,
      });
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

  private async fetchFullProfile(userId: string): Promise<ProfileData> {
    return this.profileFetcher.fetchFullProfile(userId);
  }

  /**
   * Extracts the selected bullets from the AI selection for rewriting
   */
  private extractSelectedBullets(
    profileData: ProfileData,
    selection: ContentSelection,
  ): SelectedBullet[] {
    const bullets: SelectedBullet[] = [];
    const seenBulletIds = new Set<string>();

    // Extract experience bullets
    for (const expSelection of selection.experiences) {
      const experience = profileData.experiences.find(
        (e) => e.id === expSelection.id,
      );
      if (!experience) continue;

      for (const bulletId of expSelection.bulletIds) {
        if (seenBulletIds.has(bulletId)) continue;
        const bullet = experience.bullets.find((b) => b.id === bulletId);
        if (bullet) {
          seenBulletIds.add(bullet.id);
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
        if (seenBulletIds.has(bulletId)) continue;
        const bullet = project.bullets.find((b) => b.id === bulletId);
        if (bullet) {
          seenBulletIds.add(bullet.id);
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
    const concurrency = parseInt(
      process.env.BULLET_REWRITE_CONCURRENCY || "5",
    );

    for (let i = 0; i < bullets.length; i += concurrency) {
      const batch = bullets.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(async (bullet) => {
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

      const hardViolations: string[] = [];
      const softViolations: string[] = [];

      // Deterministic checks
      const originalText = original.content.toLowerCase();
      const rewrittenText = rewritten.rewrittenText.toLowerCase();

      // Check for new numbers — soft violation (rewording can incidentally include digits)
      const originalNumbers: string[] = originalText.match(/\d+/g) || [];
      const rewrittenNumbers: string[] = rewrittenText.match(/\d+/g) || [];
      const newNumbers = rewrittenNumbers.filter(
        (n) => !originalNumbers.includes(n),
      );
      if (newNumbers.length > 0) {
        softViolations.push(`New numbers added: ${newNumbers.join(", ")}`);
      }

      // Check for new tech — hard violation (hallucination risk)
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
          hardViolations.push(`New tech mentioned: ${tech}`);
        }
      }

      // Check for scope inflation words — soft violation (verb replacements are expected)
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
          softViolations.push(`Scope word added: ${word}`);
        }
      }

      // Hard violations trigger full revert; soft violations are logged but rewrite is kept
      if (hardViolations.length > 0) {
        verified.set(original.id, {
          text: original.content,
          verifierNote: `Reverted due to: ${hardViolations.join("; ")}`,
        });
      } else {
        verified.set(original.id, {
          text: rewritten.rewrittenText,
          verifierNote:
            softViolations.length > 0
              ? `Soft flags (kept rewrite): ${softViolations.join("; ")}`
              : null,
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
    const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
      const seen = new Set<string>();
      return items.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    };

    const selectedExperiences = dedupeById(selection.experiences);
    const selectedProjects = dedupeById(selection.projects);
    const selectedEducation = dedupeById(selection.education);

    const experienceBulletOwner = new Map<string, string>();
    for (const experience of profileData.experiences) {
      for (const bullet of experience.bullets) {
        experienceBulletOwner.set(bullet.id, experience.id);
      }
    }

    const projectBulletOwner = new Map<string, string>();
    for (const project of profileData.projects) {
      for (const bullet of project.bullets) {
        projectBulletOwner.set(bullet.id, project.id);
      }
    }

    const usedExperienceBulletIds = new Set<string>();
    const usedProjectBulletIds = new Set<string>();

    // Build experience sections from AI selection with relevance reasons
    const experiences = selectedExperiences
      .map((expSelection, index) => {
        const experience = profileData.experiences.find(
          (e) => e.id === expSelection.id,
        );
        if (!experience) return null;

        const uniqueBulletIds = [...new Set(expSelection.bulletIds)];
        const bullets: Array<{
          id: string;
          text: string;
          visible: true;
          order: number;
        }> = [];

        for (const bulletId of uniqueBulletIds) {
          if (experienceBulletOwner.get(bulletId) !== experience.id) continue;
          if (usedExperienceBulletIds.has(bulletId)) continue;

          const verified = verifiedBullets.get(bulletId);
          if (!verified) continue;

          usedExperienceBulletIds.add(bulletId);
          bullets.push({
            id: bulletId,
            text: verified.text,
            visible: true,
            order: bullets.length,
          });
        }

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
    const projects = selectedProjects
      .map((projSelection, index) => {
        const project = profileData.projects.find(
          (p) => p.id === projSelection.id,
        );
        if (!project) return null;

        const uniqueBulletIds = [...new Set(projSelection.bulletIds)];
        const bullets: Array<{
          id: string;
          text: string;
          visible: true;
          order: number;
        }> = [];

        for (const bulletId of uniqueBulletIds) {
          if (projectBulletOwner.get(bulletId) !== project.id) continue;
          if (usedProjectBulletIds.has(bulletId)) continue;

          const verified = verifiedBullets.get(bulletId);
          if (!verified) continue;

          usedProjectBulletIds.add(bulletId);
          bullets.push({
            id: bulletId,
            text: verified.text,
            visible: true,
            order: bullets.length,
          });
        }

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
    const education = selectedEducation
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
            openToRelocate: profileData.user.openToRelocate,
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
        {
          id: "certifications",
          type: "certifications" as const,
          visible: true,
          order: 4,
        },
      ],
      education,
      experiences,
      skillCategories,
      projects,
      certifications: profileData.certifications.map((cert, index) => ({
        id: cert.id,
        title: cert.title,
        issuer: cert.issuer,
        issueDate: cert.issueDate,
        expirationDate: cert.expirationDate,
        credentialUrl: cert.credentialUrl,
        visible: true,
        order: index,
      })),
    };
  }

  private async saveResults(
    jobId: string,
    resume: EditableResume,
    selectedBullets: SelectedBullet[],
    verifiedBullets: Map<string, any>,
  ): Promise<void> {
    // Generate a unique tracking slug for resume open-rate tracking
    const trackingSlug = randomBytes(6).toString("hex");

    // If the user has tracking enabled at the global level, embed the tracking
    // URL into the resume object right away so the toggle in the UI only needs
    // to update the resume JSON — no extra DB flag required.
    const job = await this.prisma.resumeJob.findUnique({
      where: { id: jobId },
      include: { user: true },
    });
    const user = job?.user as any;
    if (user?.trackingEnabled && user?.website) {
      const prefix = (user.trackingSlugPrefix as string) || "r";
      const base = (user.website as string).replace(/\/+$/, "");
      resume = {
        ...resume,
        user: {
          ...resume.user,
          websiteHref: `${base}/${prefix}/${trackingSlug}`,
        },
      };
    }

    // Save resume
    await this.prisma.resumeJob.update({
      where: { id: jobId },
      data: {
        resultResume: resume as any,
        completedAt: new Date(),
        trackingSlug,
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
