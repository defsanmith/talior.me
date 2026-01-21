"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Router from "@/lib/router";
import { useUpdateJobStatusMutation } from "@/store/api/tracker/mutations";
import { ApplicationStatus } from "@tailor.me/shared";
import { ExternalLink, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import JobCard from "../job-posts/job-card";

interface ListViewProps {
  jobs: any[]; // Replace with proper type
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  [ApplicationStatus.READY_TO_APPLY]: {
    label: "Ready to Apply",
    color: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  [ApplicationStatus.APPLIED]: {
    label: "Applied",
    color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  [ApplicationStatus.INTERVIEWING]: {
    label: "Interviewing",
    color: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  },
  [ApplicationStatus.ACCEPTED]: {
    label: "Accepted",
    color: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  [ApplicationStatus.REJECTED]: {
    label: "Rejected",
    color: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  [ApplicationStatus.NOT_MOVING_FORWARD]: {
    label: "Not Moving Forward",
    color: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
  [ApplicationStatus.ARCHIVED]: {
    label: "Archived",
    color: "bg-slate-100 text-slate-800 hover:bg-slate-100",
  },
};

export function ListView({ jobs }: ListViewProps) {
  const router = useRouter();
  const [updateJobStatus] = useUpdateJobStatusMutation();

  const handleJobClick = (jobId: string) => {
    router.push(Router.jobDetails(jobId));
  };

  const handleArchive = async (jobId: string) => {
    try {
      await updateJobStatus({
        id: jobId,
        data: { applicationStatus: ApplicationStatus.ARCHIVED },
      }).unwrap();
    } catch (error) {
      console.error("Failed to archive job:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mobile: Card view */}
      <div className="space-y-4 md:hidden">
        {jobs.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground">
            No jobs found
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onClick={() => handleJobClick(job.id)}
              showApplicationStatus
              onArchive={handleArchive}
            />
          ))
        )}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block">
        <div className="rounded-lg border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Position
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Application Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Notes
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No jobs found
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    job={job}
                    onClick={() => handleJobClick(job.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface TableRowProps {
  job: any;
  onClick: () => void;
}

function TableRow({ job, onClick }: TableRowProps) {
  const statusConfig =
    STATUS_CONFIG[job.applicationStatus || ApplicationStatus.READY_TO_APPLY];

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="font-medium">{job.company?.name || "-"}</div>
      </td>
      <td className="px-4 py-3">
        <div>{job.position?.title || "-"}</div>
      </td>
      <td className="px-4 py-3">
        <Badge className={statusConfig?.color}>
          {statusConfig?.label || job.applicationStatus}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {formatDate(job.applicationDate)}
      </td>
      <td className="px-4 py-3">
        <div className="max-w-xs truncate text-sm text-muted-foreground">
          {job.notes || "-"}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClick}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Resume
            </DropdownMenuItem>
            {job.applicationUrl && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(job.applicationUrl, "_blank");
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Application Link
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
