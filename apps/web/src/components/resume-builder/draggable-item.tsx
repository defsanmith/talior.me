"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function DraggableItem({
  id,
  children,
  className,
  disabled = false,
}: DraggableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isDragging && "z-50 opacity-50",
        className
      )}
    >
      <div className="flex items-start gap-2">
        {!disabled && (
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            type="button"
          >
            <GripVertical className="h-4 w-4 text-zinc-400" />
          </button>
        )}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

interface DraggableListProps {
  children: React.ReactNode;
  className?: string;
}

export function DraggableList({ children, className }: DraggableListProps) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

