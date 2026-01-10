"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { JobStatus } from "@tailor.me/shared";

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
  const [jobs, setJobs] = useState<ResumeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const socket = useSocket();

  const fetchJobs = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/jobs");
      const data = await res.json();
      setJobs(data.jobs);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("job.progress", ({ jobId, progress, stage }: any) => {
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, progress, stage } : job
        )
      );
    });

    socket.on("job.completed", ({ jobId }: any) => {
      fetchJobs(); // Refresh to get final state
    });

    socket.on("job.failed", ({ jobId, error }: any) => {
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? { ...job, status: JobStatus.FAILED, errorMessage: error }
            : job
        )
      );
    });

    return () => {
      socket.off("job.progress");
      socket.off("job.completed");
      socket.off("job.failed");
    };
  }, [socket]);

  const activeJobs = jobs.filter(
    (j) => j.status === JobStatus.QUEUED || j.status === JobStatus.PROCESSING
  );
  const completedJobs = jobs.filter((j) => j.status === JobStatus.COMPLETED);
  const failedJobs = jobs.filter((j) => j.status === JobStatus.FAILED);

  const getStatusColor = (status: string) => {
    switch (status) {
      case JobStatus.COMPLETED:
        return "bg-green-100 text-green-800";
      case JobStatus.PROCESSING:
        return "bg-blue-100 text-blue-800";
      case JobStatus.QUEUED:
        return "bg-yellow-100 text-yellow-800";
      case JobStatus.FAILED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Resume Dashboard</h1>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            New Resume
          </button>
        </div>

        {activeJobs.length >= 10 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
            ⚠️ Maximum of 10 concurrent jobs reached. Please wait for some jobs
            to complete.
          </div>
        )}

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Active Jobs ({activeJobs.length}/10)
            </h2>
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Jobs */}
        {completedJobs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Completed
            </h2>
            <div className="space-y-4">
              {completedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Failed Jobs */}
        {failedJobs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Failed</h2>
            <div className="space-y-4">
              {failedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {jobs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No jobs yet. Create your first resume!
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({ job, onClick }: { job: ResumeJob; onClick: () => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case JobStatus.COMPLETED:
        return "bg-green-100 text-green-800";
      case JobStatus.PROCESSING:
        return "bg-blue-100 text-blue-800";
      case JobStatus.QUEUED:
        return "bg-yellow-100 text-yellow-800";
      case JobStatus.FAILED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-2">
            {new Date(job.createdAt).toLocaleString()}
          </p>
          <p className="text-gray-700 line-clamp-2">
            {job.jobDescription.slice(0, 150)}...
          </p>
        </div>
        <span
          className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
            job.status
          )}`}
        >
          {job.status}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{job.stage}</span>
          <span className="font-semibold">{job.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>

      {job.errorMessage && (
        <div className="mt-4 text-sm text-red-600">
          Error: {job.errorMessage}
        </div>
      )}
    </div>
  );
}
