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
import { ResumeBullet, ResumeExperience } from "./types";

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface ExperienceSectionProps {
  items: ResumeExperience[];
  sectionVisible: boolean;
  onSectionVisibilityChange: (visible: boolean) => void;
  onItemsChange: (items: ResumeExperience[]) => void;
}

export function ExperienceSection({
  items,
  sectionVisible,
  onSectionVisibilityChange,
  onItemsChange,
}: ExperienceSectionProps) {
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

  const handleAddExperience = () => {
    const newItem: ResumeExperience = {
      id: generateId("exp"),
      company: "",
      title: "",
      startDate: "",
      endDate: null,
      bullets: [],
      visible: true,
      order: items.length,
    };
    onItemsChange([...items, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<ResumeExperience>) => {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const handleAddBullet = (experienceId: string) => {
    const experience = items.find((item) => item.id === experienceId);
    if (!experience) return;

    const newBullet: ResumeBullet = {
      id: generateId("bullet"),
      text: "",
      visible: true,
      order: experience.bullets.length,
    };

    handleUpdateItem(experienceId, {
      bullets: [...experience.bullets, newBullet],
    });
  };

  const handleUpdateBullet = (
    experienceId: string,
    bulletId: string,
    updates: Partial<ResumeBullet>,
  ) => {
    const experience = items.find((item) => item.id === experienceId);
    if (!experience) return;

    handleUpdateItem(experienceId, {
      bullets: experience.bullets.map((b) =>
        b.id === bulletId ? { ...b, ...updates } : b,
      ),
    });
  };

  const handleRemoveBullet = (experienceId: string, bulletId: string) => {
    const experience = items.find((item) => item.id === experienceId);
    if (!experience) return;

    handleUpdateItem(experienceId, {
      bullets: experience.bullets.filter((b) => b.id !== bulletId),
    });
  };

  const handleReorderBullets = (
    experienceId: string,
    bullets: ResumeBullet[],
  ) => {
    handleUpdateItem(experienceId, {
      bullets: bullets.map((b, idx) => ({ ...b, order: idx })),
    });
  };

  return (
    <div className={cn("rounded-lg border", !sectionVisible && "opacity-50")}>
      {/* Section Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:text-emerald-500"
            type="button"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <h3 className="font-semibold">Experience</h3>
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
                  <ExperienceItem
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                    onRemove={() => handleRemoveItem(item.id)}
                    onAddBullet={() => handleAddBullet(item.id)}
                    onUpdateBullet={(bId, updates) =>
                      handleUpdateBullet(item.id, bId, updates)
                    }
                    onRemoveBullet={(bId) => handleRemoveBullet(item.id, bId)}
                    onReorderBullets={(bullets) =>
                      handleReorderBullets(item.id, bullets)
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddExperience}
            className="mt-4 w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Experience
          </Button>
        </div>
      )}
    </div>
  );
}

interface ExperienceItemProps {
  item: ResumeExperience;
  onUpdate: (updates: Partial<ResumeExperience>) => void;
  onRemove: () => void;
  onAddBullet: () => void;
  onUpdateBullet: (id: string, updates: Partial<ResumeBullet>) => void;
  onRemoveBullet: (id: string) => void;
  onReorderBullets: (bullets: ResumeBullet[]) => void;
}

function ExperienceItem({
  item,
  onUpdate,
  onRemove,
  onAddBullet,
  onUpdateBullet,
  onRemoveBullet,
  onReorderBullets,
}: ExperienceItemProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleBulletDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = item.bullets.findIndex((b) => b.id === active.id);
      const newIndex = item.bullets.findIndex((b) => b.id === over.id);
      const reordered = arrayMove(item.bullets, oldIndex, newIndex);
      onReorderBullets(reordered);
    }
  };

  return (
    <DraggableItem id={item.id}>
      <div
        className={cn("rounded-lg border p-4", !item.visible && "opacity-50")}
      >
        {/* Item Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <EditableText
              value={item.title}
              onChange={(title) => onUpdate({ title })}
              placeholder="Job Title"
              className="text-lg font-medium"
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <EditableText
                value={item.company}
                onChange={(company) => onUpdate({ company })}
                placeholder="Company"
                className=""
              />
              <span className="text-zinc-600">|</span>
              <EditableText
                value={item.startDate}
                onChange={(startDate) => onUpdate({ startDate })}
                placeholder="Start Date"
                className=""
              />
              <span className="text-zinc-600">-</span>
              <EditableText
                value={item.endDate || ""}
                onChange={(endDate) => onUpdate({ endDate: endDate || null })}
                placeholder="Present"
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
            <AlertTitle>Relevance Reason for this experience entry</AlertTitle>
            <AlertDescription>{item.relevanceReason}</AlertDescription>
          </Alert>
        )}

        {/* Bullets Section */}
        <div className="mt-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleBulletDragEnd}
          >
            <SortableContext
              items={item.bullets.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {item.bullets.map((bullet) => (
                  <BulletItem
                    key={bullet.id}
                    bullet={bullet}
                    onUpdate={(updates) => onUpdateBullet(bullet.id, updates)}
                    onRemove={() => onRemoveBullet(bullet.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            variant="ghost"
            size="sm"
            onClick={onAddBullet}
            className="mt-2 w-full justify-start"
          >
            <Plus className="mr-2 h-3 w-3" />
            Add Bullet Point
          </Button>
        </div>
      </div>
    </DraggableItem>
  );
}

interface BulletItemProps {
  bullet: ResumeBullet;
  onUpdate: (updates: Partial<ResumeBullet>) => void;
  onRemove: () => void;
}

function BulletItem({ bullet, onUpdate, onRemove }: BulletItemProps) {
  return (
    <DraggableItem id={bullet.id}>
      <div
        className={cn(
          "flex items-start gap-2 rounded px-3 py-2",
          !bullet.visible && "opacity-50",
        )}
      >
        <EditableText
          value={bullet.text}
          onChange={(text) => onUpdate({ text })}
          placeholder="Describe an accomplishment..."
          className="flex-1 text-sm"
          multiline
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate({ visible: !bullet.visible })}
            className="h-6 w-6 p-0"
          >
            {bullet.visible ? (
              <Eye className="h-3 w-3 text-emerald-400" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 hover:text-red-400"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </DraggableItem>
  );
}
