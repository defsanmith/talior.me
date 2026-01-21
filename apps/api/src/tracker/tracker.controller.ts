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
import { TrackerService } from "./tracker.service";

@Controller("api/tracker")
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

  // ============================================
  // Company endpoints
  // ============================================

  @Get("companies")
  async getCompanies() {
    return this.trackerService.getCompanies();
  }

  @Post("companies")
  async createCompany(@Body() dto: CreateCompanyDto) {
    return this.trackerService.createCompany(dto);
  }

  @Delete("companies/:id")
  async deleteCompany(@Param("id") id: string) {
    return this.trackerService.deleteCompany(id);
  }

  // ============================================
  // Position endpoints
  // ============================================

  @Get("positions")
  async getPositions() {
    return this.trackerService.getPositions();
  }

  @Post("positions")
  async createPosition(@Body() dto: CreatePositionDto) {
    return this.trackerService.createPosition(dto);
  }

  @Delete("positions/:id")
  async deletePosition(@Param("id") id: string) {
    return this.trackerService.deletePosition(id);
  }

  // ============================================
  // Team endpoints
  // ============================================

  @Get("teams")
  async getTeams() {
    return this.trackerService.getTeams();
  }

  @Post("teams")
  async createTeam(@Body() dto: CreateTeamDto) {
    return this.trackerService.createTeam(dto);
  }

  @Delete("teams/:id")
  async deleteTeam(@Param("id") id: string) {
    return this.trackerService.deleteTeam(id);
  }

  // ============================================
  // Job tracking endpoints
  // ============================================

  @Get("jobs")
  async getJobs(@Query() query: GetJobsQueryDto) {
    return this.trackerService.getJobs(query);
  }

  @Patch("jobs/:id/status")
  async updateJobStatus(
    @Param("id") id: string,
    @Body() dto: UpdateJobStatusDto
  ) {
    return this.trackerService.updateJobStatus(id, dto);
  }

  @Post("jobs/:id/apply-and-next")
  async applyAndGetNext(@Param("id") id: string) {
    return this.trackerService.applyAndGetNext(id);
  }

  @Patch("jobs/:id")
  async updateJobDetails(
    @Param("id") id: string,
    @Body() dto: UpdateJobDetailsDto
  ) {
    return this.trackerService.updateJobDetails(id, dto);
  }
}
