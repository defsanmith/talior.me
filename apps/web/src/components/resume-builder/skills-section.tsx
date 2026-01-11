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
  X,
} from "lucide-react";
import { useState } from "react";
import { DraggableItem } from "./draggable-item";
import { EditableText } from "./editable-text";
import { ResumeSkillCategory, ResumeSkillItem } from "./types";

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface SkillsSectionProps {
  items: ResumeSkillCategory[];
  sectionVisible: boolean;
  onSectionVisibilityChange: (visible: boolean) => void;
  onItemsChange: (items: ResumeSkillCategory[]) => void;
}

export function SkillsSection({
  items,
  sectionVisible,
  onSectionVisibilityChange,
  onItemsChange,
}: SkillsSectionProps) {
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

  const handleAddCategory = () => {
    const newItem: ResumeSkillCategory = {
      id: generateId("cat"),
      name: "",
      skills: [],
      visible: true,
      order: items.length,
    };
    onItemsChange([...items, newItem]);
  };

  const handleUpdateItem = (
    id: string,
    updates: Partial<ResumeSkillCategory>,
  ) => {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const handleAddSkill = (categoryId: string) => {
    const category = items.find((item) => item.id === categoryId);
    if (!category) return;

    const newSkill: ResumeSkillItem = {
      id: generateId("skill"),
      name: "",
      visible: true,
    };

    handleUpdateItem(categoryId, {
      skills: [...category.skills, newSkill],
    });
  };

  const handleUpdateSkill = (
    categoryId: string,
    skillId: string,
    updates: Partial<ResumeSkillItem>,
  ) => {
    const category = items.find((item) => item.id === categoryId);
    if (!category) return;

    handleUpdateItem(categoryId, {
      skills: category.skills.map((s) =>
        s.id === skillId ? { ...s, ...updates } : s,
      ),
    });
  };

  const handleRemoveSkill = (categoryId: string, skillId: string) => {
    const category = items.find((item) => item.id === categoryId);
    if (!category) return;

    handleUpdateItem(categoryId, {
      skills: category.skills.filter((s) => s.id !== skillId),
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
          <h3 className="font-semibold">Skills</h3>
          <span className="text-sm">({items.length} categories)</span>
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
                  <SkillCategoryItem
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                    onRemove={() => handleRemoveItem(item.id)}
                    onAddSkill={() => handleAddSkill(item.id)}
                    onUpdateSkill={(sId, updates) =>
                      handleUpdateSkill(item.id, sId, updates)
                    }
                    onRemoveSkill={(sId) => handleRemoveSkill(item.id, sId)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCategory}
            className="mt-4 w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Skill Category
          </Button>
        </div>
      )}
    </div>
  );
}

interface SkillCategoryItemProps {
  item: ResumeSkillCategory;
  onUpdate: (updates: Partial<ResumeSkillCategory>) => void;
  onRemove: () => void;
  onAddSkill: () => void;
  onUpdateSkill: (id: string, updates: Partial<ResumeSkillItem>) => void;
  onRemoveSkill: (id: string) => void;
}

function SkillCategoryItem({
  item,
  onUpdate,
  onRemove,
  onAddSkill,
  onUpdateSkill,
  onRemoveSkill,
}: SkillCategoryItemProps) {
  return (
    <DraggableItem id={item.id}>
      <div
        className={cn("rounded-lg border p-4", !item.visible && "opacity-50")}
      >
        {/* Category Header */}
        <div className="flex items-start justify-between gap-4">
          <EditableText
            value={item.name}
            onChange={(name) => onUpdate({ name })}
            placeholder="Category Name (e.g., Programming Languages)"
            className="text-lg font-medium"
          />

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

        {/* Skills List */}
        <div className="mt-3 flex flex-wrap gap-2">
          {item.skills.map((skill) => (
            <div
              key={skill.id}
              className={cn(
                "group flex items-center gap-1 rounded-full border px-3 py-1",
                !skill.visible && "opacity-50",
              )}
            >
              <EditableText
                value={skill.name}
                onChange={(name) => onUpdateSkill(skill.id, { name })}
                placeholder="Skill"
                className="text-sm"
              />
              <div className="flex items-center gap-0.5 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onUpdateSkill(skill.id, { visible: !skill.visible })
                  }
                  className="h-5 w-5 p-0"
                >
                  {skill.visible ? (
                    <Eye className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveSkill(skill.id)}
                  className="h-5 w-5 p-0 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={onAddSkill}
            className="h-7 rounded-full border border-dashed px-3"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>
      </div>
    </DraggableItem>
  );
}
