import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  CreateCompanyDto,
  CreatePositionDto,
  CreateTeamDto,
  GetJobsQueryDto,
  UpdateJobDetailsDto,
  UpdateJobStatusDto,
} from "@tailor.me/shared";
import { CurrentUser, JwtPayload } from "../auth/decorators/current-user.decorator";
import { TrackerService } from "./tracker.service";

@Controller("api/tracker")
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

  // ============================================
  // Company endpoints
  // ============================================

  @Get("companies")
  async getCompanies(@CurrentUser() user: JwtPayload) {
    return this.trackerService.getCompanies(user.userId);
  }

  @Post("companies")
  async createCompany(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.trackerService.createCompany(dto, user.userId);
  }

  @Delete("companies/:id")
  async deleteCompany(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.trackerService.deleteCompany(id, user.userId);
  }

  // ============================================
  // Position endpoints
  // ============================================

  @Get("positions")
  async getPositions(@CurrentUser() user: JwtPayload) {
    return this.trackerService.getPositions(user.userId);
  }

  @Post("positions")
  async createPosition(
    @Body() dto: CreatePositionDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.trackerService.createPosition(dto, user.userId);
  }

  @Delete("positions/:id")
  async deletePosition(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.trackerService.deletePosition(id, user.userId);
  }

  // ============================================
  // Team endpoints
  // ============================================

  @Get("teams")
  async getTeams(@CurrentUser() user: JwtPayload) {
    return this.trackerService.getTeams(user.userId);
  }

  @Post("teams")
  async createTeam(
    @Body() dto: CreateTeamDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.trackerService.createTeam(dto, user.userId);
  }

  @Delete("teams/:id")
  async deleteTeam(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.trackerService.deleteTeam(id, user.userId);
  }

  // ============================================
  // Job tracking endpoints
  // ============================================

  @Get("jobs")
  async getJobs(
    @Query() query: GetJobsQueryDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.trackerService.getJobs(query, user.userId);
  }

  @Patch("jobs/:id/status")
  async updateJobStatus(
    @Param("id") id: string,
    @Body() dto: UpdateJobStatusDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.trackerService.updateJobStatus(id, dto, user.userId);
  }

  @Post("jobs/:id/apply-and-next")
  async applyAndGetNext(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.trackerService.applyAndGetNext(id, user.userId);
  }

  @Patch("jobs/:id")
  async updateJobDetails(
    @Param("id") id: string,
    @Body() dto: UpdateJobDetailsDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.trackerService.updateJobDetails(id, dto, user.userId);
  }
}
