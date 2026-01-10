import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { JobStatus } from "@tailor.me/shared";

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService
  ) {}

  async createJob(jobDescription: string): Promise<string> {
    // Get demo user
    const user = await this.prisma.user.findFirst();
    if (!user) {
      throw new Error("No user found. Please run seed script.");
    }

    // Create job in database
    const job = await this.prisma.resumeJob.create({
      data: {
        userId: user.id,
        jobDescription,
        status: JobStatus.QUEUED,
        stage: "Queued",
        progress: 0,
      },
    });

    // Add to queue
    await this.queueService.addJob(job.id, {
      jobId: job.id,
      userId: user.id,
      jobDescription,
    });

    return job.id;
  }

  async getActiveJobCount(): Promise<number> {
    return this.prisma.resumeJob.count({
      where: {
        status: {
          in: [JobStatus.QUEUED, JobStatus.PROCESSING],
        },
      },
    });
  }

  async getAllJobs() {
    return this.prisma.resumeJob.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getJobById(jobId: string) {
    return this.prisma.resumeJob.findUnique({
      where: { id: jobId },
    });
  }

  async getJobBullets(jobId: string) {
    return this.prisma.resumeJobBullet.findMany({
      where: { resumeJobId: jobId },
      include: {
        bullet: true,
      },
    });
  }
}
