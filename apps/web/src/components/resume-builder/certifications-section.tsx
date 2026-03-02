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
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { DraggableItem } from "./draggable-item";
import { EditableText } from "./editable-text";
import { ResumeCertification } from "./types";

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface CertificationsSectionProps {
  items: ResumeCertification[];
  sectionVisible: boolean;
  onSectionVisibilityChange: (visible: boolean) => void;
  onItemsChange: (items: ResumeCertification[]) => void;
}

export function CertificationsSection({
  items,
  sectionVisible,
  onSectionVisibilityChange,
  onItemsChange,
}: CertificationsSectionProps) {
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
        (item, idx) => ({ ...item, order: idx }),
      );
      onItemsChange(reordered);
    }
  };

  const handleAddCertification = () => {
    const newItem: ResumeCertification = {
      id: generateId("cert"),
      title: "",
      issuer: "",
      issueDate: null,
      expirationDate: null,
      credentialUrl: null,
      visible: true,
      order: items.length,
    };
    onItemsChange([...items, newItem]);
  };

  const handleUpdateItem = (
    id: string,
    updates: Partial<ResumeCertification>,
  ) => {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className={cn("rounded-lg border", !sectionVisible && "opacity-50")}>
      {/* Section Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className=" "
            type="button"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <h3 className="font-semibold">Certifications</h3>
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
                  <CertificationItem
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                    onRemove={() => handleRemoveItem(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCertification}
            className="mt-4 w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Certification
          </Button>
        </div>
      )}
    </div>
  );
}

interface CertificationItemProps {
  item: ResumeCertification;
  onUpdate: (updates: Partial<ResumeCertification>) => void;
  onRemove: () => void;
}

function CertificationItem({
  item,
  onUpdate,
  onRemove,
}: CertificationItemProps) {
  return (
    <DraggableItem id={item.id}>
      <div
        className={cn(
          "rounded-lg border p-4 transition-opacity",
          !item.visible && "opacity-40",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            {/* Title */}
            <EditableText
              value={item.title}
              onChange={(val) => onUpdate({ title: val })}
              placeholder="Certification title"
              className="text-base font-semibold"
            />

            {/* Issuer */}
            <EditableText
              value={item.issuer}
              onChange={(val) => onUpdate({ issuer: val })}
              placeholder="Issuing organization"
              className="text-sm text-muted-foreground"
            />

            {/* Dates */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <EditableText
                value={item.issueDate ?? ""}
                onChange={(val) => onUpdate({ issueDate: val || null })}
                placeholder="Issue date (e.g. Jan 2024)"
                className="text-sm"
              />
              <span className="text-muted-foreground/50">–</span>
              <EditableText
                value={item.expirationDate ?? ""}
                onChange={(val) => onUpdate({ expirationDate: val || null })}
                placeholder="Expiry (blank = no expiry)"
                className="text-sm"
              />
            </div>

            {/* Credential URL */}
            <EditableText
              value={item.credentialUrl ?? ""}
              onChange={(val) => onUpdate({ credentialUrl: val || null })}
              placeholder="Credential URL (optional)"
              className="text-sm text-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdate({ visible: !item.visible })}
              className="h-7 w-7 p-0"
            >
              {item.visible ? (
                <Eye className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </DraggableItem>
  );
}
