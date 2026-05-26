import { formatApplicationDate } from "@/lib/application-date";
import { cn } from "@/lib/utils";
import { ApplicationStatus, JobResponse, JobStatus } from "@tailor.me/shared";
import { Archive, FileCheck2 } from "lucide-react";
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
  showApplicationDate = true,
  onArchive,
}: {
  job: JobResponse;
  onClick: () => void;
  showApplicationStatus?: boolean;
  showGenerationStatus?: boolean;
  showApplicationDate?: boolean;
  onArchive?: (jobId: string) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case JobStatus.COMPLETED:
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case JobStatus.EVALUATED:
        return "bg-orange-100 text-orange-800 hover:bg-orange-100";
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

  const getEvaluationScoreColor = (score: number) => {
    if (score >= 4) return "text-emerald-700 bg-emerald-100 hover:bg-emerald-100";
    if (score >= 3) return "text-yellow-700 bg-yellow-100 hover:bg-yellow-100";
    return "text-red-700 bg-red-100 hover:bg-red-100";
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

  const showProgress = job.progress < 100;

  return (
    <Card
      className="group relative cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="relative flex items-start">
          <div className="min-w-0 flex-1 space-y-1.5">
            <CardTitle className="line-clamp-2 text-sm font-semibold leading-tight">
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
              <CardDescription className="text-xs">
                {job.team.name}
              </CardDescription>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {job.resultResume != null && (
                <Badge className="gap-1 bg-emerald-100 text-xs font-medium text-emerald-800 hover:bg-emerald-100">
                  <FileCheck2 className="h-3 w-3" />
                  Resume
                </Badge>
              )}
              {(job as any).evaluation?.overallScore != null && (
                <Badge
                  className={cn(
                    "text-xs font-semibold",
                    getEvaluationScoreColor(
                      (job as any).evaluation.overallScore,
                    ),
                  )}
                >
                  {(job as any).evaluation.overallScore.toFixed(1)}/5
                </Badge>
              )}
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
                <Badge className={getStatusColor(job.status)}>
                  {job.status === JobStatus.EVALUATED ? "Review" : job.status}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        {onArchive && job.applicationStatus !== ApplicationStatus.ARCHIVED && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 hidden h-7 w-7 p-0 group-hover:flex"
            onClick={handleArchive}
            title="Archive"
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-2 pb-3 text-gray-600">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {job.jobDescription}
        </p>

        {(showProgress || job.applicationDate) && (
          <>
            {showProgress && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{job.stage}</span>
                  <span className="font-medium">{job.progress}%</span>
                </div>
                <Progress value={job.progress} className="h-1.5" />
              </div>
            )}
            {showApplicationDate && job.applicationDate && (
              <div className="text-xs text-muted-foreground">
                Applied{" "}
                <span className="font-semibold text-foreground">
                  {formatApplicationDate(job.applicationDate)}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
