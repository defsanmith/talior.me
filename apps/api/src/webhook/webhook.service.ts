import { BadRequestException, Injectable } from "@nestjs/common";
import {
  EditableResume,
  EditableResumeSchema,
  JobStage,
  JobStatus,
} from "@tailor.me/shared";
import { format, parse, parseISO, isValid } from "date-fns";
import { PrismaService } from "../prisma/prisma.service";
import { SubmitResumeDto } from "./dto/submit-resume.dto";

function normalizeDate(dateStr: string | null | undefined): string | null | undefined {
  if (!dateStr) return dateStr;

  const FORMAT = "MMM yyyy";

  // YYYY-MM or YYYY-MM-DD — use parseISO to avoid timezone shifts
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(dateStr)) {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, FORMAT) : dateStr;
  }

  // Try common written formats
  const candidates = ["MMM yyyy", "MMMM yyyy", "MM/yyyy", "yyyy"];
  for (const fmt of candidates) {
    const d = parse(dateStr, fmt, new Date());
    if (isValid(d)) return format(d, FORMAT);
  }

  return dateStr;
}

function normalizeDates(resume: EditableResume): EditableResume {
  return {
    ...resume,
    experiences: resume.experiences.map((exp) => ({
      ...exp,
      startDate: normalizeDate(exp.startDate) ?? exp.startDate,
      endDate: normalizeDate(exp.endDate) ?? null,
    })),
    education: resume.education.map((edu) => ({
      ...edu,
      graduationDate: normalizeDate(edu.graduationDate) ?? null,
    })),
    projects: resume.projects.map((proj) => ({
      ...proj,
      date: normalizeDate(proj.date) ?? null,
    })),
    certifications: resume.certifications.map((cert) => ({
      ...cert,
      issueDate: normalizeDate(cert.issueDate) ?? null,
      expirationDate: normalizeDate(cert.expirationDate) ?? null,
    })),
  };
}

@Injectable()
export class WebhookService {
  constructor(private readonly prisma: PrismaService) {}

  async submitResume(
    dto: SubmitResumeDto,
    userId: string,
  ): Promise<{ jobId: string }> {
    const parsed = EditableResumeSchema.safeParse(dto.resultResume);
    if (!parsed.success) {
      throw new BadRequestException(
        `Invalid resume structure: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { trackingEnabled: true },
    });

    let companyId: string | null = null;
    let positionId: string | null = null;
    let teamId: string | null = null;

    if (dto.companyName) {
      const company = await this.prisma.company.upsert({
        where: { userId_name: { userId, name: dto.companyName } },
        create: { userId, name: dto.companyName },
        update: {},
      });
      companyId = company.id;
    }

    if (dto.jobPosition) {
      const position = await this.prisma.position.upsert({
        where: { userId_title: { userId, title: dto.jobPosition } },
        create: { userId, title: dto.jobPosition },
        update: {},
      });
      positionId = position.id;
    }

    if (dto.teamName) {
      const team = await this.prisma.team.upsert({
        where: { userId_name: { userId, name: dto.teamName } },
        create: { userId, name: dto.teamName },
        update: {},
      });
      teamId = team.id;
    }

    const job = await this.prisma.resumeJob.create({
      data: {
        userId,
        jobDescription: dto.jobDescription,
        strategy: dto.strategy ?? "openai",
        companyId,
        positionId,
        teamId,
        status: JobStatus.COMPLETED,
        stage: JobStage.COMPLETED,
        progress: 100,
        completedAt: new Date(),
        resultResume: normalizeDates(parsed.data),
        trackingEnabled: user?.trackingEnabled ?? false,
        notes: dto.notes ?? null,
        priority: dto.priority ?? 0,
        salaryRange: dto.salaryRange ?? null,
        applicationUrl: dto.applicationUrl ?? null,
      },
    });

    return { jobId: job.id };
  }
}
