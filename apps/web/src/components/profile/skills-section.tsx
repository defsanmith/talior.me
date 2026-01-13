"use client";

import { useState } from "react";
import { ProfileSkill, ProfileSkillCategory } from "@tailor.me/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useCreateSkillMutation,
  useUpdateSkillMutation,
  useDeleteSkillMutation,
  useCreateSkillCategoryMutation,
  useUpdateSkillCategoryMutation,
  useDeleteSkillCategoryMutation,
} from "@/store/api/profile/queries";
import { Sparkles, Plus, X, Pencil, Trash2, FolderPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SkillsSectionProps {
  skills: ProfileSkill[];
  skillCategories: ProfileSkillCategory[];
  isLoading?: boolean;
}

export function SkillsSection({ skills, skillCategories, isLoading }: SkillsSectionProps) {
  const [createSkill, { isLoading: isCreatingSkill }] = useCreateSkillMutation();
  const [updateSkill] = useUpdateSkillMutation();
  const [deleteSkill] = useDeleteSkillMutation();
  const [createSkillCategory, { isLoading: isCreatingCategory }] = useCreateSkillCategoryMutation();
  const [updateSkillCategory] = useUpdateSkillCategoryMutation();
  const [deleteSkillCategory] = useDeleteSkillCategoryMutation();

  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: "",
    categoryId: "",
  });
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleCreateSkill = async () => {
    if (!newSkill.name) return;
    await createSkill({
      name: newSkill.name,
      categoryId: newSkill.categoryId || null,
    });
    setNewSkill({ name: "", categoryId: "" });
    setIsAddingSkill(false);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    await createSkillCategory({ name: newCategoryName.trim() });
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const handleUpdateSkill = async (id: string, data: { name?: string; categoryId?: string | null }) => {
    await updateSkill({ id, data });
  };

  const handleDeleteSkill = async (id: string) => {
    await deleteSkill(id);
  };

  const handleUpdateCategory = async (id: string, name: string) => {
    await updateSkillCategory({ id, data: { name } });
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Are you sure? Skills in this category will become uncategorized.")) {
      await deleteSkillCategory(id);
    }
  };

  // Group skills by category
  const groupedSkills = skills.reduce(
    (acc, skill) => {
      const categoryId = skill.categoryId || "uncategorized";
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(skill);
      return acc;
    },
    {} as Record<string, ProfileSkill[]>
  );

  // Create a map of category ids to names
  const categoryMap = skillCategories.reduce(
    (acc, cat) => {
      acc[cat.id] = cat.name;
      return acc;
    },
    {} as Record<string, string>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Skills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6 w-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Skills
          </CardTitle>
          <CardDescription>
            Technical skills and areas of expertise
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingCategory(true)}
            disabled={isAddingCategory}
          >
            <FolderPlus className="mr-1 h-4 w-4" />
            Category
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingSkill(true)}
            disabled={isAddingSkill}
          >
            <Plus className="mr-1 h-4 w-4" />
            Skill
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Category */}
        {isAddingCategory && (
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <Input
              placeholder="Category name (e.g., Frontend, Backend, Languages)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCategory();
                if (e.key === "Escape") {
                  setNewCategoryName("");
                  setIsAddingCategory(false);
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewCategoryName("");
                  setIsAddingCategory(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
              >
                Add Category
              </Button>
            </div>
          </div>
        )}

        {/* Add New Skill */}
        {isAddingSkill && (
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <Input
              placeholder="Skill name (e.g., React, Python)"
              value={newSkill.name}
              onChange={(e) =>
                setNewSkill({ ...newSkill, name: e.target.value })
              }
            />
            <Select
              value={newSkill.categoryId}
              onValueChange={(value) =>
                setNewSkill({ ...newSkill, categoryId: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {skillCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewSkill({ name: "", categoryId: "" });
                  setIsAddingSkill(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateSkill}
                disabled={isCreatingSkill || !newSkill.name}
              >
                Add Skill
              </Button>
            </div>
          </div>
        )}

        {/* Categories with Skills */}
        {skillCategories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            skills={groupedSkills[category.id] || []}
            allCategories={skillCategories}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onUpdateSkill={handleUpdateSkill}
            onDeleteSkill={handleDeleteSkill}
          />
        ))}

        {/* Uncategorized Skills */}
        {groupedSkills["uncategorized"]?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Uncategorized
            </h4>
            <div className="flex flex-wrap gap-2">
              {groupedSkills["uncategorized"].map((skill) => (
                <SkillBadge
                  key={skill.id}
                  skill={skill}
                  allCategories={skillCategories}
                  onUpdate={handleUpdateSkill}
                  onDelete={handleDeleteSkill}
                />
              ))}
            </div>
          </div>
        )}

        {skills.length === 0 && skillCategories.length === 0 && !isAddingSkill && !isAddingCategory && (
          <p className="text-center text-muted-foreground py-8">
            No skills or categories added yet. Start by creating a category, then add skills.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface CategorySectionProps {
  category: ProfileSkillCategory;
  skills: ProfileSkill[];
  allCategories: ProfileSkillCategory[];
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateSkill: (id: string, data: { name?: string; categoryId?: string | null }) => void;
  onDeleteSkill: (id: string) => void;
}

function CategorySection({
  category,
  skills,
  allCategories,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateSkill,
  onDeleteSkill,
}: CategorySectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(category.name);

  const handleSave = () => {
    if (editValue.trim() && editValue !== category.name) {
      onUpdateCategory(category.id, editValue.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="space-y-2 group/category">
      <div className="flex items-center gap-2">
        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setEditValue(category.name);
                setIsEditing(false);
              }
            }}
            onBlur={handleSave}
            className="h-7 w-48 text-sm font-medium"
            autoFocus
          />
        ) : (
          <h4 className="text-sm font-medium text-muted-foreground">
            {category.name}
          </h4>
        )}
        <div className="flex gap-1 opacity-0 group-hover/category:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDeleteCategory(category.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <SkillBadge
            key={skill.id}
            skill={skill}
            allCategories={allCategories}
            onUpdate={onUpdateSkill}
            onDelete={onDeleteSkill}
          />
        ))}
        {skills.length === 0 && (
          <span className="text-xs text-muted-foreground">
            No skills in this category
          </span>
        )}
      </div>
    </div>
  );
}

