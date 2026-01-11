import { ApiResponse, GetJobsResponse } from "@tailor.me/shared";
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
  }),
});

export const { useGetJobsQuery } = jobApi;
