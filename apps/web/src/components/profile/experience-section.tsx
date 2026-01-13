"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateBulletMutation,
  useCreateExperienceMutation,
  useDeleteBulletMutation,
  useDeleteExperienceMutation,
  useUpdateBulletMutation,
  useUpdateBulletSkillsMutation,
  useUpdateExperienceMutation,
} from "@/store/api/profile/queries";
import {
  ProfileBullet,
  ProfileExperience,
  ProfileSkill,
} from "@tailor.me/shared";
import {
  Briefcase,
  ChevronsUpDown,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { InlineTextField } from "./inline-text-field";
import { SkillsCombobox } from "./skills-combobox";

interface ExperienceSectionProps {
  experiences: ProfileExperience[];
  skills: ProfileSkill[];
  isLoading?: boolean;
}

export function ExperienceSection({
  experiences,
  skills,
  isLoading,
}: ExperienceSectionProps) {
  const [createExperience, { isLoading: isCreating }] =
    useCreateExperienceMutation();
  const [updateExperience] = useUpdateExperienceMutation();
  const [deleteExperience] = useDeleteExperienceMutation();
  const [createBullet] = useCreateBulletMutation();
  const [updateBullet] = useUpdateBulletMutation();
  const [updateBulletSkills] = useUpdateBulletSkillsMutation();
  const [deleteBullet] = useDeleteBulletMutation();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newExperience, setNewExperience] = useState({
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
  });

  const handleCreateExperience = async () => {
    if (!newExperience.company || !newExperience.title) return;
    await createExperience({
      company: newExperience.company,
      title: newExperience.title,
      location: newExperience.location || null,
      startDate: newExperience.startDate || new Date().toISOString(),
      endDate: newExperience.endDate || null,
    });
    setNewExperience({
      company: "",
      title: "",
      location: "",
      startDate: "",
      endDate: "",
    });
    setIsAddingNew(false);
  };

  const handleUpdateField = async (
    id: string,
    field: string,
    value: string,
  ) => {
    await updateExperience({
      id,
      data: { [field]: value || null },
    });
  };

  const handleDeleteExperience = async (id: string) => {
    if (confirm("Are you sure you want to delete this experience?")) {
      await deleteExperience(id);
    }
  };

  const handleAddBullet = async (experienceId: string) => {
    await createBullet({
      experienceId,
      content: "New bullet point",
    });
  };

  const handleUpdateBullet = async (
    bulletId: string,
    data: { content?: string; tags?: string[] },
  ) => {
    await updateBullet({
      id: bulletId,
      data,
    });
  };

  const handleUpdateBulletSkills = async (
    bulletId: string,
    skillIds: string[],
  ) => {
    await updateBulletSkills({
      id: bulletId,
      data: { skillIds },
    });
  };

  const handleDeleteBullet = async (bulletId: string) => {
    if (confirm("Are you sure you want to delete this bullet?")) {
      await deleteBullet(bulletId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Experience
          </CardTitle>
          <CardDescription>
            Your work experience and accomplishments
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingNew(true)}
          disabled={isAddingNew}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {isAddingNew && (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <Input
              placeholder="Company name"
              value={newExperience.company}
              onChange={(e) =>
                setNewExperience({ ...newExperience, company: e.target.value })
              }
            />
            <Input
              placeholder="Job title"
              value={newExperience.title}
              onChange={(e) =>
                setNewExperience({ ...newExperience, title: e.target.value })
              }
            />
            <Input
              placeholder="Location (e.g., San Francisco, CA)"
              value={newExperience.location}
              onChange={(e) =>
                setNewExperience({ ...newExperience, location: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Input
                type="month"
                placeholder="Start date"
                value={newExperience.startDate}
                onChange={(e) =>
                  setNewExperience({
                    ...newExperience,
                    startDate: e.target.value,
                  })
                }
              />
              <Input
                type="month"
                placeholder="End date"
                value={newExperience.endDate}
                onChange={(e) =>
                  setNewExperience({
                    ...newExperience,
                    endDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingNew(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateExperience}
                disabled={
                  isCreating || !newExperience.company || !newExperience.title
                }
              >
                Add Experience
              </Button>
            </div>
          </div>
        )}

        {experiences.map((exp) => (
          <ExperienceCard
            key={exp.id}
            experience={exp}
            allSkills={skills}
            onUpdateField={handleUpdateField}
            onDelete={handleDeleteExperience}
            onAddBullet={handleAddBullet}
            onUpdateBullet={handleUpdateBullet}
            onUpdateBulletSkills={handleUpdateBulletSkills}
            onDeleteBullet={handleDeleteBullet}
          />
        ))}

        {experiences.length === 0 && !isAddingNew && (
          <p className="py-8 text-center text-muted-foreground">
            No experience added yet. Click &quot;Add&quot; to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface ExperienceCardProps {
  experience: ProfileExperience;
  allSkills: ProfileSkill[];
  onUpdateField: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
  onAddBullet: (experienceId: string) => void;
  onUpdateBullet: (
    bulletId: string,
    data: { content?: string; tags?: string[] },
  ) => void;
  onUpdateBulletSkills: (bulletId: string, skillIds: string[]) => void;
  onDeleteBullet: (bulletId: string) => void;
}

function ExperienceCard({
  experience,
  allSkills,
  onUpdateField,
  onDelete,
  onAddBullet,
  onUpdateBullet,
  onUpdateBulletSkills,
  onDeleteBullet,
}: ExperienceCardProps) {
  return (
    <div className="group rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {/* <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-50" /> */}
            <InlineTextField
              value={experience.title}
              onSave={(value) => onUpdateField(experience.id, "title", value)}
              className="text-lg font-semibold"
              validate={(v) => (v.length < 1 ? "Title is required" : null)}
            />
          </div>
          <InlineTextField
            value={experience.company}
            onSave={(value) => onUpdateField(experience.id, "company", value)}
            className="text-muted-foreground"
            validate={(v) => (v.length < 1 ? "Company is required" : null)}
          />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <InlineTextField
                value={experience.location || ""}
                onSave={(value) =>
                  onUpdateField(experience.id, "location", value)
                }
                placeholder="Add location"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <InlineTextField
              value={experience.startDate}
              onSave={(value) =>
                onUpdateField(experience.id, "startDate", value)
              }
              placeholder="Start date"
            />
            <span>-</span>
            <InlineTextField
              value={experience.endDate || "Present"}
              onSave={(value) =>
                onUpdateField(
                  experience.id,
                  "endDate",
                  value === "Present" ? "" : value,
                )
              }
              placeholder="End date"
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive opacity-0 hover:text-destructive group-hover:opacity-100"
          onClick={() => onDelete(experience.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Bullets */}
      <Collapsible defaultOpen={false} className="mt-4">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 px-2">
              <span className="text-sm font-medium">
                Bullet Points ({experience.bullets.length})
              </span>
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddBullet(experience.id)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Bullet
          </Button>
        </div>
        <CollapsibleContent className="mt-2">
          <ul className="space-y-3">
            {experience.bullets.map((bullet: ProfileBullet) => (
              <BulletItem
                key={bullet.id}
                bullet={bullet}
                allSkills={allSkills}
                onUpdate={onUpdateBullet}
                onUpdateSkills={onUpdateBulletSkills}
                onDelete={onDeleteBullet}
              />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface BulletItemProps {
  bullet: ProfileBullet;
  allSkills: ProfileSkill[];
  onUpdate: (
    bulletId: string,
    data: { content?: string; tags?: string[] },
  ) => void;
  onUpdateSkills: (bulletId: string, skillIds: string[]) => void;
  onDelete: (bulletId: string) => void;
}

function BulletItem({
  bullet,
  allSkills,
  onUpdate,
  onUpdateSkills,
  onDelete,
}: BulletItemProps) {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newTag, setNewTag] = useState("");

  const selectedSkillIds = bullet.skills?.map((bs) => bs.skillId) || [];

  const handleAddTag = () => {
    if (newTag.trim() && !bullet.tags.includes(newTag.trim())) {
      onUpdate(bullet.id, { tags: [...bullet.tags, newTag.trim()] });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate(bullet.id, { tags: bullet.tags.filter((t) => t !== tagToRemove) });
  };

  const handleToggleSkill = (skillId: string) => {
    const newSkillIds = selectedSkillIds.includes(skillId)
      ? selectedSkillIds.filter((id) => id !== skillId)
      : [...selectedSkillIds, skillId];
    onUpdateSkills(bullet.id, newSkillIds);
  };

  return (
    <li className="group/bullet space-y-2 rounded-md border border-transparent p-2 transition-colors hover:border-border hover:bg-muted/30">
      <div className="flex items-start gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/50" />
        <InlineTextField
          value={bullet.content}
          onSave={(value) => onUpdate(bullet.id, { content: value })}
          className="flex-1 text-sm"
          multiline
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive opacity-0 hover:text-destructive group-hover/bullet:opacity-100"
          onClick={() => onDelete(bullet.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Tags and Skills Section */}
      <div className="ml-4 flex flex-wrap items-center gap-1">
        {/* Tags Button
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs opacity-0 group-hover/bullet:opacity-100"
          onClick={() => setIsEditingTags(!isEditingTags)}
        >
          <Tag className="mr-1 h-3 w-3" />
          Tags
        </Button> */}

        {/* Skills Combobox */}
        <SkillsCombobox
          skills={allSkills}
          selectedSkillIds={selectedSkillIds}
          onToggleSkill={handleToggleSkill}
          placeholder="Add skills..."
        />

        {/* Display Tags */}
        {bullet.tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="group/tag cursor-pointer text-xs transition-colors hover:bg-destructive/10"
          >
            {tag}
            <button
              className="ml-1 opacity-0 transition-opacity group-hover/tag:opacity-100"
              onClick={() => handleRemoveTag(tag)}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}

        {/* Tag Input */}
        {/* {isEditingTags && (
          <div className="flex items-center gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
                if (e.key === "Escape") {
                  setIsEditingTags(false);
                  setNewTag("");
                }
              }}
              placeholder="Add tag..."
              className="h-6 w-24 text-xs"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={handleAddTag}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )} */}
      </div>
    </li>
  );
}
