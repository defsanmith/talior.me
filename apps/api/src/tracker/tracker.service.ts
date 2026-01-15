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

  async getUser() {
    return this.prisma.user.findFirst();
  }

  // ============================================
  // Company endpoints
  // ============================================

  async getCompanies() {
    const user = await this.getUser();
    if (!user) return [];

    return this.prisma.company.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });
  }

  async createCompany(dto: CreateCompanyDto) {
    const user = await this.getUser();
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.company.create({
      data: {
        userId: user.id,
        name: dto.name,
      },
    });
  }

  async deleteCompany(id: string) {
    const user = await this.getUser();
    if (!user) throw new NotFoundException("User not found");

    const company = await this.prisma.company.findFirst({
      where: { id, userId: user.id },
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

  async getPositions() {
    const user = await this.getUser();
    if (!user) return [];

    return this.prisma.position.findMany({
      where: { userId: user.id },
      orderBy: { title: "asc" },
    });
  }

  async createPosition(dto: CreatePositionDto) {
    const user = await this.getUser();
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.position.create({
      data: {
        userId: user.id,
        title: dto.title,
      },
    });
  }

  async deletePosition(id: string) {
    const user = await this.getUser();
    if (!user) throw new NotFoundException("User not found");

    const position = await this.prisma.position.findFirst({
      where: { id, userId: user.id },
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

  async getTeams() {
    const user = await this.getUser();
    if (!user) return [];

    return this.prisma.team.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });
  }

  async createTeam(dto: CreateTeamDto) {
    const user = await this.getUser();
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.team.create({
      data: {
        userId: user.id,
        name: dto.name,
      },
    });
  }

  async deleteTeam(id: string) {
    const user = await this.getUser();
    if (!user) throw new NotFoundException("User not found");

    const team = await this.prisma.team.findFirst({
      where: { id, userId: user.id },
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

  async getJobs(query: GetJobsQueryDto) {
    const user = await this.getUser();
    if (!user) return { jobs: [], total: 0 };

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

    // Build where clause
    const where: any = {
      userId: user.id,
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
    const skip = (page - 1) * limit;

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
      take: limit,
    });

    return { jobs, total, page, limit };
  }

  async updateJobStatus(id: string, dto: UpdateJobStatusDto) {
    const user = await this.getUser();
    if (!user) throw new NotFoundException("User not found");

    const job = await this.prisma.resumeJob.findFirst({
      where: { id, userId: user.id },
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

  async updateJobDetails(id: string, dto: UpdateJobDetailsDto) {
    const user = await this.getUser();
    if (!user) throw new NotFoundException("User not found");

    const job = await this.prisma.resumeJob.findFirst({
      where: { id, userId: user.id },
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
