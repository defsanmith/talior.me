import { z } from "zod";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export const ParsedJDSchema = z.object({
  required_skills: z.array(z.string()),
  nice_to_have: z.array(z.string()),
  responsibilities: z.array(z.string()),
  keywords: z.array(z.string()),
});

export type ParsedJD = z.infer<typeof ParsedJDSchema>;

export const RewrittenBulletSchema = z.object({
  bulletId: z.string(),
  rewrittenText: z.string(),
  evidenceBulletIds: z.array(z.string()),
  riskFlags: z.array(z.string()),
});

export type RewrittenBullet = z.infer<typeof RewrittenBulletSchema>;

export const ExperienceSectionSchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  bullets: z.array(z.string()),
});

export type ExperienceSection = z.infer<typeof ExperienceSectionSchema>;

export const ProjectSectionSchema = z.object({
  name: z.string(),
  description: z.string(),
  tech: z.array(z.string()),
  bullets: z.array(z.string()),
});

export type ProjectSection = z.infer<typeof ProjectSectionSchema>;

export const ResumeJsonSchema = z.object({
  summary: z.string().optional(),
  skills: z.array(z.string()),
  experiences: z.array(ExperienceSectionSchema),
  projects: z.array(ProjectSectionSchema).optional(),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string(),
        graduationDate: z.string().nullable(),
      })
    )
    .optional(),
});

export type ResumeJson = z.infer<typeof ResumeJsonSchema>;

// API Response Types for Jobs endpoints
export interface CreateJobResponse {
  jobId: string;
}

export interface JobResponse {
  id: string;
  userId: string;
  jobDescription: string;
  status: string;
  stage: string;
  progress: number;
  resultResume: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetJobsResponse {
  jobs: Array<JobResponse>;
}

export interface GetJobResponse {
  job: JobResponse;
  bullets: Array<{
    id: string;
    resumeJobId: string;
    bulletId: string;
    selected: boolean;
    rewrittenText: string | null;
    evidenceBulletIds: string[];
    riskFlags: string[];
    createdAt: Date;
    bullet: any;
  }>;
  result: any;
}
