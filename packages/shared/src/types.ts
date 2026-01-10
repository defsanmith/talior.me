import { z } from "zod";

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
