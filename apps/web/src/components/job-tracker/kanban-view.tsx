"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Router from "@/lib/router";
import { useUpdateJobStatusMutation } from "@/store/api/tracker/mutations";
import { useGetTrackerJobsQuery } from "@/store/api/tracker/queries";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ApplicationStatus } from "@tailor.me/shared";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import JobCard from "../job-posts/job-card";

interface KanbanViewProps {
  companyFilter?: string;
  positionFilter?: string;
  sortBy?: string;
  sortOrder?: string;
}

const STATUS_COLUMNS = [
  {
    id: ApplicationStatus.READY_TO_APPLY,
    label: "Ready to Apply",
    color: "bg-blue-100 text-blue-800",
  },
  {
    id: ApplicationStatus.APPLIED,
    label: "Applied",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    id: ApplicationStatus.INTERVIEWING,
    label: "Interviewing",
    color: "bg-purple-100 text-purple-800",
  },
  {
    id: ApplicationStatus.ACCEPTED,
    label: "Accepted",
    color: "bg-green-100 text-green-800",
  },
  {
    id: ApplicationStatus.REJECTED,
    label: "Rejected",
    color: "bg-red-100 text-red-800",
  },
  {
    id: ApplicationStatus.NOT_MOVING_FORWARD,
    label: "Not Moving Forward",
    color: "bg-gray-100 text-gray-800",
  },
  {
    id: ApplicationStatus.ARCHIVED,
    label: "Archived",
    color: "bg-slate-100 text-slate-800",
  },
] as const;

