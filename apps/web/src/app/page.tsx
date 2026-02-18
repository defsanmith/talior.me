"use client";

import { JobFilters } from "@/components/job-tracker/job-filters";
import { KanbanView } from "@/components/job-tracker/kanban-view";
import { ListView } from "@/components/job-tracker/list-view";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSocket } from "@/hooks/useSocket";
import { storage, StorageKeys } from "@/lib/storage";
import { useAppDispatch } from "@/store";
import { jobApi, useCreateJobMutation } from "@/store/api/jobs/queries";
import {
  trackerApi,
  useGetTrackerJobsQuery,
} from "@/store/api/tracker/queries";
import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const socketRef = useSocket();
  const dispatch = useAppDispatch();

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [strategy, setStrategy] = useState<"openai" | "bm25">("openai");
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

  // Only fetch for list view - kanban handles its own fetching per column
  const { data, isLoading } = useGetTrackerJobsQuery(
    {
      status: statusFilter === "all" ? "" : statusFilter,
      companyId: companyFilter,
      positionId: positionFilter,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    },
    {
      skip: view === "kanban", // Skip this query when in kanban view
    },
  );

  const jobs = data?.data?.jobs || [];

  // WebSocket listeners for real-time updates
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("job.progress", ({ jobId, progress, stage }: any) => {
      console.log("Job progress event received", { jobId, progress, stage });
      dispatch(trackerApi.util.invalidateTags(["Jobs"]));
    });

    socket.on("job.completed", () => {
      dispatch(jobApi.util.invalidateTags(["Jobs"]));
      dispatch(trackerApi.util.invalidateTags(["Jobs"]));
    });

    socket.on("job.failed", ({ jobId }: any) => {
      dispatch(trackerApi.util.invalidateTags(["Jobs"]));
    });

    return () => {
      socket.off("job.progress");
      socket.off("job.completed");
      socket.off("job.failed");
    };
  }, [socketRef, dispatch]);

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
      await createJob({ jobDescription, strategy }).unwrap();
      setJobDescription("");
      setStrategy("openai");
      setIsCreateDialogOpen(false);
    } catch (err) {
      console.error("Failed to create job:", err);
    }
  };

  // Show loading only for list view
  if (view === "list" && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div>
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

              <div className="space-y-2">
                <Label>Generation method</Label>
                <div className="flex flex-col gap-2 rounded-md border border-input bg-muted/30 p-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="strategy"
                      value="openai"
                      checked={strategy === "openai"}
                      onChange={() => setStrategy("openai")}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">AI Rewrite (OpenAI)</span>
                    <span className="text-muted-foreground text-sm">
                      Tailored, optimized bullets
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="strategy"
                      value="bm25"
                      checked={strategy === "bm25"}
                      onChange={() => setStrategy("bm25")}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">Fast Match (BM25)</span>
                    <span className="text-muted-foreground text-sm">
                      Quick, no AI cost
                    </span>
                  </label>
                </div>
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

      {/* Views */}
      <Tabs value={view} onValueChange={handleViewChange}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>

          <JobFilters
            statusFilter={statusFilter}
            companyFilter={companyFilter}
            positionFilter={positionFilter}
            sortBy={sortBy}
            onFilterChange={updateFilter}
          />
        </div>

        <TabsContent value="kanban">
          <KanbanView
            companyFilter={companyFilter}
            positionFilter={positionFilter}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </TabsContent>

        <TabsContent value="list">
          <ListView jobs={jobs} />
        </TabsContent>
      </Tabs>

      {/* Empty State - only for list view */}
      {view === "list" && jobs.length === 0 && (
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
