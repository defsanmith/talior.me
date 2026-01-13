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

// ============================================
// Resume Builder Types (with visibility & ordering)
// ============================================

// Coursework item for education
export const ResumeCourseworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  visible: z.boolean().default(true),
});

export type ResumeCoursework = z.infer<typeof ResumeCourseworkSchema>;

// Bullet point with visibility and ordering
export const ResumeBulletSchema = z.object({
  id: z.string(),
  text: z.string(),
  visible: z.boolean().default(true),
  order: z.number(),
});

export type ResumeBullet = z.infer<typeof ResumeBulletSchema>;

// Education section with coursework
export const ResumeEducationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  graduationDate: z.string().nullable(),
  coursework: z.array(ResumeCourseworkSchema).default([]),
  visible: z.boolean().default(true),
  order: z.number(),
  relevanceReason: z.string().optional(), // AI explanation for inclusion
});

export type ResumeEducation = z.infer<typeof ResumeEducationSchema>;

// Experience section with bullet points
export const ResumeExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  bullets: z.array(ResumeBulletSchema).default([]),
  visible: z.boolean().default(true),
  order: z.number(),
  relevanceReason: z.string().optional(), // AI explanation for inclusion
});

export type ResumeExperience = z.infer<typeof ResumeExperienceSchema>;

// Individual skill within a category
export const ResumeSkillItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  visible: z.boolean().default(true),
});

export type ResumeSkillItem = z.infer<typeof ResumeSkillItemSchema>;

// Skill category grouping skills
export const ResumeSkillCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  skills: z.array(ResumeSkillItemSchema).default([]),
  visible: z.boolean().default(true),
  order: z.number(),
});

export type ResumeSkillCategory = z.infer<typeof ResumeSkillCategorySchema>;

// Project section with bullets
export const ResumeProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tech: z.array(z.string()).default([]),
  bullets: z.array(ResumeBulletSchema).default([]),
  visible: z.boolean().default(true),
  order: z.number(),
  relevanceReason: z.string().optional(), // AI explanation for inclusion
});

export type ResumeProject = z.infer<typeof ResumeProjectSchema>;

// Section order configuration
export const SectionOrderSchema = z.object({
  id: z.string(),
  type: z.enum(["education", "experience", "skills", "projects"]),
  visible: z.boolean().default(true),
  order: z.number(),
});

export type SectionOrder = z.infer<typeof SectionOrderSchema>;

// Editable Resume JSON (full resume with visibility/ordering)
export const EditableResumeSchema = z.object({
  summary: z.string().optional(),
  sectionOrder: z.array(SectionOrderSchema).default([
    { id: "education", type: "education", visible: true, order: 0 },
    { id: "experience", type: "experience", visible: true, order: 1 },
    { id: "skills", type: "skills", visible: true, order: 2 },
    { id: "projects", type: "projects", visible: true, order: 3 },
  ]),
  education: z.array(ResumeEducationSchema).default([]),
  experiences: z.array(ResumeExperienceSchema).default([]),
  skillCategories: z.array(ResumeSkillCategorySchema).default([]),
  projects: z.array(ResumeProjectSchema).default([]),
});

export type EditableResume = z.infer<typeof EditableResumeSchema>;

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

export interface Bullet {
  id: string;
  resumeJobId: string;
  bulletId: string;
  selected: boolean;
  rewrittenText: string | null;
  evidenceBulletIds: string[];
  riskFlags: string[];
  createdAt: Date;
  bullet: any;
}

export interface GetJobsResponse {
  jobs: Array<JobResponse>;
}

export interface GetJobResponse {
  job: JobResponse;
  bullets: Array<Bullet>;
  result: EditableResume | ResumeJson | null;
}
