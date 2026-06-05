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
  @IsString()
  @MinLength(10)
  jobDescription!: string;

  @IsObject()
  resultResume!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  jobPosition?: string;

  @IsOptional()
  @IsString()
  teamName?: string;

  @IsOptional()
  @IsIn(["openai", "bm25"])
  strategy?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsString()
  salaryRange?: string;

  @IsOptional()
  @IsUrl()
  applicationUrl?: string;
}
