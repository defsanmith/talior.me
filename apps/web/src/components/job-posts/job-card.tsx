import { JobResponse, JobStatus } from "@tailor.me/shared";
import { Badge } from "../ui/badge";
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
}: {
  job: JobResponse;
  onClick: () => void;
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

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg">
              {job.companyName && job.jobPosition
                ? `${job.jobPosition} at ${job.companyName}`
                : job.companyName ||
                  job.jobPosition ||
                  new Date(job.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
            </CardTitle>
            {job.teamName && (
              <div className="text-sm text-muted-foreground">
                {job.teamName}
              </div>
            )}
            <CardDescription className="line-clamp-2">
              {job.jobDescription.slice(0, 150)}...
            </CardDescription>
          </div>
          <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
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
