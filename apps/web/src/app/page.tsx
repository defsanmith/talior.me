"use client";

import JobCard from "@/components/job-posts/job-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSocket } from "@/hooks/useSocket";
import Router from "@/lib/router";
import { useAppDispatch } from "@/store";
import {
  jobApi,
  useCreateJobMutation,
  useGetJobsQuery,
} from "@/store/api/jobs/queries";
import { JobStatus } from "@tailor.me/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { data, error, isLoading } = useGetJobsQuery();
  const router = useRouter();
  const socket = useSocket();
  const dispatch = useAppDispatch();
  const [jobDescription, setJobDescription] = useState("");
  const [createJob, { isLoading: isCreating, error: createError }] =
    useCreateJobMutation();

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

  const queuedJobs = jobs.filter((j) => j.status === JobStatus.QUEUED);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createJob({ jobDescription }).unwrap();
      setJobDescription("");
    } catch (err) {
      console.error("Failed to create job:", err);
    }
  };

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
        <div className="mb-8">
          <h1 className="mb-8">Resume Dashboard</h1>

          {/* Create Resume Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create Resume</CardTitle>
              <CardDescription>
                Paste the job description to get started
                {queuedJobs.length > 0 && (
                  <span className="ml-2 font-semibold text-blue-600">
                    • {queuedJobs.length}{" "}
                    {queuedJobs.length === 1 ? "job" : "jobs"} queued
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="jd">Job Description</Label>
                  <Textarea
                    id="jd"
                    value={jobDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setJobDescription(e.target.value)
                    }
                    className="h-48 resize-none"
                    placeholder="Paste the full job description here..."
                    required
                    minLength={10}
                  />
                </div>

                {createError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {"data" in createError &&
                      typeof createError.data === "object" &&
                      createError.data &&
                      "message" in createError.data
                        ? String(createError.data.message)
                        : "Failed to create job"}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isCreating || activeJobs.length >= 10}
                  className="w-full"
                >
                  {isCreating ? "Creating..." : "Build Resume"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {activeJobs.length >= 10 && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
            ⚠️ Maximum of 10 concurrent jobs reached. Please wait for some jobs
            to complete.
          </div>
        )}

        {/* Resume List */}
        {jobs.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">Your Resumes</h2>
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
            No jobs yet. Create your first resume above!
          </div>
        )}
      </div>
    </div>
  );
}
