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
  experienceId: z.string().optional(),
  projectId: z.string().optional(),
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

// ============================================
// Profile CRUD DTOs
// ============================================

// User DTOs
export const UpdateUserDtoSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;

// Profile Experience DTOs (maps to Prisma Experience model)
export const CreateProfileExperienceDtoSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().nullable().optional(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type CreateProfileExperienceDto = z.infer<typeof CreateProfileExperienceDtoSchema>;

export const UpdateProfileExperienceDtoSchema = CreateProfileExperienceDtoSchema.partial();
export type UpdateProfileExperienceDto = z.infer<typeof UpdateProfileExperienceDtoSchema>;

// Profile Education DTOs (maps to Prisma Education model)
export const CreateProfileEducationDtoSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  location: z.string().nullable().optional(),
  graduationDate: z.string().nullable().optional(),
  coursework: z.array(z.string()).optional(),
});
export type CreateProfileEducationDto = z.infer<typeof CreateProfileEducationDtoSchema>;

export const UpdateProfileEducationDtoSchema = CreateProfileEducationDtoSchema.partial();
export type UpdateProfileEducationDto = z.infer<typeof UpdateProfileEducationDtoSchema>;

// Profile Project DTOs (maps to Prisma Project model)
export const CreateProfileProjectDtoSchema = z.object({
  name: z.string().min(1),
  date: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});
export type CreateProfileProjectDto = z.infer<typeof CreateProfileProjectDtoSchema>;

export const UpdateProfileProjectDtoSchema = CreateProfileProjectDtoSchema.partial();
export type UpdateProfileProjectDto = z.infer<typeof UpdateProfileProjectDtoSchema>;

// Update Project Skills DTO
export const UpdateProjectSkillsDtoSchema = z.object({
  skillIds: z.array(z.string()),
});
export type UpdateProjectSkillsDto = z.infer<typeof UpdateProjectSkillsDtoSchema>;

// Profile Skill Category DTOs (maps to Prisma SkillCategory model)
export const CreateProfileSkillCategoryDtoSchema = z.object({
  name: z.string().min(1),
});
export type CreateProfileSkillCategoryDto = z.infer<typeof CreateProfileSkillCategoryDtoSchema>;

export const UpdateProfileSkillCategoryDtoSchema = CreateProfileSkillCategoryDtoSchema.partial();
export type UpdateProfileSkillCategoryDto = z.infer<typeof UpdateProfileSkillCategoryDtoSchema>;

// Profile Skill DTOs (maps to Prisma Skill model)
export const CreateProfileSkillDtoSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().nullable().optional(),
});
export type CreateProfileSkillDto = z.infer<typeof CreateProfileSkillDtoSchema>;

export const UpdateProfileSkillDtoSchema = CreateProfileSkillDtoSchema.partial();
export type UpdateProfileSkillDto = z.infer<typeof UpdateProfileSkillDtoSchema>;

// Profile Bullet DTOs (maps to Prisma Bullet model)
export const UpdateProfileBulletDtoSchema = z.object({
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
});
export type UpdateProfileBulletDto = z.infer<typeof UpdateProfileBulletDtoSchema>;

// Update Bullet Skills DTO
export const UpdateBulletSkillsDtoSchema = z.object({
  skillIds: z.array(z.string()),
});
export type UpdateBulletSkillsDto = z.infer<typeof UpdateBulletSkillsDtoSchema>;

// Profile Response Types
export interface ProfileUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  location: string | null;
  website: string | null;
  linkedin: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileBulletSkill {
  id: string;
  bulletId: string;
  skillId: string;
  skill: ProfileSkill;
}

export interface ProfileBullet {
  id: string;
  experienceId: string | null;
  projectId: string | null;
  content: string;
  tags: string[];
  skills: ProfileBulletSkill[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileExperience {
  id: string;
  userId: string;
  company: string;
  title: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
  bullets: ProfileBullet[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileEducation {
  id: string;
  userId: string;
  institution: string;
  degree: string;
  location: string | null;
  graduationDate: string | null;
  coursework: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileProjectSkill {
  id: string;
  projectId: string;
  skillId: string;
  skill: ProfileSkill;
}

export interface ProfileProject {
  id: string;
  userId: string;
  name: string;
  date: string | null;
  url: string | null;
  bullets: ProfileBullet[];
  skills: ProfileProjectSkill[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileSkillCategory {
  id: string;
  userId: string;
  name: string;
  skills: ProfileSkill[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileSkill {
  id: string;
  userId: string;
  name: string;
  categoryId: string | null;
  category: ProfileSkillCategory | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetProfileResponse {
  user: ProfileUser | null;
  experiences: ProfileExperience[];
  education: ProfileEducation[];
  projects: ProfileProject[];
  skills: ProfileSkill[];
  skillCategories: ProfileSkillCategory[];
}
