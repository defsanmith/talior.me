"use client";

import { CompanyCombobox } from "@/components/job-tracker/company-combobox";
import { KanbanView } from "@/components/job-tracker/kanban-view";
import { ListView } from "@/components/job-tracker/list-view";
import { PositionCombobox } from "@/components/job-tracker/position-combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSocket } from "@/hooks/useSocket";
import { storage, StorageKeys } from "@/lib/storage";
import { useAppDispatch } from "@/store";
import { jobApi, useCreateJobMutation } from "@/store/api/jobs/queries";
import { useGetTrackerJobsQuery } from "@/store/api/tracker/queries";
import { ApplicationStatus, JobStatus } from "@tailor.me/shared";
import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const socket = useSocket();
  const dispatch = useAppDispatch();

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [createJob, { isLoading: isCreating, error: createError }] =
    useCreateJobMutation();

  // View preference from localStorage
  const [view, setView] = useState<"kanban" | "list">(() =>
    storage.get(StorageKeys.JOBS_VIEW, "kanban"),
  );

  // Filters from URL
  const statusFilter = searchParams.get("status") || "all";
  const companyFilter = searchParams.get("company") || "";
  const positionFilter = searchParams.get("position") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  // Fetch jobs with filters
  const { data, isLoading } = useGetTrackerJobsQuery({
    status: statusFilter === "all" ? "" : statusFilter,
    companyId: companyFilter,
    positionId: positionFilter,
    sortBy: sortBy as any,
    sortOrder: sortOrder as any,
  });

  const jobs = data?.data?.jobs || [];

  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on("job.progress", ({ jobId, progress, stage }: any) => {
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
      dispatch(jobApi.util.invalidateTags(["Jobs"]));
    });

    socket.on("job.failed", ({ jobId }: any) => {
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

  // Handle view change
  const handleViewChange = (newView: string) => {
    const typedView = newView as "kanban" | "list";
    setView(typedView);
    storage.set(StorageKeys.JOBS_VIEW, typedView);
  };

  // Update URL params
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Handle create resume
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createJob({ jobDescription }).unwrap();
      setJobDescription("");
      setIsCreateDialogOpen(false);
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

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Application Tracker</h1>
          <p className="text-muted-foreground">
            Track your job applications and manage your resumes
          </p>
        </div>

        {/* Create Resume Button */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Resume
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Resume</DialogTitle>
              <DialogDescription>
                Paste the job description to generate a tailored resume
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jd">Job Description</Label>
                <Textarea
                  id="jd"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="h-64 resize-none"
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

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Generate Resume"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => updateFilter("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value={ApplicationStatus.READY_TO_APPLY}>
                    Ready to Apply
                  </SelectItem>
                  <SelectItem value={ApplicationStatus.APPLIED}>
                    Applied
                  </SelectItem>
                  <SelectItem value={ApplicationStatus.INTERVIEWING}>
                    Interviewing
                  </SelectItem>
                  <SelectItem value={ApplicationStatus.ACCEPTED}>
                    Accepted
                  </SelectItem>
                  <SelectItem value={ApplicationStatus.REJECTED}>
                    Rejected
                  </SelectItem>
                  <SelectItem value={ApplicationStatus.NOT_MOVING_FORWARD}>
                    Not Moving Forward
                  </SelectItem>
                  <SelectItem value={ApplicationStatus.ARCHIVED}>
                    Archived
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Company</Label>
              <CompanyCombobox
                value={companyFilter}
                onChange={(value) => updateFilter("company", value || "")}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Position</Label>
              <PositionCombobox
                value={positionFilter}
                onChange={(value) => updateFilter("position", value || "")}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select
                value={sortBy}
                onValueChange={(value) => updateFilter("sortBy", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="applicationDate">
                    Application Date
                  </SelectItem>
                  <SelectItem value="updatedAt">Updated Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Views */}
      <Tabs value={view} onValueChange={handleViewChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <KanbanView jobs={jobs} />
        </TabsContent>

        <TabsContent value="list">
          <ListView jobs={jobs} />
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {jobs.length === 0 && (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <h3 className="mb-2 text-lg font-semibold">No jobs yet</h3>
          <p className="mb-4 text-muted-foreground">
            Get started by creating your first tailored resume
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Resume
          </Button>
        </div>
      )}
    </div>
  );
}
