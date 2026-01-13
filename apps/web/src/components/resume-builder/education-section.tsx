"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { DraggableItem } from "./draggable-item";
import { EditableText } from "./editable-text";
import { ResumeCoursework, ResumeEducation } from "./types";

function generateId() {
  return `edu-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface EducationSectionProps {
  items: ResumeEducation[];
  sectionVisible: boolean;
  onSectionVisibilityChange: (visible: boolean) => void;
  onItemsChange: (items: ResumeEducation[]) => void;
}

export function EducationSection({
  items,
  sectionVisible,
  onSectionVisibilityChange,
  onItemsChange,
}: EducationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex).map(
        (item, idx) => ({
          ...item,
          order: idx,
        }),
      );
      onItemsChange(reordered);
    }
  };

  const handleAddEducation = () => {
    const newItem: ResumeEducation = {
      id: generateId(),
      institution: "",
      degree: "",
      graduationDate: null,
      coursework: [],
      visible: true,
      order: items.length,
    };
    onItemsChange([...items, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<ResumeEducation>) => {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const handleAddCoursework = (educationId: string) => {
    const education = items.find((item) => item.id === educationId);
    if (!education) return;

    const newCoursework: ResumeCoursework = {
      id: `cw-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: "",
      visible: true,
    };

    handleUpdateItem(educationId, {
      coursework: [...education.coursework, newCoursework],
    });
  };

  const handleUpdateCoursework = (
    educationId: string,
    courseworkId: string,
    updates: Partial<ResumeCoursework>,
  ) => {
    const education = items.find((item) => item.id === educationId);
    if (!education) return;

    handleUpdateItem(educationId, {
      coursework: education.coursework.map((cw) =>
        cw.id === courseworkId ? { ...cw, ...updates } : cw,
      ),
    });
  };

  const handleRemoveCoursework = (
    educationId: string,
    courseworkId: string,
  ) => {
    const education = items.find((item) => item.id === educationId);
    if (!education) return;

    handleUpdateItem(educationId, {
      coursework: education.coursework.filter((cw) => cw.id !== courseworkId),
    });
  };

  return (
    <div className={cn("rounded-lg border", !sectionVisible && "opacity-50")}>
      {/* Section Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:text-zinc-200"
            type="button"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <h3 className="font-semibold">Education</h3>
          <span className="text-sm">({items.length})</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSectionVisibilityChange(!sectionVisible)}
          className="h-8 w-8 p-0"
        >
          {sectionVisible ? (
            <Eye className="h-4 w-4 text-emerald-400" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </Button>
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
              <div className="space-y-4">
                {items.map((item) => (
                  <EducationItem
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                    onRemove={() => handleRemoveItem(item.id)}
                    onAddCoursework={() => handleAddCoursework(item.id)}
                    onUpdateCoursework={(cwId, updates) =>
                      handleUpdateCoursework(item.id, cwId, updates)
                    }
                    onRemoveCoursework={(cwId) =>
                      handleRemoveCoursework(item.id, cwId)
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddEducation}
            className="mt-4 w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Education
          </Button>
        </div>
      )}
    </div>
  );
}

interface EducationItemProps {
  item: ResumeEducation;
  onUpdate: (updates: Partial<ResumeEducation>) => void;
  onRemove: () => void;
  onAddCoursework: () => void;
  onUpdateCoursework: (id: string, updates: Partial<ResumeCoursework>) => void;
  onRemoveCoursework: (id: string) => void;
}

function EducationItem({
  item,
  onUpdate,
  onRemove,
  onAddCoursework,
  onUpdateCoursework,
  onRemoveCoursework,
}: EducationItemProps) {
  const [showCoursework, setShowCoursework] = useState(
    item.coursework.length > 0,
  );

  return (
    <DraggableItem id={item.id}>
      <div
        className={cn("rounded-lg border p-4", !item.visible && "opacity-50")}
      >
        {/* Item Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <EditableText
              value={item.degree}
              onChange={(degree) => onUpdate({ degree })}
              placeholder="Degree (e.g., B.S. Computer Science)"
              className="text-lg font-medium"
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <EditableText
                value={item.institution}
                onChange={(institution) => onUpdate({ institution })}
                placeholder="Institution"
                className=""
              />
              <span className="text-zinc-600">|</span>
              <EditableText
                value={item.graduationDate || ""}
                onChange={(graduationDate) =>
                  onUpdate({ graduationDate: graduationDate || null })
                }
                placeholder="Graduation Date"
                className=""
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdate({ visible: !item.visible })}
              className="h-8 w-8 p-0"
            >
              {item.visible ? (
                <Eye className="h-4 w-4 text-emerald-400" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-8 w-8 p-0 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* AI Relevance Reason */}
        {item.relevanceReason && (
          <Alert className="mt-4">
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Relevance Reason for this education entry</AlertTitle>
            <AlertDescription>{item.relevanceReason}</AlertDescription>
          </Alert>
        )}

        {/* Coursework Section */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowCoursework(!showCoursework)}
              className="flex items-center gap-1 text-sm"
              type="button"
            >
              {showCoursework ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Relevant Coursework
              {item.coursework.length > 0 && (
                <span className="ml-1">
                  ({item.coursework.filter((c) => c.visible).length}/
                  {item.coursework.length})
                </span>
              )}
            </button>
          </div>

          {showCoursework && (
            <div className="mt-2 space-y-2">
              {item.coursework.map((cw) => (
                <div
                  key={cw.id}
                  className={cn(
                    "flex items-center gap-2 rounded px-3 py-2",
                    !cw.visible && "opacity-50",
                  )}
                >
                  <EditableText
                    value={cw.name}
                    onChange={(name) => onUpdateCoursework(cw.id, { name })}
                    placeholder="Course name"
                    className="flex-1 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onUpdateCoursework(cw.id, { visible: !cw.visible })
                    }
                    className="h-6 w-6 p-0"
                  >
                    {cw.visible ? (
                      <Eye className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveCoursework(cw.id)}
                    className="h-6 w-6 p-0 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={onAddCoursework}
                className="w-full justify-start"
              >
                <Plus className="mr-2 h-3 w-3" />
                Add Coursework
              </Button>
            </div>
          )}
        </div>
      </div>
    </DraggableItem>
  );
}
