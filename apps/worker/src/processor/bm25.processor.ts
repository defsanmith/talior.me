import { Injectable, Logger } from "@nestjs/common";
import { EditableResume, JobStage, JobStatus } from "@tailor.me/shared";
import { Job } from "bullmq";
import { BulletSelector } from "../bm25/bullet-selector";
import type { BulletCandidate } from "../bm25/types";
import { KeywordExtractor } from "../bm25/keyword-extractor";
import { PrismaService } from "../prisma/prisma.service";
import type { ProfileData } from "../ai/ai-provider.interface";
import type { BulletSearchHit } from "../search/search.service";
import { SearchService } from "../search/search.service";

export interface JobData {
  jobId: string;
  userId: string;
  jobDescription: string;
  strategy?: string;
}

@Injectable()
export class BM25Processor {
  private readonly logger = new Logger(BM25Processor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
  ) {}

  async processBM25Job(job: Job<JobData>): Promise<void> {
    const { jobId, userId, jobDescription } = job.data;

    try {
      await this.updateProgress(job, jobId, userId, JobStatus.PROCESSING, JobStage.PARSING_JD, 10);

      const { keywords, skills, techStack } = KeywordExtractor.extract(jobDescription);
      const searchTerms = [...keywords, ...skills, ...techStack];

      await this.updateProgress(job, jobId, userId, JobStatus.PROCESSING, JobStage.RETRIEVING_BULLETS, 20);

      const hits = await this.searchService.queryBullets(userId, searchTerms, [], 50);

      const candidates: BulletCandidate[] = hits.map((h: BulletSearchHit) => ({
        bulletId: h.bulletId,
        content: h.content,
        score: h.score,
        parentId: h.parentId,
        parentType: h.parentType,
        startDate: h.startDate,
        endDate: h.endDate,
      }));

      await this.updateProgress(job, jobId, userId, JobStatus.PROCESSING, JobStage.SELECTING_BULLETS, 50);

      const selected = BulletSelector.select(candidates, {
        maxBulletsPerParent: 4,
        similarityThreshold: 0.7,
        targetCount: { min: 12, max: 16 },
      });

      await this.updateProgress(job, jobId, userId, JobStatus.PROCESSING, JobStage.ASSEMBLING, 85);

      const profile = await this.fetchProfile(userId);
      const resume = this.assembleResume(profile, selected);

      await this.saveResults(jobId, resume, selected);
      await this.updateProgress(job, jobId, userId, JobStatus.COMPLETED, JobStage.COMPLETED, 100);
    } catch (error) {
      this.logger.error(`BM25 job ${jobId} failed:`, error);
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

  private async updateProgress(
    job: Job<JobData>,
    jobId: string,
    userId: string,
    status: JobStatus,
    stage: string,
    progress: number,
  ): Promise<void> {
    await this.updateJobStatus(jobId, status, stage, progress);
    await job.updateProgress({ progress, stage, userId });
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
      data: { status, stage, progress, errorMessage },
    });
  }

  private async fetchProfile(userId: string): Promise<ProfileData> {
    const [user, experiences, projects, education, skillCategories] =
      await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.experience.findMany({
          where: { userId },
          orderBy: { startDate: "desc" },
          include: {
            bullets: {
              include: {
                skills: { include: { skill: true } },
              },
            },
          },
        }),
        this.prisma.project.findMany({
          where: { userId },
          include: {
            bullets: true,
            skills: { include: { skill: true } },
          },
        }),
        this.prisma.education.findMany({
          where: { userId },
        }),
        this.prisma.skillCategory.findMany({
          where: { userId },
          include: { skills: true },
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
        skills: cat.skills.map((s) => ({ id: s.id, name: s.name })),
      })),
    };
  }

  private assembleResume(
    profile: ProfileData,
    selectedBullets: BulletCandidate[],
  ): EditableResume {
    const byParent = new Map<string, BulletCandidate[]>();
    for (const b of selectedBullets) {
      const list = byParent.get(b.parentId) ?? [];
      list.push(b);
      byParent.set(b.parentId, list);
    }

    const experienceIds = selectedBullets
      .filter((b) => b.parentType === "experience")
      .map((b) => b.parentId);
    const projectIds = selectedBullets
      .filter((b) => b.parentType === "project")
      .map((b) => b.parentId);

    const uniqueExpIds = [...new Set(experienceIds)];
    const uniqueProjIds = [...new Set(projectIds)];

    const experiences = uniqueExpIds
      .map((parentId, index) => {
        const exp = profile.experiences.find((e) => e.id === parentId);
        if (!exp) return null;
        const bullets = (byParent.get(parentId) ?? [])
          .sort((a, b) => b.score - a.score)
          .map((b, i) => ({
            id: b.bulletId,
            text: b.content,
            visible: true,
            order: i,
          }));
        return {
          id: exp.id,
          company: exp.company,
          title: exp.title,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          bullets,
          visible: true,
          order: index,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    const projects = uniqueProjIds
      .map((parentId, index) => {
        const proj = profile.projects.find((p) => p.id === parentId);
        if (!proj) return null;
        const bullets = (byParent.get(parentId) ?? [])
          .sort((a, b) => b.score - a.score)
          .map((b, i) => ({
            id: b.bulletId,
            text: b.content,
            visible: true,
            order: i,
          }));
        return {
          id: proj.id,
          name: proj.name,
          date: proj.date,
          url: proj.url,
          tech: proj.skills,
          bullets,
          visible: true,
          order: index,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const education = profile.education.map((edu, index) => ({
      id: edu.id,
      institution: edu.institution,
      degree: edu.degree,
      location: edu.location,
      graduationDate: edu.graduationDate,
      coursework: edu.coursework.map((name, i) => ({
        id: `${edu.id}-cw-${i}`,
        name,
        visible: true,
      })),
      visible: true,
      order: index,
    }));

    const skillCategories = profile.skillCategories.map((cat, index) => ({
      id: cat.id,
      name: cat.name,
      skills: cat.skills.map((s) => ({
        id: s.id,
        name: s.name,
        visible: true,
      })),
      visible: true,
      order: index,
    }));

    return {
      user: profile.user
        ? {
            firstName: profile.user.firstName ?? undefined,
            lastName: profile.user.lastName ?? undefined,
            email: profile.user.email ?? undefined,
            phone: profile.user.phone ?? undefined,
            location: profile.user.location ?? undefined,
            website: profile.user.website ?? undefined,
            linkedin: profile.user.linkedin ?? undefined,
          }
        : undefined,
      sectionOrder: [
        { id: "education", type: "education" as const, visible: true, order: 0 },
        { id: "experience", type: "experience" as const, visible: true, order: 1 },
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
    bullets: BulletCandidate[],
  ): Promise<void> {
    await this.prisma.resumeJob.update({
      where: { id: jobId },
      data: {
        resultResume: resume as any,
        completedAt: new Date(),
      },
    });

    await Promise.all(
      bullets.map((b) =>
        this.prisma.resumeJobBullet.create({
          data: {
            resumeJobId: jobId,
            bulletId: b.bulletId,
            originalText: b.content,
            rewrittenText: b.content,
            evidence: { evidenceBulletIds: [b.bulletId] },
          },
        }),
      ),
    );
  }
}
