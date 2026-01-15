"use client";

import { Badge } from "@/components/ui/badge";
import Router from "@/lib/router";
import { useUpdateJobStatusMutation } from "@/store/api/tracker/mutations";
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
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import JobCard from "../job-posts/job-card";

interface KanbanViewProps {
  jobs: any[]; // Replace with proper type
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

export function KanbanView({ jobs }: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [updateJobStatus] = useUpdateJobStatusMutation();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Group jobs by status
  const jobsByStatus = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    STATUS_COLUMNS.forEach((column) => {
      grouped[column.id] = [];
    });

    jobs.forEach((job) => {
      const status = job.applicationStatus || ApplicationStatus.READY_TO_APPLY;
      if (grouped[status]) {
        grouped[status].push(job);
      }
    });

    return grouped;
  }, [jobs]);

  const activeJob = useMemo(() => {
    if (!activeId) return null;
    return jobs.find((job) => job.id === activeId);
  }, [activeId, jobs]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const jobId = active.id as string;
    const newStatus = over.id as string;

    // Find the job to get its current status
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.applicationStatus === newStatus) return;

    // Optimistically update the job status
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
            jobs={jobsByStatus[column.id] || []}
            onJobClick={handleJobClick}
            onArchive={handleArchive}
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
  jobs: any[];
  onJobClick: (jobId: string) => void;
  onArchive: (jobId: string) => void;
}

function KanbanColumn({
  column,
  jobs,
  onJobClick,
  onArchive,
}: KanbanColumnProps) {
  //   const { useDroppable } = require("@dnd-kit/core");
  //   const { useSortable } = require("@dnd-kit/sortable");

  const { setNodeRef } = useDroppable({
    id: column.id,
  });

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
            {jobs.length}
          </Badge>
        </div>
      </div>

      {/* Jobs List */}
      <div className="flex flex-col gap-3">
        {jobs.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 text-center text-sm text-muted-foreground">
            No jobs
          </div>
        ) : (
          jobs.map((job) => (
            <DraggableJobCard
              key={job.id}
              job={job}
              onClick={() => onJobClick(job.id)}
              onArchive={onArchive}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface DraggableJobCardProps {
  job: any;
  onClick: () => void;
  onArchive: (jobId: string) => void;
}

function DraggableJobCard({ job, onClick, onArchive }: DraggableJobCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: job.id });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <JobCard
        job={job}
        onClick={onClick}
        showApplicationStatus
        onArchive={onArchive}
      />
    </div>
  );
}
