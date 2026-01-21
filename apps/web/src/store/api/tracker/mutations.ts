import {
  ApiResponse,
  ApplyAndGetNextResponse,
  Company,
  CreateCompanyDto,
  CreatePositionDto,
  CreateTeamDto,
  Position,
  Team,
  UpdateJobDetailsDto,
  UpdateJobStatusDto,
} from "@tailor.me/shared";
import { appApi } from "..";

// Response types
interface GetJobsResponse {
  jobs: any[]; // Replace with proper ResumeJob type if available
  total: number;
  page: number;
  limit: number;
}

// Update mutation args
interface UpdateJobStatusArgs {
  id: string;
  data: UpdateJobStatusDto;
}

interface UpdateJobDetailsArgs {
  id: string;
  data: UpdateJobDetailsDto;
}

export const trackerApi = appApi.injectEndpoints({
  endpoints: (build) => ({
    createCompany: build.mutation<ApiResponse<Company>, CreateCompanyDto>({
      query: (data) => ({
        url: `/tracker/companies`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Companies"],
    }),

    deleteCompany: build.mutation<ApiResponse<Company>, string>({
      query: (id) => ({
        url: `/tracker/companies/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Companies"],
    }),

    createPosition: build.mutation<ApiResponse<Position>, CreatePositionDto>({
      query: (data) => ({
        url: `/tracker/positions`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Positions"],
    }),

    deletePosition: build.mutation<ApiResponse<Position>, string>({
      query: (id) => ({
        url: `/tracker/positions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Positions"],
    }),

    createTeam: build.mutation<ApiResponse<Team>, CreateTeamDto>({
      query: (data) => ({
        url: `/tracker/teams`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Teams"],
    }),

    deleteTeam: build.mutation<ApiResponse<Team>, string>({
      query: (id) => ({
        url: `/tracker/teams/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teams"],
    }),

    updateJobStatus: build.mutation<ApiResponse<any>, UpdateJobStatusArgs>({
      query: ({ id, data }) => ({
        url: `/tracker/jobs/${id}/status`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Jobs"],
      // Optimistic update for better UX
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        // We'll implement optimistic updates if needed
        try {
          await queryFulfilled;
        } catch {
          // Handle error
        }
      },
    }),

    updateJobDetails: build.mutation<ApiResponse<any>, UpdateJobDetailsArgs>({
      query: ({ id, data }) => ({
        url: `/tracker/jobs/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Jobs"],
    }),

    applyAndGetNext: build.mutation<
      ApiResponse<ApplyAndGetNextResponse>,
      string
    >({
      query: (id) => ({
        url: `/tracker/jobs/${id}/apply-and-next`,
        method: "POST",
      }),
      invalidatesTags: ["Jobs"],
    }),
  }),
});

export const {
  useCreateCompanyMutation,
  useDeleteCompanyMutation,
  useCreatePositionMutation,
  useDeletePositionMutation,
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useUpdateJobStatusMutation,
  useUpdateJobDetailsMutation,
  useApplyAndGetNextMutation,
} = trackerApi;
