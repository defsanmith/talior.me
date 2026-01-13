import {
  ApiResponse,
  EditableResume,
  GetJobResponse,
  GetJobsResponse,
  UpdateResumeDto,
} from "@tailor.me/shared";
import { appApi } from "..";

interface UpdateResumeArgs {
  jobId: string;
  resume: UpdateResumeDto;
}

interface ResumeResponse {
  resume: EditableResume;
}

interface CreateJobArgs {
  jobDescription: string;
}

interface CreateJobResponse {
  jobId: string;
}

export const jobApi = appApi.injectEndpoints({
  endpoints: (build) => ({
    createJob: build.mutation<ApiResponse<CreateJobResponse>, CreateJobArgs>({
      query: (body) => ({
        url: `/jobs`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Jobs"],
    }),
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
    getJobResume: build.query<ApiResponse<ResumeResponse>, string>({
      query: (jobId) => ({
        url: `/jobs/${jobId}/resume`,
        method: "GET",
      }),
      providesTags: (result, error, jobId) => [{ type: "Resume", id: jobId }],
    }),
    updateJobResume: build.mutation<
      ApiResponse<ResumeResponse>,
      UpdateResumeArgs
    >({
      query: ({ jobId, resume }) => ({
        url: `/jobs/${jobId}/resume`,
        method: "PATCH",
        body: resume,
      }),
      invalidatesTags: (result, error, { jobId }) => [
        { type: "Resume", id: jobId },
        { type: "Jobs", id: jobId },
      ],
    }),
    getResumePdf: build.query<Blob, string>({
      query: (jobId) => ({
        url: `/jobs/${jobId}/resume/pdf`,
        method: "GET",
        responseHandler: async (response) => {
          return response.blob();
        },
        cache: "no-cache",
      }),
    }),
  }),
});

export const {
  useCreateJobMutation,
  useGetJobsQuery,
  useGetJobByIdQuery,
  useGetJobResumeQuery,
  useUpdateJobResumeMutation,
  useLazyGetResumePdfQuery,
} = jobApi;
