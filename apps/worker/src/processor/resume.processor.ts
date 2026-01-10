import { Injectable } from "@nestjs/common";
import { Job, Worker } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { OpenAIService } from "../openai/openai.service";
import { JobStatus, JobStage, ParsedJD, ResumeJson } from "@tailor.me/shared";

interface JobData {
  jobId: string;
  userId: string;
  jobDescription: string;
}

interface CandidateBullet {
  id: string;
  content: string;
  tags: string[];
  tech: string[];
  experienceId: string;
  score: number;
}

@Injectable()
export class ResumeProcessor {
  private worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAIService
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
      }
    );

    this.worker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    console.log("✅ Worker initialized and listening for jobs");
  }

  private async processJob(job: Job<JobData>): Promise<void> {
    const { jobId, userId, jobDescription } = job.data;

    try {
      await this.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        JobStage.PARSING_JD,
        10
      );
      await job.updateProgress({ progress: 10, stage: JobStage.PARSING_JD });

      // Step A: Parse JD
      const parsedJd = await this.openai.parseJobDescription(jobDescription);
      await this.prisma.resumeJob.update({
        where: { id: jobId },
        data: { parsedJd: parsedJd as any },
      });

      await this.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        JobStage.RETRIEVING_BULLETS,
        25
      );
      await job.updateProgress({
        progress: 25,
        stage: JobStage.RETRIEVING_BULLETS,
      });

      // Step B: Retrieve bullets
      const candidateBullets = await this.retrieveBullets(userId, parsedJd);

      await this.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        JobStage.SELECTING_BULLETS,
        40
      );
      await job.updateProgress({
        progress: 40,
        stage: JobStage.SELECTING_BULLETS,
      });

      // Step C: Select bullets
      const selectedBullets = this.selectBullets(candidateBullets, parsedJd);

      await this.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        JobStage.REWRITING_BULLETS,
        55
      );
      await job.updateProgress({
        progress: 55,
        stage: JobStage.REWRITING_BULLETS,
      });

      // Step D: Rewrite bullets
      const rewrittenBullets = await this.rewriteBullets(
        selectedBullets,
        parsedJd
      );

      await this.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        JobStage.VERIFYING,
        75
      );
      await job.updateProgress({ progress: 75, stage: JobStage.VERIFYING });

      // Step E: Verify
      const verifiedBullets = this.verifyBullets(
        selectedBullets,
        rewrittenBullets
      );

      await this.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        JobStage.ASSEMBLING,
        90
      );
      await job.updateProgress({ progress: 90, stage: JobStage.ASSEMBLING });

      // Step F: Assemble resume
      const resume = await this.assembleResume(
        userId,
        selectedBullets,
        verifiedBullets,
        parsedJd
      );

      // Step G: Save results
      await this.saveResults(jobId, resume, selectedBullets, verifiedBullets);

      await this.updateJobStatus(
        jobId,
        JobStatus.COMPLETED,
        JobStage.COMPLETED,
        100
      );
      await job.updateProgress({ progress: 100, stage: JobStage.COMPLETED });
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      await this.updateJobStatus(
        jobId,
        JobStatus.FAILED,
        JobStage.FAILED,
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  private async retrieveBullets(
    userId: string,
    parsedJd: ParsedJD
  ): Promise<CandidateBullet[]> {
    const allKeywords = [
      ...parsedJd.required_skills,
      ...parsedJd.nice_to_have,
      ...parsedJd.keywords,
    ].map((k) => k.toLowerCase());

    const experiences = await this.prisma.experience.findMany({
      where: { userId },
      include: { bullets: true },
    });

    const candidates: CandidateBullet[] = [];

    for (const exp of experiences) {
      for (const bullet of exp.bullets) {
        const bulletText = bullet.content.toLowerCase();
        const bulletKeywords = [
          ...bullet.tags.map((t) => t.toLowerCase()),
          ...bullet.tech.map((t) => t.toLowerCase()),
        ];

        let score = 0;

        // Score based on keyword matches
        for (const keyword of allKeywords) {
          if (
            bulletText.includes(keyword) ||
            bulletKeywords.some((bk) => bk.includes(keyword))
          ) {
            score += parsedJd.required_skills.some(
              (s) => s.toLowerCase() === keyword
            )
              ? 2
              : 1;
          }
        }

        if (score > 0) {
          candidates.push({
            id: bullet.id,
            content: bullet.content,
            tags: bullet.tags,
            tech: bullet.tech,
            experienceId: exp.id,
            score,
          });
        }
      }
    }

    // Return top 30 candidates sorted by score
    return candidates.sort((a, b) => b.score - a.score).slice(0, 30);
  }

  private selectBullets(
    candidates: CandidateBullet[],
    parsedJd: ParsedJD
  ): CandidateBullet[] {
    const selected: CandidateBullet[] = [];
    const usedExperiences = new Set<string>();
    const coveredSkills = new Set<string>();

    const requiredSkills = parsedJd.required_skills.map((s) => s.toLowerCase());

    // First pass: select bullets that cover required skills
    for (const candidate of candidates) {
      if (selected.length >= 16) break;

      const bulletText = candidate.content.toLowerCase();
      const bulletKeywords = [...candidate.tags, ...candidate.tech].map((k) =>
        k.toLowerCase()
      );

      // Check if this bullet covers any uncovered required skills
      let coversNew = false;
      for (const skill of requiredSkills) {
        if (!coveredSkills.has(skill)) {
          if (
            bulletText.includes(skill) ||
            bulletKeywords.some((k) => k.includes(skill))
          ) {
            coveredSkills.add(skill);
            coversNew = true;
          }
        }
      }

      // Limit bullets per experience to avoid repetition
      const experienceCount = selected.filter(
        (b) => b.experienceId === candidate.experienceId
      ).length;

      if (coversNew || experienceCount < 4) {
        selected.push(candidate);
      }
    }

    // Ensure minimum of 12 bullets
    for (const candidate of candidates) {
      if (selected.length >= 12) break;
      if (!selected.find((s) => s.id === candidate.id)) {
        selected.push(candidate);
      }
    }

    return selected.slice(0, 16);
  }

  private async rewriteBullets(
    bullets: CandidateBullet[],
    parsedJd: ParsedJD
  ): Promise<Map<string, any>> {
    const rewritten = new Map();

    for (const bullet of bullets) {
      try {
        const result = await this.openai.rewriteBullet(bullet, parsedJd);
        rewritten.set(bullet.id, result);
      } catch (error) {
        console.error(`Failed to rewrite bullet ${bullet.id}:`, error);
        // Fallback to original
        rewritten.set(bullet.id, {
          bulletId: bullet.id,
          rewrittenText: bullet.content,
          evidenceBulletIds: [bullet.id],
          riskFlags: ["rewrite_failed"],
        });
      }
    }

    return rewritten;
  }

  private verifyBullets(
    originalBullets: CandidateBullet[],
    rewrittenMap: Map<string, any>
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
        (n) => !originalNumbers.includes(n)
      );
      if (newNumbers.length > 0) {
        issues.push(`New numbers added: ${newNumbers.join(", ")}`);
      }

      // Check for new tech (simple keyword check)
      const originalTech = [...original.tech, ...original.tags].map((t) =>
        t.toLowerCase()
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
          !originalTech.includes(tech)
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

  private async assembleResume(
    userId: string,
    selectedBullets: CandidateBullet[],
    verifiedBullets: Map<string, any>,
    parsedJd: ParsedJD
  ): Promise<ResumeJson> {
    // Get user data
    const [experiences, education, projects, skills] = await Promise.all([
      this.prisma.experience.findMany({
        where: { userId },
        orderBy: { startDate: "desc" },
      }),
      this.prisma.education.findMany({ where: { userId } }),
      this.prisma.project.findMany({ where: { userId } }),
      this.prisma.skill.findMany({ where: { userId } }),
    ]);

    // Group bullets by experience
    const bulletsByExp = new Map<string, string[]>();
    for (const bullet of selectedBullets) {
      const verified = verifiedBullets.get(bullet.id);
      if (verified) {
        if (!bulletsByExp.has(bullet.experienceId)) {
          bulletsByExp.set(bullet.experienceId, []);
        }
        bulletsByExp.get(bullet.experienceId)!.push(verified.text);
      }
    }

    // Build experience sections
    const experienceSections = experiences
      .filter((exp) => bulletsByExp.has(exp.id))
      .map((exp) => ({
        company: exp.company,
        title: exp.title,
        startDate: exp.startDate,
        endDate: exp.endDate,
        bullets: bulletsByExp.get(exp.id) || [],
      }));

    // Collect skills
    const allSkills = new Set<string>();
    skills.forEach((s) => allSkills.add(s.name));
    parsedJd.required_skills.forEach((s) => {
      if (
        skills.some((skill) => skill.name.toLowerCase() === s.toLowerCase())
      ) {
        allSkills.add(s);
      }
    });

    return {
      skills: Array.from(allSkills),
      experiences: experienceSections,
      projects: projects.map((p) => ({
        name: p.name,
        description: p.description,
        tech: p.tech,
        bullets: [],
      })),
      education: education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        graduationDate: e.graduationDate,
      })),
    };
  }

  private async saveResults(
    jobId: string,
    resume: ResumeJson,
    selectedBullets: CandidateBullet[],
    verifiedBullets: Map<string, any>
  ): Promise<void> {
    // Save resume
    await this.prisma.resumeJob.update({
      where: { id: jobId },
      data: {
        resultResume: resume as any,
        completedAt: new Date(),
      },
    });

    // Save bullet mappings
    for (const bullet of selectedBullets) {
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
    }
  }

  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    stage: string,
    progress: number,
    errorMessage?: string
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
