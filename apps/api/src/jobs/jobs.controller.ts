import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
} from "@nestjs/common";
import {
  CreateJobDto,
  CreateJobResponse,
  EditableResume,
  GetJobResponse,
  GetJobsResponse,
  UpdateJobMetadataDto,
  UpdateResumeDto,
} from "@tailor.me/shared";
import { CurrentUser, JwtPayload } from "../auth/decorators/current-user.decorator";
import { PdfService } from "../pdf/pdf.service";
import { JobsService } from "./jobs.service";

@Controller("api/jobs")
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly pdfService: PdfService
  ) {}

  @Post()
  async createJob(
    @Body() createJobDto: CreateJobDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CreateJobResponse> {
    const activeCount = await this.jobsService.getActiveJobCount(user.userId);
    if (activeCount >= 10) {
      throw new HttpException(
        "Maximum of 10 concurrent jobs allowed. Please wait for some jobs to complete.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const jobId = await this.jobsService.createJob(createJobDto.jobDescription, user.userId);
    return { jobId };
  }

  @Get()
  async getJobs(@CurrentUser() user: JwtPayload): Promise<GetJobsResponse> {
    const rawJobs = await this.jobsService.getAllJobs(user.userId);
    const jobs = rawJobs.map((job) => {
      let parsedJd: any = job.parsedJd;
      try {
        if (typeof parsedJd === "string") {
          parsedJd = parsedJd ? JSON.parse(parsedJd) : null;
        }
      } catch {
        parsedJd = null;
      }
      return {
        ...job,
        parsedJd,
      };
    });
    return { jobs };
  }

  @Get(":jobId")
  async getJob(
    @Param("jobId") jobId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<GetJobResponse> {
    const job = await this.jobsService.getJobById(jobId, user.userId);
    if (!job) {
      throw new HttpException("Job not found", HttpStatus.NOT_FOUND);
    }

    const bullets = await this.jobsService.getJobBullets(jobId);

    // Ensure parsedJd is an object or null (not a raw JSON string) to satisfy JobResponse type
    let parsedJd: any = job.parsedJd;
    try {
      if (typeof parsedJd === "string") {
        parsedJd = parsedJd ? JSON.parse(parsedJd) : null;
      }
    } catch {
      parsedJd = null;
    }

    const jobResponse = {
      ...job,
      parsedJd,
    };

    return {
      job: jobResponse as any,
      bullets: bullets as any,
      result: job.resultResume as any,
    };
  }

  @Patch(":jobId/resume")
  async updateJobResume(
    @Param("jobId") jobId: string,
    @Body() updateResumeDto: UpdateResumeDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ resume: EditableResume }> {
    const resume = await this.jobsService.updateJobResume(
      jobId,
      updateResumeDto,
      user.userId
    );
    return { resume };
  }

  @Get(":jobId/resume")
  async getJobResume(
    @Param("jobId") jobId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ resume: EditableResume | null }> {
    const resume = await this.jobsService.getJobResume(jobId, user.userId);
    return { resume };
  }

  @Patch(":jobId/metadata")
  async updateJobMetadata(
    @Param("jobId") jobId: string,
    @Body() updateMetadataDto: UpdateJobMetadataDto,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    const job = await this.jobsService.updateJobMetadata(
      jobId,
      updateMetadataDto,
      user.userId
    );
    return { job };
  }

  @Get(":jobId/resume/pdf")
  async getResumePdf(
    @Param("jobId") jobId: string,
    @Query("download") download: string,
    @CurrentUser() user: JwtPayload
  ): Promise<StreamableFile> {
    const resume = await this.jobsService.getJobResume(jobId, user.userId);
    if (!resume) {
      throw new HttpException("Resume not found", HttpStatus.NOT_FOUND);
    }

    const pdfBuffer = await this.pdfService.generatePdf(resume);

    // Generate sanitized filename from user's firstName and lastName
    const sanitize = (str: string | undefined) => {
      if (!str) return "";
      return str.replace(/[^a-zA-Z0-9-]/g, "_");
    };

    const firstName = sanitize(resume.user?.firstName || "");
    const lastName = sanitize(resume.user?.lastName || "");

    // Generate filename from firstName and lastName
    let filename = "resume.pdf";
    if (firstName && lastName) {
      filename = `${firstName}_${lastName}_Resume.pdf`;
    } else if (firstName) {
      filename = `${firstName}_Resume.pdf`;
    } else if (lastName) {
      filename = `${lastName}_Resume.pdf`;
    }

    // Use StreamableFile options to set headers
    const disposition =
      download === "true"
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`;

    return new StreamableFile(pdfBuffer, {
      type: "application/pdf",
      disposition,
      length: pdfBuffer.length,
    });
  }
}
