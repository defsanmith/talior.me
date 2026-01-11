import { z } from "zod";
import {
  EditableResumeSchema,
  ResumeEducationSchema,
  ResumeExperienceSchema,
  ResumeSkillCategorySchema,
  ResumeProjectSchema,
  ResumeBulletSchema,
  ResumeCourseworkSchema,
  ResumeSkillItemSchema,
  SectionOrderSchema,
} from "./types";

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

// ============================================
// Resume Builder DTOs
// ============================================

// Update the entire editable resume
export const UpdateResumeDtoSchema = EditableResumeSchema.partial();
export type UpdateResumeDto = z.infer<typeof UpdateResumeDtoSchema>;

// Section types enum
export const SectionTypeSchema = z.enum([
  "education",
  "experience",
  "skills",
  "projects",
]);
export type SectionType = z.infer<typeof SectionTypeSchema>;

// Update section order
export const UpdateSectionOrderDtoSchema = z.object({
  sectionOrder: z.array(SectionOrderSchema),
});
export type UpdateSectionOrderDto = z.infer<typeof UpdateSectionOrderDtoSchema>;

// Education item DTOs
export const CreateEducationItemDtoSchema = ResumeEducationSchema.omit({
  id: true,
  order: true,
});
export type CreateEducationItemDto = z.infer<
  typeof CreateEducationItemDtoSchema
>;

export const UpdateEducationItemDtoSchema = ResumeEducationSchema.partial();
export type UpdateEducationItemDto = z.infer<
  typeof UpdateEducationItemDtoSchema
>;

// Experience item DTOs
export const CreateExperienceItemDtoSchema = ResumeExperienceSchema.omit({
  id: true,
  order: true,
});
export type CreateExperienceItemDto = z.infer<
  typeof CreateExperienceItemDtoSchema
>;

export const UpdateExperienceItemDtoSchema = ResumeExperienceSchema.partial();
export type UpdateExperienceItemDto = z.infer<
  typeof UpdateExperienceItemDtoSchema
>;

// Skill category DTOs
export const CreateSkillCategoryDtoSchema = ResumeSkillCategorySchema.omit({
  id: true,
  order: true,
});
export type CreateSkillCategoryDto = z.infer<
  typeof CreateSkillCategoryDtoSchema
>;

export const UpdateSkillCategoryDtoSchema = ResumeSkillCategorySchema.partial();
export type UpdateSkillCategoryDto = z.infer<
  typeof UpdateSkillCategoryDtoSchema
>;

// Project item DTOs
export const CreateProjectItemDtoSchema = ResumeProjectSchema.omit({
  id: true,
  order: true,
});
export type CreateProjectItemDto = z.infer<typeof CreateProjectItemDtoSchema>;

export const UpdateProjectItemDtoSchema = ResumeProjectSchema.partial();
export type UpdateProjectItemDto = z.infer<typeof UpdateProjectItemDtoSchema>;

// Bullet point DTOs
export const CreateBulletItemDtoSchema = ResumeBulletSchema.omit({
  id: true,
  order: true,
});
export type CreateBulletItemDto = z.infer<typeof CreateBulletItemDtoSchema>;

export const UpdateBulletItemDtoSchema = ResumeBulletSchema.partial();
export type UpdateBulletItemDto = z.infer<typeof UpdateBulletItemDtoSchema>;

// Coursework DTOs
export const CreateCourseworkItemDtoSchema = ResumeCourseworkSchema.omit({
  id: true,
});
export type CreateCourseworkItemDto = z.infer<
  typeof CreateCourseworkItemDtoSchema
>;

export const UpdateCourseworkItemDtoSchema = ResumeCourseworkSchema.partial();
export type UpdateCourseworkItemDto = z.infer<
  typeof UpdateCourseworkItemDtoSchema
>;

// Skill item DTOs
export const CreateSkillItemDtoSchema = ResumeSkillItemSchema.omit({ id: true });
export type CreateSkillItemDto = z.infer<typeof CreateSkillItemDtoSchema>;

export const UpdateSkillItemDtoSchema = ResumeSkillItemSchema.partial();
export type UpdateSkillItemDto = z.infer<typeof UpdateSkillItemDtoSchema>;

// Toggle visibility DTO
export const ToggleVisibilityDtoSchema = z.object({
  visible: z.boolean(),
});
export type ToggleVisibilityDto = z.infer<typeof ToggleVisibilityDtoSchema>;

// Reorder items DTO
export const ReorderItemsDtoSchema = z.object({
  itemIds: z.array(z.string()),
});
export type ReorderItemsDto = z.infer<typeof ReorderItemsDtoSchema>;
