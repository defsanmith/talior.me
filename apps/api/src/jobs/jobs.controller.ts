import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  CreateJobDto,
  CreateJobResponse,
  EditableResume,
  GetJobResponse,
  GetJobsResponse,
  UpdateResumeDto,
} from "@tailor.me/shared";
import { JobsService } from "./jobs.service";

@Controller("api/jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  async createJob(
    @Body() createJobDto: CreateJobDto
  ): Promise<CreateJobResponse> {
    const activeCount = await this.jobsService.getActiveJobCount();
    if (activeCount >= 10) {
      throw new HttpException(
        "Maximum of 10 concurrent jobs allowed. Please wait for some jobs to complete.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const jobId = await this.jobsService.createJob(createJobDto.jobDescription);
    return { jobId };
  }

  @Get()
  async getJobs(): Promise<GetJobsResponse> {
    const jobs = await this.jobsService.getAllJobs();
    return { jobs };
  }

  @Get(":jobId")
  async getJob(@Param("jobId") jobId: string): Promise<GetJobResponse> {
    const job = await this.jobsService.getJobById(jobId);
    if (!job) {
      throw new HttpException("Job not found", HttpStatus.NOT_FOUND);
    }

    const bullets = await this.jobsService.getJobBullets(jobId);
    return {
      job,
      bullets: bullets as any,
      result: job.resultResume as any,
    };
  }

  @Patch(":jobId/resume")
  async updateJobResume(
    @Param("jobId") jobId: string,
    @Body() updateResumeDto: UpdateResumeDto
  ): Promise<{ resume: EditableResume }> {
    const resume = await this.jobsService.updateJobResume(
      jobId,
      updateResumeDto
    );
    return { resume };
  }

  @Get(":jobId/resume")
  async getJobResume(
    @Param("jobId") jobId: string
  ): Promise<{ resume: EditableResume | null }> {
    const resume = await this.jobsService.getJobResume(jobId);
    return { resume };
  }
}
