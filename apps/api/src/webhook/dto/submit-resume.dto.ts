import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EditableResume } from "@tailor.me/shared";
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class SubmitResumeDto {
  @ApiProperty({
    description: "Raw text of the job description used to tailor the resume.",
    minLength: 10,
    example:
      "Senior Software Engineer at Acme Corp. Design and build distributed systems at scale. Requirements: 5+ years of backend experience, strong knowledge of Go or Rust.",
  })
  @IsString()
  @MinLength(10)
  jobDescription!: string;

  @ApiProperty({
    description:
      "The generated resume as an EditableResume object. Validated against the full schema before saving. Date fields (startDate, endDate, graduationDate, etc.) are normalised to 'Mmm YYYY' format automatically.",
    type: "object",
      properties: {
        user: {
          type: "object",
          description: "Resume header info (name, contact details).",
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            location: { type: "string" },
            openToRelocate: { type: "boolean" },
            website: { type: "string" },
            websiteHref: { type: "string" },
            linkedin: { type: "string" },
          },
        },
        summary: { type: "string", description: "Professional summary paragraph." },
        styleOptions: {
          type: "object",
          properties: {
            fontFamily: { type: "string", enum: ["Computer Modern", "Inter", "Lato", "Merriweather", "EB Garamond"] },
            fontSize: { type: "integer", enum: [10, 11, 12] },
          },
        },
        sectionOrder: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "type", "visible", "order"],
            properties: {
              id: { type: "string" },
              type: { type: "string", enum: ["education", "experience", "skills", "projects", "certifications"] },
              visible: { type: "boolean" },
              order: { type: "integer" },
            },
          },
        },
        education: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "institution", "degree", "graduationDate", "visible", "order"],
            properties: {
              id: { type: "string" },
              institution: { type: "string" },
              degree: { type: "string" },
              location: { type: "string", nullable: true },
              graduationDate: { type: "string", nullable: true, description: "Normalised to 'Mmm YYYY'." },
              coursework: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "name", "visible"],
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    visible: { type: "boolean" },
                  },
                },
              },
              visible: { type: "boolean" },
              order: { type: "integer" },
              relevanceReason: { type: "string" },
            },
          },
        },
        experiences: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "company", "title", "startDate", "endDate", "visible", "order"],
            properties: {
              id: { type: "string" },
              company: { type: "string" },
              title: { type: "string" },
              location: { type: "string", nullable: true },
              startDate: { type: "string", description: "Normalised to 'Mmm YYYY'." },
              endDate: { type: "string", nullable: true, description: "Normalised to 'Mmm YYYY'. Null means current role." },
              bullets: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "text", "visible", "order"],
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                    visible: { type: "boolean" },
                    order: { type: "integer" },
                  },
                },
              },
              visible: { type: "boolean" },
              order: { type: "integer" },
              relevanceReason: { type: "string" },
            },
          },
        },
        skillCategories: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "name", "visible", "order"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              skills: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "name", "visible"],
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    visible: { type: "boolean" },
                  },
                },
              },
              visible: { type: "boolean" },
              order: { type: "integer" },
            },
          },
        },
        projects: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "name", "visible", "order"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              date: { type: "string", nullable: true, description: "Normalised to 'Mmm YYYY'." },
              url: { type: "string", nullable: true },
              tech: { type: "array", items: { type: "string" } },
              bullets: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "text", "visible", "order"],
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                    visible: { type: "boolean" },
                    order: { type: "integer" },
                  },
                },
              },
              visible: { type: "boolean" },
              order: { type: "integer" },
              relevanceReason: { type: "string" },
            },
          },
        },
        certifications: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "title", "issuer", "visible", "order"],
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              issuer: { type: "string" },
              issueDate: { type: "string", nullable: true, description: "Normalised to 'Mmm YYYY'." },
              expirationDate: { type: "string", nullable: true, description: "Normalised to 'Mmm YYYY'." },
              credentialUrl: { type: "string", nullable: true },
              visible: { type: "boolean" },
              order: { type: "integer" },
            },
          },
        },
      },
      example: {
        user: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
        experiences: [
          {
            id: "exp-1",
            company: "Previous Corp",
            title: "Software Engineer",
            startDate: "Jan 2021",
            endDate: "Mar 2024",
            bullets: [{ id: "b-1", text: "Built high-throughput pipelines handling 1M events/day", visible: true, order: 0 }],
            visible: true,
            order: 0,
          },
        ],
        skillCategories: [{ id: "sk-1", name: "Languages", skills: [{ id: "s-1", name: "Go", visible: true }], visible: true, order: 0 }],
        education: [],
        projects: [],
        certifications: [],
        sectionOrder: [{ id: "experience", type: "experience", visible: true, order: 0 }],
      },
  })
  @IsObject()
  resultResume!: EditableResume;

  @ApiPropertyOptional({
    description:
      "Company name. A Company record is upserted per user, so the same name always maps to one record.",
    example: "Acme Corp",
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: "Job title / position name.",
    example: "Senior Software Engineer",
  })
  @IsOptional()
  @IsString()
  jobPosition?: string;

  @ApiPropertyOptional({
    description: "Team or department name.",
    example: "Platform",
  })
  @IsOptional()
  @IsString()
  teamName?: string;

  @ApiPropertyOptional({
    description:
      "Strategy label used to generate the resume. Stored for reference only — no reprocessing is triggered.",
    enum: ["openai", "bm25"],
    default: "openai",
  })
  @IsOptional()
  @IsIn(["openai", "bm25"])
  strategy?: string;

  @ApiPropertyOptional({
    description: "Free-text notes about this application.",
    example: "Applied via referral from John",
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: "Priority score for this application (0 = lowest, 10 = highest).",
    minimum: 0,
    maximum: 10,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({
    description: "Expected or listed salary range.",
    example: "$180k–$220k",
  })
  @IsOptional()
  @IsString()
  salaryRange?: string;

  @ApiPropertyOptional({
    description: "Direct link to the job posting or application form.",
    example: "https://jobs.acme.com/swe-12345",
  })
  @IsOptional()
  @IsUrl()
  applicationUrl?: string;
}