export function KanbanView({
  companyFilter,
  positionFilter,
  sortBy = "createdAt",
  sortOrder = "desc",
}: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [updateJobStatus] = useUpdateJobStatusMutation();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    // Active job will be set by the column that owns it
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveJob(null);

    if (!over) return;

    const jobId = active.id as string;
    const newStatus = over.id as string;
    const currentStatus = activeJob?.applicationStatus;

    if (!currentStatus || currentStatus === newStatus) return;

    // Update the job status
    try {
      await updateJobStatus({
        id: jobId,
        data: { applicationStatus: newStatus },
      }).unwrap();
    } catch (error) {
      console.error("Failed to update job status:", error);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveJob(null);
  };

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            companyFilter={companyFilter}
            positionFilter={positionFilter}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onJobClick={handleJobClick}
            onArchive={handleArchive}
            activeId={activeId}
            onSetActiveJob={setActiveJob}
          />
        ))}
      </div>

      <DragOverlay>
        {activeJob ? (
          <div className="rotate-3 opacity-80">
            <JobCard job={activeJob} onClick={() => {}} showApplicationStatus />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  column: (typeof STATUS_COLUMNS)[number];
  companyFilter?: string;
  positionFilter?: string;
  sortBy?: string;
  sortOrder?: string;
  onJobClick: (jobId: string) => void;
  onArchive: (jobId: string) => void;
  activeId: string | null;
  onSetActiveJob: (job: any) => void;
}

const ITEMS_PER_PAGE = 10;

function KanbanColumn({
  column,
  companyFilter,
  positionFilter,
  sortBy = "createdAt",
  sortOrder = "asc",
  onJobClick,
  onArchive,
  activeId,
  onSetActiveJob,
}: KanbanColumnProps) {
  const [page, setPage] = useState(1);
  const [accumulatedJobs, setAccumulatedJobs] = useState<{
    jobs: any[];
    lastPage: number;
    filters: {
      companyFilter?: string;
      positionFilter?: string;
      sortBy?: string;
      sortOrder?: string;
    };
  }>({
    jobs: [],
    lastPage: 0,
    filters: { companyFilter, positionFilter, sortBy, sortOrder },
  });

  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  // Fetch jobs for this column
  const { data, isLoading, isFetching } = useGetTrackerJobsQuery({
    status: column.id,
    companyId: companyFilter,
    positionId: positionFilter,
    sortBy: sortBy as any,
    sortOrder: sortOrder as any,
    page,
    limit: ITEMS_PER_PAGE,
  });

  const newJobs = data?.data?.jobs || [];
  const total = data?.data?.total || 0;
  const currentPage = data?.data?.page || 1;
  const limit = data?.data?.limit || ITEMS_PER_PAGE;
  const hasMore = currentPage * limit < total;
  const isFetchingMore = isFetching && currentPage > 1;

  // Check if filters changed
  const filtersChanged =
    accumulatedJobs.filters.companyFilter !== companyFilter ||
    accumulatedJobs.filters.positionFilter !== positionFilter ||
    accumulatedJobs.filters.sortBy !== sortBy ||
    accumulatedJobs.filters.sortOrder !== sortOrder;

  // Update accumulated jobs when new data arrives
  if (currentPage !== accumulatedJobs.lastPage || filtersChanged) {
    if (filtersChanged || currentPage === 1) {
      // Reset on filter change or page 1
      setAccumulatedJobs({
        jobs: newJobs,
        lastPage: currentPage,
        filters: { companyFilter, positionFilter, sortBy, sortOrder },
      });
      if (filtersChanged && page !== 1) {
        setPage(1);
      }
    } else if (currentPage > 1 && newJobs.length > 0) {
      // Append new jobs, avoiding duplicates
      const existingIds = new Set(accumulatedJobs.jobs.map((j) => j.id));
      const uniqueNewJobs = newJobs.filter((j) => !existingIds.has(j.id));

      if (uniqueNewJobs.length > 0) {
        setAccumulatedJobs({
          jobs: [...accumulatedJobs.jobs, ...uniqueNewJobs],
          lastPage: currentPage,
          filters: { companyFilter, positionFilter, sortBy, sortOrder },
        });
      }
    }
  } else if (
    currentPage === 1 &&
    accumulatedJobs.lastPage === 1 &&
    !filtersChanged
  ) {
    // If we're on page 1 and data has been refetched (e.g., after mutation),
    // update the accumulated jobs to reflect the latest data
    const currentIds = new Set(accumulatedJobs.jobs.map((j) => j.id));
    const newIds = new Set(newJobs.map((j) => j.id));

    // Check if the job lists are different (job was added/removed)
    const hasChanges =
      currentIds.size !== newIds.size ||
      Array.from(currentIds).some((id) => !newIds.has(id)) ||
      Array.from(newIds).some((id) => !currentIds.has(id));

    if (hasChanges) {
      setAccumulatedJobs({
        jobs: newJobs,
        lastPage: currentPage,
        filters: { companyFilter, positionFilter, sortBy, sortOrder },
      });
    }
  }

  const allJobs = accumulatedJobs.jobs;

  // Update active job when dragging starts from this column
  const handleDragStart = (job: any) => {
    onSetActiveJob(job);
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  return (
    <div
      ref={setNodeRef}
      className="flex min-w-[320px] flex-1 flex-col rounded-lg bg-muted/50 p-4"
    >
      {/* Column Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{column.label}</h3>
          <Badge variant="secondary" className="h-6">
            {total}
          </Badge>
        </div>
      </div>

      {/* Jobs List */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {isLoading && allJobs.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : allJobs.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 text-center text-sm text-muted-foreground">
            No jobs
          </div>
        ) : (
          <>
            {allJobs.map((job) => (
              <DraggableJobCard
                key={job.id}
                job={job}
                onClick={() => onJobClick(job.id)}
                onArchive={onArchive}
                onDragStart={() => handleDragStart(job)}
                isActive={activeId === job.id}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isFetchingMore}
                className="mt-2"
              >
                {isFetchingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load More (${total - allJobs.length} remaining)`
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface DraggableJobCardProps {
  job: any;
  onClick: () => void;
  onArchive: (jobId: string) => void;
  onDragStart: () => void;
  isActive: boolean;
}

function DraggableJobCard({
  job,
  onClick,
  onArchive,
  onDragStart,
  isActive,
}: DraggableJobCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: job.id,
      data: job,
    });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
    >
      <JobCard
        job={job}
        onClick={onClick}
        showApplicationStatus={false}
        onArchive={onArchive}
      />
    </div>
  );
}
