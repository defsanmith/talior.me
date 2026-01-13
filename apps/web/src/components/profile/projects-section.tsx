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
  useCreateProjectMutation,
  useDeleteBulletMutation,
  useDeleteProjectMutation,
  useUpdateBulletMutation,
  useUpdateBulletSkillsMutation,
  useUpdateProjectMutation,
  useUpdateProjectSkillsMutation,
} from "@/store/api/profile/queries";
import { ProfileBullet, ProfileProject, ProfileSkill } from "@tailor.me/shared";
import {
  Calendar,
  ChevronsUpDown,
  ExternalLink,
  FolderOpen,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { InlineTextField } from "./inline-text-field";
import { SkillsCombobox } from "./skills-combobox";

interface ProjectsSectionProps {
  projects: ProfileProject[];
  skills: ProfileSkill[];
  isLoading?: boolean;
}

export function ProjectsSection({
  projects,
  skills,
  isLoading,
}: ProjectsSectionProps) {
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [updateProject] = useUpdateProjectMutation();
  const [updateProjectSkills] = useUpdateProjectSkillsMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [createBullet] = useCreateBulletMutation();
  const [updateBullet] = useUpdateBulletMutation();
  const [updateBulletSkills] = useUpdateBulletSkillsMutation();
  const [deleteBullet] = useDeleteBulletMutation();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    date: "",
    url: "",
  });

  const handleCreateProject = async () => {
    if (!newProject.name) return;
    await createProject({
      name: newProject.name,
      date: newProject.date || null,
      url: newProject.url || null,
    });
    setNewProject({ name: "", date: "", url: "" });
    setIsAddingNew(false);
  };

  const handleUpdateField = async (
    id: string,
    field: string,
    value: string | string[],
  ) => {
    await updateProject({
      id,
      data: { [field]: value || null },
    });
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      await deleteProject(id);
    }
  };

  const handleAddBullet = async (projectId: string) => {
    await createBullet({
      projectId,
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

  const handleUpdateProjectSkills = async (
    projectId: string,
    skillIds: string[],
  ) => {
    await updateProjectSkills({
      id: projectId,
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
            <FolderOpen className="h-5 w-5" />
            Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-48" />
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
            <FolderOpen className="h-5 w-5" />
            Projects
          </CardTitle>
          <CardDescription>
            Personal and professional projects you&apos;ve worked on
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
      <CardContent className="space-y-4">
        {isAddingNew && (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <Input
              placeholder="Project name"
              value={newProject.name}
              onChange={(e) =>
                setNewProject({ ...newProject, name: e.target.value })
              }
            />
            <Input
              placeholder="Date (e.g., 2024 or Jan 2024)"
              value={newProject.date}
              onChange={(e) =>
                setNewProject({ ...newProject, date: e.target.value })
              }
            />
            <Input
              placeholder="URL (optional)"
              value={newProject.url}
              onChange={(e) =>
                setNewProject({ ...newProject, url: e.target.value })
              }
            />
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
                onClick={handleCreateProject}
                disabled={isCreating || !newProject.name}
              >
                Add Project
              </Button>
            </div>
          </div>
        )}

        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            allSkills={skills}
            onUpdateField={handleUpdateField}
            onUpdateProjectSkills={handleUpdateProjectSkills}
            onDelete={handleDeleteProject}
            onAddBullet={handleAddBullet}
            onUpdateBullet={handleUpdateBullet}
            onUpdateBulletSkills={handleUpdateBulletSkills}
            onDeleteBullet={handleDeleteBullet}
          />
        ))}

        {projects.length === 0 && !isAddingNew && (
          <p className="py-8 text-center text-muted-foreground">
            No projects added yet. Click &quot;Add&quot; to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface ProjectCardProps {
  project: ProfileProject;
  allSkills: ProfileSkill[];
  onUpdateField: (id: string, field: string, value: string | string[]) => void;
  onUpdateProjectSkills: (projectId: string, skillIds: string[]) => void;
  onDelete: (id: string) => void;
  onAddBullet: (projectId: string) => void;
  onUpdateBullet: (
    bulletId: string,
    data: { content?: string; tags?: string[] },
  ) => void;
  onUpdateBulletSkills: (bulletId: string, skillIds: string[]) => void;
  onDeleteBullet: (bulletId: string) => void;
}

function ProjectCard({
  project,
  allSkills,
  onUpdateField,
  onUpdateProjectSkills,
  onDelete,
  onAddBullet,
  onUpdateBullet,
  onUpdateBulletSkills,
  onDeleteBullet,
}: ProjectCardProps) {
  const selectedSkillIds = project.skills?.map((ps) => ps.skillId) || [];

  const handleToggleSkill = (skillId: string) => {
    const newSkillIds = selectedSkillIds.includes(skillId)
      ? selectedSkillIds.filter((id) => id !== skillId)
      : [...selectedSkillIds, skillId];
    onUpdateProjectSkills(project.id, newSkillIds);
  };

  return (
    <div className="group rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <InlineTextField
              value={project.name}
              onSave={(value) => onUpdateField(project.id, "name", value)}
              className="text-lg font-semibold"
              validate={(v) => (v.length < 1 ? "Name is required" : null)}
            />
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <InlineTextField
                value={project.date || ""}
                onSave={(value) => onUpdateField(project.id, "date", value)}
                placeholder="Add date"
              />
            </div>
          </div>
          <InlineTextField
            value={project.url || ""}
            onSave={(value) => onUpdateField(project.id, "url", value)}
            placeholder="Add URL"
            className="text-sm text-muted-foreground"
          />

          {/* Project Skills */}
          <div className="pt-1">
            <SkillsCombobox
              skills={allSkills}
              selectedSkillIds={selectedSkillIds}
              onToggleSkill={handleToggleSkill}
              placeholder="Add skills..."
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive opacity-0 hover:text-destructive group-hover:opacity-100"
          onClick={() => onDelete(project.id)}
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
                Bullet Points ({project.bullets?.length || 0})
              </span>
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddBullet(project.id)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Bullet
          </Button>
        </div>
        <CollapsibleContent className="mt-2">
          <ul className="space-y-3">
            {project.bullets?.map((bullet: ProfileBullet) => (
              <BulletItem
                key={bullet.id}
                bullet={bullet}
                allSkills={allSkills}
                onUpdate={onUpdateBullet}
                onUpdateSkills={onUpdateBulletSkills}
                onDelete={onDeleteBullet}
              />
            ))}
            {(!project.bullets || project.bullets.length === 0) && (
              <li className="py-2 text-sm text-muted-foreground">
                No bullet points yet. Add one to describe what you did.
              </li>
            )}
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
        {/* Tags Button */}
        {/* <Button
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
        {isEditingTags && (
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
        )}
      </div>
    </li>
  );
}
