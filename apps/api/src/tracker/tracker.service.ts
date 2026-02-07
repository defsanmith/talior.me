import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateCompanyDto,
  CreatePositionDto,
  CreateTeamDto,
  GetJobsQueryDto,
  UpdateJobDetailsDto,
  UpdateJobStatusDto,
} from "@tailor.me/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TrackerService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Company endpoints
  // ============================================

  async getCompanies(userId: string) {
    return this.prisma.company.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
  }

  async createCompany(dto: CreateCompanyDto, userId: string) {
    return this.prisma.company.create({
      data: {
        userId,
        name: dto.name,
      },
    });
  }

  async deleteCompany(id: string, userId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, userId },
    });

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    return this.prisma.company.delete({
      where: { id },
    });
  }

  // ============================================
  // Position endpoints
  // ============================================

  async getPositions(userId: string) {
    return this.prisma.position.findMany({
      where: { userId },
      orderBy: { title: "asc" },
    });
  }

  async createPosition(dto: CreatePositionDto, userId: string) {
    return this.prisma.position.create({
      data: {
        userId,
        title: dto.title,
      },
    });
  }

  async deletePosition(id: string, userId: string) {
    const position = await this.prisma.position.findFirst({
      where: { id, userId },
    });

    if (!position) {
      throw new NotFoundException("Position not found");
    }

    return this.prisma.position.delete({
      where: { id },
    });
  }

  // ============================================
  // Team endpoints
  // ============================================

  async getTeams(userId: string) {
    return this.prisma.team.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
  }

  async createTeam(dto: CreateTeamDto, userId: string) {
    return this.prisma.team.create({
      data: {
        userId,
        name: dto.name,
      },
    });
  }

  async deleteTeam(id: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, userId },
    });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    return this.prisma.team.delete({
      where: { id },
    });
  }

  // ============================================
  // Job tracking endpoints
  // ============================================

  async getJobs(query: GetJobsQueryDto, userId: string) {
    const {
      status,
      companyId,
      positionId,
      teamId,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 50,
    } = query;

    // Convert page and limit to numbers (they come as strings from query params)
    const pageNum = typeof page === "string" ? parseInt(page, 10) : page;
    const limitNum = typeof limit === "string" ? parseInt(limit, 10) : limit;

    // Build where clause
    const where: any = {
      userId,
    };

    if (status) {
      where.applicationStatus = status;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (positionId) {
      where.positionId = positionId;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    // Calculate pagination
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await this.prisma.resumeJob.count({ where });

    // Get jobs with pagination and sorting
    const jobs = await this.prisma.resumeJob.findMany({
      where,
      include: {
        company: true,
        position: true,
        team: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limitNum,
    });

    return { jobs, total, page: pageNum, limit: limitNum };
  }

  async updateJobStatus(id: string, dto: UpdateJobStatusDto, userId: string) {
    const job = await this.prisma.resumeJob.findFirst({
      where: { id, userId },
    });

    if (!job) {
      throw new NotFoundException("Job not found");
    }

    return this.prisma.resumeJob.update({
      where: { id },
      data: {
        applicationStatus: dto.applicationStatus,
      },
      include: {
        company: true,
        position: true,
        team: true,
      },
    });
  }

  async applyAndGetNext(id: string, userId: string) {
    // Verify the job exists and belongs to user
    const job = await this.prisma.resumeJob.findFirst({
      where: { id, userId },
    });

    if (!job) {
      throw new NotFoundException("Job not found");
    }

    // Update current job to APPLIED
    await this.prisma.resumeJob.update({
      where: { id },
      data: {
        applicationStatus: "APPLIED",
        applicationDate: new Date(),
      },
    });

    // Get next pending job (READY_TO_APPLY status)
    const nextJob = await this.prisma.resumeJob.findFirst({
      where: {
        userId,
        applicationStatus: "READY_TO_APPLY",
      },
      include: {
        company: true,
        position: true,
        team: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return { nextJob };
  }

  async updateJobDetails(id: string, dto: UpdateJobDetailsDto, userId: string) {
    const job = await this.prisma.resumeJob.findFirst({
      where: { id, userId },
    });

    if (!job) {
      throw new NotFoundException("Job not found");
    }

    // Convert date strings to Date objects if provided
    const data: any = { ...dto };
    if (dto.applicationDate) {
      data.applicationDate = new Date(dto.applicationDate);
    }
    if (dto.interviewDate) {
      data.interviewDate = new Date(dto.interviewDate);
    }

    return this.prisma.resumeJob.update({
      where: { id },
      data,
      include: {
        company: true,
        position: true,
        team: true,
      },
    });
  }
}
