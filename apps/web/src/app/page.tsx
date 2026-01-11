"use client";

import JobCard from "@/components/job-posts/job-card";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/useSocket";
import Router from "@/lib/router";
import { useAppDispatch } from "@/store";
import { jobApi, useGetJobsQuery } from "@/store/api/jobs/queries";
import { JobStatus } from "@tailor.me/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ResumeJob {
  id: string;
  jobDescription: string;
  status: string;
  stage: string;
  progress: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export default function DashboardPage() {
  const { data, error, isLoading } = useGetJobsQuery();
  const router = useRouter();
  const socket = useSocket();
  const dispatch = useAppDispatch();

  const jobs = data?.data?.jobs || [];

  useEffect(() => {
    if (!socket) return;

    socket.on("job.progress", ({ jobId, progress, stage }: any) => {
      // Manually update RTK Query cache
      dispatch(
        jobApi.util.updateQueryData("getJobs", undefined, (draft) => {
          const job = draft?.data?.jobs.find((j) => j.id === jobId);
          if (job) {
            job.progress = progress;
            job.stage = stage;
          }
        }),
      );
    });

    socket.on("job.completed", () => {
      // Invalidate and refetch to get final state
      dispatch(jobApi.util.invalidateTags(["Jobs"]));
    });

    socket.on("job.failed", ({ jobId }: any) => {
      // Manually update RTK Query cache
      dispatch(
        jobApi.util.updateQueryData("getJobs", undefined, (draft) => {
          const job = draft?.data?.jobs.find((j) => j.id === jobId);
          if (job) {
            job.status = JobStatus.FAILED;
          }
        }),
      );
    });

    return () => {
      socket.off("job.progress");
      socket.off("job.completed");
      socket.off("job.failed");
    };
  }, [socket, dispatch]);

  const activeJobs = jobs.filter(
    (j) => j.status === JobStatus.QUEUED || j.status === JobStatus.PROCESSING,
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-red-600">Error loading jobs</div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <div className="mb-8 flex items-center justify-between">
          <h1>Resume Dashboard</h1>
          <Button onClick={() => router.push(Router.CREATE)}>New Job</Button>
        </div>

        {activeJobs.length >= 10 && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
            ⚠️ Maximum of 10 concurrent jobs reached. Please wait for some jobs
            to complete.
          </div>
        )}

        {/* Active Jobs */}
        {jobs.length > 0 && (
          <div className="mb-8">
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onClick={() => router.push(Router.jobDetails(job.id))}
                />
              ))}
            </div>
          </div>
        )}

        {jobs.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            No jobs yet. Create your first resume!
          </div>
        )}
      </div>
    </div>
  );
}
