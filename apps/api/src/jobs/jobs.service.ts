import { Injectable, NotFoundException } from "@nestjs/common";
import {
  EditableResume,
  JobStatus,
  UpdateJobMetadataDto,
  UpdateResumeDto,
} from "@tailor.me/shared";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";

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
      include: {
        company: true,
        position: true,
        team: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getJobById(jobId: string) {
    return this.prisma.resumeJob.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        position: true,
        team: true,
      },
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
      include: {
        company: true,
        position: true,
        team: true,
      },
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
      include: {
        user: true,
        company: true,
        position: true,
        team: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with id ${jobId} not found`);
    }

    const resume = job.resultResume as EditableResume | null;

    // If no resume yet, return null
    if (!resume) {
      return null;
    }

    // Always include fresh user data for PDF generation
    return {
      ...resume,
      user: {
        firstName: job.user.firstName || undefined,
        lastName: job.user.lastName || undefined,
        email: job.user.email || undefined,
        phone: job.user.phone || undefined,
        location: job.user.location || undefined,
        website: job.user.website || undefined,
        linkedin: job.user.linkedin || undefined,
      },
    };
  }

  async updateJobMetadata(
    jobId: string,
    updateDto: UpdateJobMetadataDto
  ): Promise<any> {
    // Get current user
    const job = await this.prisma.resumeJob.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        position: true,
        team: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with id ${jobId} not found`);
    }

    const userId = job.userId;

    // Handle company upsert
    let companyId = job.companyId;
    if (updateDto.companyName !== undefined) {
      if (updateDto.companyName) {
        const company = await this.prisma.company.upsert({
          where: {
            userId_name: {
              userId,
              name: updateDto.companyName,
            },
          },
          create: {
            userId,
            name: updateDto.companyName,
          },
          update: {},
        });
        companyId = company.id;
      } else {
        companyId = null;
      }
    }

    // Handle position upsert
    let positionId = job.positionId;
    if (updateDto.positionTitle !== undefined) {
      if (updateDto.positionTitle) {
        const position = await this.prisma.position.upsert({
          where: {
            userId_title: {
              userId,
              title: updateDto.positionTitle,
            },
          },
          create: {
            userId,
            title: updateDto.positionTitle,
          },
          update: {},
        });
        positionId = position.id;
      } else {
        positionId = null;
      }
    }

    // Handle team upsert
    let teamId = job.teamId;
    if (updateDto.teamName !== undefined) {
      if (updateDto.teamName) {
        const team = await this.prisma.team.upsert({
          where: {
            userId_name: {
              userId,
              name: updateDto.teamName,
            },
          },
          create: {
            userId,
            name: updateDto.teamName,
          },
          update: {},
        });
        teamId = team.id;
      } else {
        teamId = null;
      }
    }

    // Update the job with new relations
    const updatedJob = await this.prisma.resumeJob.update({
      where: { id: jobId },
      data: {
        companyId,
        positionId,
        teamId,
      },
      include: {
        company: true,
        position: true,
        team: true,
      },
    });

    return updatedJob;
  }
}
