import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import {
  JobStatus,
  EditableResume,
  UpdateResumeDto,
} from "@tailor.me/shared";

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

  async updateJobResume(
    jobId: string,
    updateDto: UpdateResumeDto
  ): Promise<EditableResume> {
    const job = await this.prisma.resumeJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job with id ${jobId} not found`);
    }

    // Merge the existing resume with the updates
    const currentResume = (job.resultResume as EditableResume) || {
      summary: "",
      sectionOrder: [
        { id: "education", type: "education", visible: true, order: 0 },
        { id: "experience", type: "experience", visible: true, order: 1 },
        { id: "skills", type: "skills", visible: true, order: 2 },
        { id: "projects", type: "projects", visible: true, order: 3 },
      ],
      education: [],
      experiences: [],
      skillCategories: [],
      projects: [],
    };

    const updatedResume: EditableResume = {
      ...currentResume,
      ...updateDto,
    };

    // Update the job with the new resume
    const updatedJob = await this.prisma.resumeJob.update({
      where: { id: jobId },
      data: {
        resultResume: updatedResume as any,
      },
    });

    return updatedJob.resultResume as EditableResume;
  }

  async getJobResume(jobId: string): Promise<EditableResume | null> {
    const job = await this.prisma.resumeJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job with id ${jobId} not found`);
    }

    return job.resultResume as EditableResume | null;
  }
}
