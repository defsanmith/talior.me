import { z } from "zod";

export const CreateJobDtoSchema = z.object({
  jobDescription: z
    .string()
    .min(10, "Job description must be at least 10 characters"),
});

export type CreateJobDto = z.infer<typeof CreateJobDtoSchema>;

export const CreateBulletDtoSchema = z.object({
  experienceId: z.string(),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  tech: z.array(z.string()).optional(),
});

export type CreateBulletDto = z.infer<typeof CreateBulletDtoSchema>;

export const CreateExperienceDtoSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().nullable(),
  description: z.string().optional(),
});

export type CreateExperienceDto = z.infer<typeof CreateExperienceDtoSchema>;
