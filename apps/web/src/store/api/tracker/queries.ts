import {
  ApiResponse,
  Company,
  GetJobsQueryDto,
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
    // Companies
    getCompanies: build.query<ApiResponse<Company[]>, void>({
      query: () => ({
        url: `/tracker/companies`,
        method: "GET",
      }),
      providesTags: ["Companies"],
    }),

    // Positions
    getPositions: build.query<ApiResponse<Position[]>, void>({
      query: () => ({
        url: `/tracker/positions`,
        method: "GET",
      }),
      providesTags: ["Positions"],
    }),

    // Teams
    getTeams: build.query<ApiResponse<Team[]>, void>({
      query: () => ({
        url: `/tracker/teams`,
        method: "GET",
      }),
      providesTags: ["Teams"],
    }),

    // Jobs
    getTrackerJobs: build.query<ApiResponse<GetJobsResponse>, GetJobsQueryDto>({
      query: (params) => ({
        url: `/tracker/jobs`,
        method: "GET",
        params,
      }),
      providesTags: ["Jobs"],
    }),
  }),
});

export const {
  useGetCompaniesQuery,
  useGetPositionsQuery,
  useGetTeamsQuery,
  useGetTrackerJobsQuery,
} = trackerApi;
