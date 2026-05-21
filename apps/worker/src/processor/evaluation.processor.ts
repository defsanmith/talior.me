import { Injectable, Logger } from "@nestjs/common";
import {
  JobStage,
  JobStatus,
  ParsedJD,
  ProfileEvaluation,
} from "@tailor.me/shared";
import { Job, Queue } from "bullmq";
import { AIService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProfileFetcher } from "./profile-fetcher";

interface JobData {
  jobId: string;
  userId: string;
  jobDescription: string;
  strategy?: string;
  phase?: "evaluate" | "generate";
}

@Injectable()
export class EvaluationProcessor {
  private readonly logger = new Logger(EvaluationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AIService,
    private readonly profileFetcher: ProfileFetcher,
  ) {}

  async processEvaluation(job: Job<JobData>): Promise<void> {
    const { jobId, userId, jobDescription } = job.data;

    try {
      const jobRecord = await this.prisma.resumeJob.findUnique({
        where: { id: jobId },
        select: {
          parsedJd: true,
          companyId: true,
          positionId: true,
          teamId: true,
        },
      });

      // Step 1: Parse JD (skip if already parsed — re-evaluation case)
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
            where: { userId_name: { userId, name: parsedJd.companyName } },
            create: { userId, name: parsedJd.companyName },
            update: {},
          });
          companyId = company.id;
        }

        if (!positionId && parsedJd.jobPosition) {
          const position = await this.prisma.position.upsert({
            where: { userId_title: { userId, title: parsedJd.jobPosition } },
            create: { userId, title: parsedJd.jobPosition },
            update: {},
          });
          positionId = position.id;
        }

        if (!teamId && parsedJd.teamName) {
          const team = await this.prisma.team.upsert({
            where: { userId_name: { userId, name: parsedJd.teamName } },
            create: { userId, name: parsedJd.teamName },
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

      // Step 2: Fetch profile
      await this.updateJobStatus(
        jobId,
        JobStatus.PROCESSING,
        JobStage.EVALUATING_FIT,
        30,
      );
      await job.updateProgress({
        progress: 30,
        stage: JobStage.EVALUATING_FIT,
        userId,
      });

      const profileData = await this.profileFetcher.fetchFullProfile(userId);

      // Step 3: Evaluate fit
      await job.updateProgress({
        progress: 50,
        stage: JobStage.EVALUATING_FIT,
        userId,
      });

      const evaluation = await this.ai.evaluateProfileFit(
        profileData,
        parsedJd,
        jobDescription,
      );

      // Step 4: Apply user's threshold and compute autoGenerate + recommendation
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { autoGenerateThreshold: true },
      });
      const threshold = user?.autoGenerateThreshold ?? 4.0;
      const score = evaluation.overallScore;

      evaluation.autoGenerate = score >= threshold;
      if (score >= threshold) {
        evaluation.recommendation = "strong-fit";
      } else if (score >= threshold - 1) {
        evaluation.recommendation = "moderate-fit";
      } else {
        evaluation.recommendation = "weak-fit";
      }

      // Step 5: Save evaluation
      await this.prisma.resumeJob.update({
        where: { id: jobId },
        data: {
          evaluation: evaluation as any,
          evaluatedAt: new Date(),
          status: JobStatus.EVALUATED,
          stage: JobStage.EVALUATING_FIT,
          progress: 100,
        },
      });

      this.logger.log(
        `Evaluation complete for job ${jobId}: score=${score}, autoGenerate=${evaluation.autoGenerate}`,
      );

      // Step 6: Decision — auto-generate or wait for user
      if (evaluation.autoGenerate) {
        const connection = {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379"),
        };
        const queue = new Queue("resume-build", { connection });
        await queue.add(
          "process-resume",
          {
            jobId,
            userId,
            jobDescription,
            strategy: job.data.strategy,
            phase: "generate",
          },
          { jobId: `${jobId}-generate` },
        );
        await queue.close();
      }

      await job.updateProgress({
        progress: 100,
        stage: evaluation.autoGenerate
          ? "Generating resume"
          : "Evaluation complete",
        status: JobStatus.EVALUATED,
        userId,
        evaluation: {
          overallScore: evaluation.overallScore,
          recommendation: evaluation.recommendation,
          autoGenerate: evaluation.autoGenerate,
        },
      } as any);
    } catch (error) {
      this.logger.error(
        `Evaluation failed for job ${jobId}:`,
        error instanceof Error ? error.message : error,
      );
      await this.updateJobStatus(
        jobId,
        JobStatus.FAILED,
        JobStage.FAILED,
        0,
        error instanceof Error ? error.message : "Evaluation failed",
      );
      throw error;
    }
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
