import { ApplicationStatus, JobResponse, JobStatus } from "@tailor.me/shared";
import { Archive } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Progress } from "../ui/progress";

export default function JobCard({
  job,
  onClick,
  showApplicationStatus = false,
  showGenerationStatus = false,
  onArchive,
}: {
  job: JobResponse;
  onClick: () => void;
  showApplicationStatus?: boolean;
  showGenerationStatus?: boolean;
  onArchive?: (jobId: string) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case JobStatus.COMPLETED:
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case JobStatus.PROCESSING:
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case JobStatus.QUEUED:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case JobStatus.FAILED:
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case ApplicationStatus.READY_TO_APPLY:
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case ApplicationStatus.APPLIED:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case ApplicationStatus.INTERVIEWING:
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case ApplicationStatus.ACCEPTED:
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case ApplicationStatus.NOT_MOVING_FORWARD:
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case ApplicationStatus.ARCHIVED:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getApplicationStatusLabel = (status: string) => {
    switch (status) {
      case ApplicationStatus.READY_TO_APPLY:
        return "Ready to Apply";
      case ApplicationStatus.APPLIED:
        return "Applied";
      case ApplicationStatus.INTERVIEWING:
        return "Interviewing";
      case ApplicationStatus.ACCEPTED:
        return "Accepted";
      case ApplicationStatus.NOT_MOVING_FORWARD:
        return "Not Moving Forward";
      case ApplicationStatus.ARCHIVED:
        return "Archived";
      default:
        return status;
    }
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onArchive) {
      onArchive(job.id);
    }
  };

  return (
    <Card
      className="group cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader>
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg">
              {job.company?.name && job.position?.title
                ? `${job.position.title} at ${job.company.name}`
                : job.company?.name || job.position?.title
                  ? job.company?.name || job.position?.title
                  : new Date(job.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
            </CardTitle>
            {job.team?.name && (
              <div className="text-sm text-muted-foreground">
                {job.team.name}
              </div>
            )}
            <CardDescription className="line-clamp-2">
              {job.jobDescription.slice(0, 150)}...
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {job.strategy && (
              <Badge variant="outline" className="text-xs">
                {job.strategy === "bm25" ? "Fast" : "AI"}
              </Badge>
            )}
            {showApplicationStatus && job.applicationStatus ? (
              <Badge
                className={getApplicationStatusColor(job.applicationStatus)}
              >
                {getApplicationStatusLabel(job.applicationStatus)}
              </Badge>
            ) : showGenerationStatus && job.status ? (
              <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
            ) : null}
            {onArchive &&
              job.applicationStatus !== ApplicationStatus.ARCHIVED && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-0 top-0 hidden h-8 w-8 shrink-0 p-0 group-hover:flex"
                  onClick={handleArchive}
                  title="Archive"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              )}
          </div>
        </div>
      </CardHeader>

      {job.progress < 100 && (
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stage: {job.stage}</span>
              <span className="font-medium">{job.progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary">
              <Progress value={job.progress} />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
