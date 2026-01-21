import {
  Body,
  Controller,
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
    const rawJobs = await this.jobsService.getAllJobs();
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
  async getJob(@Param("jobId") jobId: string): Promise<GetJobResponse> {
    const job = await this.jobsService.getJobById(jobId);
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

  @Patch(":jobId/metadata")
  async updateJobMetadata(
    @Param("jobId") jobId: string,
    @Body() updateMetadataDto: UpdateJobMetadataDto
  ): Promise<any> {
    const job = await this.jobsService.updateJobMetadata(
      jobId,
      updateMetadataDto
    );
    return { job };
  }

  @Get(":jobId/resume/pdf")
  async getResumePdf(
    @Param("jobId") jobId: string,
    @Query("download") download: string
  ): Promise<StreamableFile> {
    const resume = await this.jobsService.getJobResume(jobId);
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
