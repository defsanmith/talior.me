import {
  ApiResponse,
  GetJobResponse,
  GetJobsResponse,
} from "@tailor.me/shared";
import { appApi } from "..";

export const jobApi = appApi.injectEndpoints({
  endpoints: (build) => ({
    getJobs: build.query<ApiResponse<GetJobsResponse>, void>({
      query: () => ({
        url: `/jobs`,
        method: "GET",
      }),
      providesTags: ["Jobs"],
    }),
    getJobById: build.query<ApiResponse<GetJobResponse>, string>({
      query: (jobId) => ({
        url: `/jobs/${jobId}`,
        method: "GET",
      }),
      providesTags: (result, error, jobId) => [{ type: "Jobs", id: jobId }],
    }),
  }),
});

export const { useGetJobsQuery, useGetJobByIdQuery } = jobApi;
