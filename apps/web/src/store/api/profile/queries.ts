import {
  ApiResponse,
  CreateBulletDto,
  CreateProfileEducationDto,
  CreateProfileExperienceDto,
  CreateProfileProjectDto,
  CreateProfileSkillCategoryDto,
  CreateProfileSkillDto,
  GetProfileResponse,
  ProfileBullet,
  ProfileEducation,
  ProfileExperience,
  ProfileProject,
  ProfileSkill,
  ProfileSkillCategory,
  ProfileUser,
  UpdateBulletSkillsDto,
  UpdateProfileBulletDto,
  UpdateProfileEducationDto,
  UpdateProfileExperienceDto,
  UpdateProfileProjectDto,
  UpdateProfileSkillCategoryDto,
  UpdateProfileSkillDto,
  UpdateProjectSkillsDto,
  UpdateUserDto,
} from "@tailor.me/shared";
import { appApi } from "..";

// Update mutation args
interface UpdateExperienceArgs {
  id: string;
  data: UpdateProfileExperienceDto;
}

interface UpdateEducationArgs {
  id: string;
  data: UpdateProfileEducationDto;
}

interface UpdateProjectArgs {
  id: string;
  data: UpdateProfileProjectDto;
}

interface UpdateSkillArgs {
  id: string;
  data: UpdateProfileSkillDto;
}

interface UpdateBulletArgs {
  id: string;
  data: UpdateProfileBulletDto;
}

interface UpdateSkillCategoryArgs {
  id: string;
  data: UpdateProfileSkillCategoryDto;
}

interface UpdateBulletSkillsArgs {
  id: string;
  data: UpdateBulletSkillsDto;
}

interface UpdateProjectSkillsArgs {
  id: string;
  data: UpdateProjectSkillsDto;
}

export const profileApi = appApi.injectEndpoints({
  endpoints: (build) => ({
    // Get full profile
    getProfile: build.query<ApiResponse<GetProfileResponse>, void>({
      query: () => ({
        url: `/profile`,
        method: "GET",
      }),
      providesTags: ["Profile"],
    }),

    // User mutations
    updateUser: build.mutation<ApiResponse<ProfileUser>, UpdateUserDto>({
      query: (data) => ({
        url: `/profile/user`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    // Experience mutations
    createExperience: build.mutation<
      ApiResponse<ProfileExperience>,
      CreateProfileExperienceDto
    >({
      query: (data) => ({
        url: `/profile/experiences`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    updateExperience: build.mutation<
      ApiResponse<ProfileExperience>,
      UpdateExperienceArgs
    >({
      query: ({ id, data }) => ({
        url: `/profile/experiences/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    deleteExperience: build.mutation<ApiResponse<{ success: boolean }>, string>(
      {
        query: (id) => ({
          url: `/profile/experiences/${id}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Profile"],
      },
    ),

    // Bullet mutations
    createBullet: build.mutation<ApiResponse<ProfileBullet>, CreateBulletDto>({
      query: (data) => ({
        url: `/profile/bullets`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    updateBullet: build.mutation<ApiResponse<ProfileBullet>, UpdateBulletArgs>({
      query: ({ id, data }) => ({
        url: `/profile/bullets/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    updateBulletSkills: build.mutation<
      ApiResponse<ProfileBullet>,
      UpdateBulletSkillsArgs
    >({
      query: ({ id, data }) => ({
        url: `/profile/bullets/${id}/skills`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    deleteBullet: build.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `/profile/bullets/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profile"],
    }),

    // Education mutations
    createEducation: build.mutation<
      ApiResponse<ProfileEducation>,
      CreateProfileEducationDto
    >({
      query: (data) => ({
        url: `/profile/education`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    updateEducation: build.mutation<
      ApiResponse<ProfileEducation>,
      UpdateEducationArgs
    >({
      query: ({ id, data }) => ({
        url: `/profile/education/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    deleteEducation: build.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `/profile/education/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profile"],
    }),

    // Project mutations
    createProject: build.mutation<
      ApiResponse<ProfileProject>,
      CreateProfileProjectDto
    >({
      query: (data) => ({
        url: `/profile/projects`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    updateProject: build.mutation<
      ApiResponse<ProfileProject>,
      UpdateProjectArgs
    >({
      query: ({ id, data }) => ({
        url: `/profile/projects/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    updateProjectSkills: build.mutation<
      ApiResponse<ProfileProject>,
      UpdateProjectSkillsArgs
    >({
      query: ({ id, data }) => ({
        url: `/profile/projects/${id}/skills`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    deleteProject: build.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `/profile/projects/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profile"],
    }),

    // Skill Category mutations
    createSkillCategory: build.mutation<
      ApiResponse<ProfileSkillCategory>,
      CreateProfileSkillCategoryDto
    >({
      query: (data) => ({
        url: `/profile/skill-categories`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    updateSkillCategory: build.mutation<
      ApiResponse<ProfileSkillCategory>,
      UpdateSkillCategoryArgs
    >({
      query: ({ id, data }) => ({
        url: `/profile/skill-categories/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    deleteSkillCategory: build.mutation<
      ApiResponse<{ success: boolean }>,
      string
    >({
      query: (id) => ({
        url: `/profile/skill-categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profile"],
    }),

    // Skill mutations
    createSkill: build.mutation<
      ApiResponse<ProfileSkill>,
      CreateProfileSkillDto
    >({
      query: (data) => ({
        url: `/profile/skills`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    updateSkill: build.mutation<ApiResponse<ProfileSkill>, UpdateSkillArgs>({
      query: ({ id, data }) => ({
        url: `/profile/skills/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    deleteSkill: build.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `/profile/skills/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profile"],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateUserMutation,
  useCreateExperienceMutation,
  useUpdateExperienceMutation,
  useDeleteExperienceMutation,
  useCreateBulletMutation,
  useUpdateBulletMutation,
  useUpdateBulletSkillsMutation,
  useDeleteBulletMutation,
  useCreateEducationMutation,
  useUpdateEducationMutation,
  useDeleteEducationMutation,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useUpdateProjectSkillsMutation,
  useDeleteProjectMutation,
  useCreateSkillCategoryMutation,
  useUpdateSkillCategoryMutation,
  useDeleteSkillCategoryMutation,
  useCreateSkillMutation,
  useUpdateSkillMutation,
  useDeleteSkillMutation,
} = profileApi;