interface SkillBadgeProps {
  skill: ProfileSkill;
  allCategories: ProfileSkillCategory[];
  onUpdate: (id: string, data: { name?: string; categoryId?: string | null }) => void;
  onDelete: (id: string) => void;
}

function SkillBadge({ skill, allCategories, onUpdate, onDelete }: SkillBadgeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(skill.name);
  const [showCategorySelect, setShowCategorySelect] = useState(false);

  const handleSave = () => {
    if (editValue && editValue !== skill.name) {
      onUpdate(skill.id, { name: editValue });
    }
    setIsEditing(false);
  };

  const handleCategoryChange = (categoryId: string) => {
    onUpdate(skill.id, { categoryId: categoryId === "none" ? null : categoryId });
    setShowCategorySelect(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setEditValue(skill.name);
              setIsEditing(false);
            }
          }}
          onBlur={handleSave}
          className="h-7 w-24 text-sm"
          autoFocus
        />
      </div>
    );
  }

  if (showCategorySelect) {
    return (
      <Select
        value={skill.categoryId || "none"}
        onValueChange={handleCategoryChange}
        open={true}
        onOpenChange={(open) => !open && setShowCategorySelect(false)}
      >
        <SelectTrigger className="h-7 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No category</SelectItem>
          {allCategories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="group cursor-pointer pr-1 transition-all hover:pr-2"
    >
      <span onClick={() => setIsEditing(true)}>{skill.name}</span>
      <button
        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setShowCategorySelect(true);
        }}
        title="Change category"
      >
        <FolderPlus className="h-3 w-3" />
      </button>
      <button
        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(skill.id);
        }}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
