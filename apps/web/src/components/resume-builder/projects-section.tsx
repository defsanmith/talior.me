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
import { ResumeBullet, ResumeProject } from "./types";

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface ProjectsSectionProps {
  items: ResumeProject[];
  sectionVisible: boolean;
  onSectionVisibilityChange: (visible: boolean) => void;
  onItemsChange: (items: ResumeProject[]) => void;
}

export function ProjectsSection({
  items,
  sectionVisible,
  onSectionVisibilityChange,
  onItemsChange,
}: ProjectsSectionProps) {
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

  const handleAddProject = () => {
    const newItem: ResumeProject = {
      id: generateId("proj"),
      name: "",
      date: null,
      url: null,
      tech: [],
      bullets: [],
      visible: true,
      order: items.length,
    };
    onItemsChange([...items, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<ResumeProject>) => {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const handleAddBullet = (projectId: string) => {
    const project = items.find((item) => item.id === projectId);
    if (!project) return;

    const newBullet: ResumeBullet = {
      id: generateId("bullet"),
      text: "",
      visible: true,
      order: project.bullets.length,
    };

    handleUpdateItem(projectId, {
      bullets: [...project.bullets, newBullet],
    });
  };

  const handleUpdateBullet = (
    projectId: string,
    bulletId: string,
    updates: Partial<ResumeBullet>,
  ) => {
    const project = items.find((item) => item.id === projectId);
    if (!project) return;

    handleUpdateItem(projectId, {
      bullets: project.bullets.map((b) =>
        b.id === bulletId ? { ...b, ...updates } : b,
      ),
    });
  };

  const handleRemoveBullet = (projectId: string, bulletId: string) => {
    const project = items.find((item) => item.id === projectId);
    if (!project) return;

    handleUpdateItem(projectId, {
      bullets: project.bullets.filter((b) => b.id !== bulletId),
    });
  };

  const handleReorderBullets = (projectId: string, bullets: ResumeBullet[]) => {
    handleUpdateItem(projectId, {
      bullets: bullets.map((b, idx) => ({ ...b, order: idx })),
    });
  };

  const handleAddTech = (projectId: string, tech: string) => {
    const project = items.find((item) => item.id === projectId);
    if (!project) return;

    handleUpdateItem(projectId, {
      tech: [...project.tech, tech],
    });
  };

  const handleRemoveTech = (projectId: string, index: number) => {
    const project = items.find((item) => item.id === projectId);
    if (!project) return;

    handleUpdateItem(projectId, {
      tech: project.tech.filter((_, i) => i !== index),
    });
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
          <h3 className="font-semibold">Projects</h3>
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
                  <ProjectItem
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
                    onAddTech={(tech) => handleAddTech(item.id, tech)}
                    onRemoveTech={(index) => handleRemoveTech(item.id, index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddProject}
            className="mt-4 w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>
      )}
    </div>
  );
}

interface ProjectItemProps {
  item: ResumeProject;
  onUpdate: (updates: Partial<ResumeProject>) => void;
  onRemove: () => void;
  onAddBullet: () => void;
  onUpdateBullet: (id: string, updates: Partial<ResumeBullet>) => void;
  onRemoveBullet: (id: string) => void;
  onReorderBullets: (bullets: ResumeBullet[]) => void;
  onAddTech: (tech: string) => void;
  onRemoveTech: (index: number) => void;
}

function ProjectItem({
  item,
  onUpdate,
  onRemove,
  onAddBullet,
  onUpdateBullet,
  onRemoveBullet,
  onReorderBullets,
  onAddTech,
  onRemoveTech,
}: ProjectItemProps) {
  const [newTech, setNewTech] = useState("");

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

  const handleAddTech = () => {
    if (newTech.trim()) {
      onAddTech(newTech.trim());
      setNewTech("");
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
              value={item.name}
              onChange={(name) => onUpdate({ name })}
              placeholder="Project Name"
              className="text-lg font-medium"
            />
            <EditableText
              value={item.date || ""}
              onChange={(date) => onUpdate({ date: date || null })}
              placeholder="e.g. Jan 2025"
              className="text-sm text-muted-foreground"
            />
            <EditableText
              value={item.url || ""}
              onChange={(url) => onUpdate({ url: url || null })}
              placeholder="https://github.com/username/project"
              className="text-sm text-muted-foreground"
            />
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
            <AlertTitle>Relevance Reason for this project entry</AlertTitle>
            <AlertDescription>{item.relevanceReason}</AlertDescription>
          </Alert>
        )}

        {/* Tech Stack */}
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {item.tech.map((tech, index) => (
              <div
                key={index}
                className="group flex items-center gap-1 rounded px-2 py-1"
              >
                <span className="text-xs">{tech}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveTech(index)}
                  className="h-4 w-4 p-0 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTech();
                  }
                }}
                placeholder="Add tech..."
                className="w-20 rounded border border-transparent bg-transparent px-2 py-1 text-xs outline-none"
              />
              {newTech && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddTech}
                  className="h-5 w-5 p-0 text-emerald-400"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

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
                  <ProjectBulletItem
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
            className="hover: mt-2 w-full justify-start"
          >
            <Plus className="mr-2 h-3 w-3" />
            Add Bullet Point
          </Button>
        </div>
      </div>
    </DraggableItem>
  );
}

interface ProjectBulletItemProps {
  bullet: ResumeBullet;
  onUpdate: (updates: Partial<ResumeBullet>) => void;
  onRemove: () => void;
}

function ProjectBulletItem({
  bullet,
  onUpdate,
  onRemove,
}: ProjectBulletItemProps) {
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
          placeholder="Describe a key feature or accomplishment..."
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
