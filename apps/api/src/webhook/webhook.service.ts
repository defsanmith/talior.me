import { BadRequestException, Injectable } from "@nestjs/common";
import {
  EditableResumeSchema,
  JobStage,
  JobStatus,
} from "@tailor.me/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SubmitResumeDto } from "./dto/submit-resume.dto";

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
        resultResume: parsed.data,
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
