import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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
    example: {
      experiences: [
        {
          id: "exp-1",
          company: "Previous Corp",
          title: "Software Engineer",
          startDate: "2021-01",
          endDate: "2024-03",
          bullets: [
            {
              id: "b-1",
              text: "Built high-throughput pipelines handling 1M events/day",
              visible: true,
              order: 0,
            },
          ],
          visible: true,
          order: 0,
        },
      ],
      skillCategories: [],
      education: [],
      projects: [],
      certifications: [],
      sectionOrder: [
        { id: "experience", type: "experience", visible: true, order: 0 },
      ],
    },
  })
  @IsObject()
  resultResume!: Record<string, unknown>;

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
