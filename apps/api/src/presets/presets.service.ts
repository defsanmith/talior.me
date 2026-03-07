import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreatePresetDto,
  EditableResume,
  FontFamily,
  PreviewPresetDto,
  ResumeStyleOptions,
  SectionOrder,
  UpdatePresetDto,
} from "@tailor.me/shared";
import { PdfService } from "../pdf/pdf.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PresetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  // ============================================
  // CRUD
  // ============================================

  async listPresets(userId: string) {
    return this.prisma.resumePreset.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }

  async createPreset(userId: string, dto: CreatePresetDto) {
    if (dto.isDefault) {
      await this.clearDefaults(userId);
    }
    return this.prisma.resumePreset.create({
      data: {
        userId,
        name: dto.name,
        fontFamily: dto.fontFamily ?? FontFamily.COMPUTER_MODERN,
        fontSize: dto.fontSize ?? 11,
        sectionOrder: (dto.sectionOrder ?? []) as any,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async updatePreset(userId: string, presetId: string, dto: UpdatePresetDto) {
    await this.assertOwner(userId, presetId);
    if (dto.isDefault) {
      await this.clearDefaults(userId);
    }
    return this.prisma.resumePreset.update({
      where: { id: presetId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.fontFamily !== undefined && { fontFamily: dto.fontFamily }),
        ...(dto.fontSize !== undefined && { fontSize: dto.fontSize }),
        ...(dto.sectionOrder !== undefined && {
          sectionOrder: dto.sectionOrder as any,
        }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  async deletePreset(userId: string, presetId: string) {
    await this.assertOwner(userId, presetId);
    return this.prisma.resumePreset.delete({ where: { id: presetId } });
  }

  async setDefault(userId: string, presetId: string) {
    await this.assertOwner(userId, presetId);
    await this.clearDefaults(userId);
    return this.prisma.resumePreset.update({
      where: { id: presetId },
      data: { isDefault: true },
    });
  }

  // ============================================
  // Preview
  // ============================================

  async generatePreview(
    userId: string,
    dto: PreviewPresetDto,
  ): Promise<Buffer> {
    const resume = this.buildDummyResume(dto);
    return this.pdfService.generatePdf(resume);
  }

  // ============================================
  // Helpers used by other services
  // ============================================

  async getDefaultPreset(userId: string) {
    return this.prisma.resumePreset.findFirst({
      where: { userId, isDefault: true },
    });
  }

  // ============================================
  // Private helpers
  // ============================================

  private async assertOwner(userId: string, presetId: string) {
    const preset = await this.prisma.resumePreset.findUnique({
      where: { id: presetId },
    });
    if (!preset) throw new NotFoundException("Preset not found");
    if (preset.userId !== userId) throw new ForbiddenException("Access denied");
    return preset;
  }

  private async clearDefaults(userId: string) {
    await this.prisma.resumePreset.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private buildDummyResume(dto: PreviewPresetDto): EditableResume {
    const sectionOrder: SectionOrder[] =
      dto.sectionOrder && dto.sectionOrder.length > 0
        ? dto.sectionOrder
        : [
            { id: "education", type: "education", visible: true, order: 0 },
            { id: "experience", type: "experience", visible: true, order: 1 },
            { id: "skills", type: "skills", visible: true, order: 2 },
            { id: "projects", type: "projects", visible: true, order: 3 },
            {
              id: "certifications",
              type: "certifications",
              visible: true,
              order: 4,
            },
          ];

    const styleOptions: ResumeStyleOptions = {
      fontFamily: (dto.fontFamily as FontFamily) ?? FontFamily.COMPUTER_MODERN,
      fontSize: dto.fontSize ?? 11,
    };

    return {
      user: {
        firstName: "Alex",
        lastName: "Morgan",
        email: "alex.morgan@email.com",
        phone: "(555)-867-5309",
        location: "San Francisco, CA",
        website: "alexmorgan.dev",
        linkedin: "linkedin.com/in/alexmorgan",
      },
      summary: undefined,
      styleOptions,
      sectionOrder,
      experiences: [
        {
          id: "exp-1",
          company: "Acme Corp",
          title: "Senior Software Engineer",
          location: "San Francisco, CA",
          startDate: "Jan 2022",
          endDate: null,
          visible: true,
          order: 0,
          bullets: [
            {
              id: "b1",
              text: "Led migration of monolithic backend to microservices, reducing p99 latency by 40%",
              visible: true,
              order: 0,
            },
            {
              id: "b2",
              text: "Designed and shipped a real-time event pipeline processing 2M events/day using Kafka and Flink",
              visible: true,
              order: 1,
            },
            {
              id: "b3",
              text: "Mentored 4 junior engineers and established team-wide code review practices",
              visible: true,
              order: 2,
            },
          ],
        },
        {
          id: "exp-2",
          company: "Bright Labs",
          title: "Software Engineer",
          location: "Austin, TX",
          startDate: "Jun 2019",
          endDate: "Dec 2021",
          visible: true,
          order: 1,
          bullets: [
            {
              id: "b4",
              text: "Built a GraphQL API serving 500K daily active users with 99.9% uptime",
              visible: true,
              order: 0,
            },
            {
              id: "b5",
              text: "Reduced CI pipeline runtime from 22 min to 7 min by parallelising test suites",
              visible: true,
              order: 1,
            },
          ],
        },
      ],
      education: [
        {
          id: "edu-1",
          institution: "University of California, Berkeley",
          degree: "B.S. Computer Science",
          location: "Berkeley, CA",
          graduationDate: "May 2019",
          coursework: [
            { id: "cw1", name: "Algorithms", visible: true },
            { id: "cw2", name: "Operating Systems", visible: true },
          ],
          visible: true,
          order: 0,
        },
      ],
      skillCategories: [
        {
          id: "sk-1",
          name: "Languages",
          skills: [
            { id: "s1", name: "TypeScript", visible: true },
            { id: "s2", name: "Python", visible: true },
            { id: "s3", name: "Go", visible: true },
            { id: "s4", name: "Rust", visible: true },
          ],
          visible: true,
          order: 0,
        },
        {
          id: "sk-2",
          name: "Frameworks & Tools",
          skills: [
            { id: "s5", name: "React", visible: true },
            { id: "s6", name: "Node.js", visible: true },
            { id: "s7", name: "Kubernetes", visible: true },
            { id: "s8", name: "PostgreSQL", visible: true },
            { id: "s9", name: "Redis", visible: true },
          ],
          visible: true,
          order: 1,
        },
      ],
      projects: [
        {
          id: "pr-1",
          name: "OpenResume",
          date: "2024",
          url: "github.com/alexmorgan/openresume",
          tech: ["Next.js", "TypeScript", "Postgres"],
          visible: true,
          order: 0,
          bullets: [
            {
              id: "pb1",
              text: "Open-source resume builder with AI-assisted bullet rewriting; 1.2K GitHub stars",
              visible: true,
              order: 0,
            },
            {
              id: "pb2",
              text: "Implemented LaTeX PDF compilation pipeline with sub-second render times",
              visible: true,
              order: 1,
            },
          ],
        },
      ],
      certifications: [
        {
          id: "cert-1",
          title: "AWS Certified Solutions Architect",
          issuer: "Amazon Web Services",
          issueDate: "Mar 2023",
          expirationDate: "Mar 2026",
          credentialUrl: undefined,
          visible: true,
          order: 0,
        },
      ],
    };
  }
}
