"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Eye, EyeOff, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectionEditorProps<T extends { id: string }> {
  title: string;
  items: T[];
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  onItemsReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  onAddItem: () => void;
  addButtonLabel: string;
  className?: string;
}

export function SectionEditor<T extends { id: string }>({
  title,
  items,
  visible,
  onVisibilityChange,
  onItemsReorder,
  renderItem,
  onAddItem,
  addButtonLabel,
  className,
}: SectionEditorProps<T>) {
  const [isExpanded, setIsExpanded] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      onItemsReorder(reorderedItems);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900/50",
        !visible && "opacity-50",
        className
      )}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-zinc-400 hover:text-zinc-200"
            type="button"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <h3 className="font-semibold text-zinc-100">{title}</h3>
          <span className="text-sm text-zinc-500">({items.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onVisibilityChange(!visible)}
            className="h-8 w-8 p-0"
          >
            {visible ? (
              <Eye className="h-4 w-4 text-emerald-400" />
            ) : (
              <EyeOff className="h-4 w-4 text-zinc-500" />
            )}
          </Button>
        </div>
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {items.map((item, index) => renderItem(item, index))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onAddItem}
            className="mt-4 w-full border-dashed border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            {addButtonLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

