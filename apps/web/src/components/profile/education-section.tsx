"use client";

import { useState } from "react";
import { ProfileEducation } from "@tailor.me/shared";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { InlineTextField } from "./inline-text-field";
import {
  useCreateEducationMutation,
  useUpdateEducationMutation,
  useDeleteEducationMutation,
} from "@/store/api/profile/queries";
import { BookOpen, ChevronsUpDown, GraduationCap, MapPin, Plus, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

interface EducationSectionProps {
  education: ProfileEducation[];
  isLoading?: boolean;
}

export function EducationSection({
  education,
  isLoading,
}: EducationSectionProps) {
  const [createEducation, { isLoading: isCreating }] =
    useCreateEducationMutation();
  const [updateEducation] = useUpdateEducationMutation();
  const [deleteEducation] = useDeleteEducationMutation();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEducation, setNewEducation] = useState({
    institution: "",
    degree: "",
    location: "",
    graduationDate: "",
  });

  const handleCreateEducation = async () => {
    if (!newEducation.institution || !newEducation.degree) return;
    await createEducation({
      institution: newEducation.institution,
      degree: newEducation.degree,
      location: newEducation.location || null,
      graduationDate: newEducation.graduationDate || null,
    });
    setNewEducation({ institution: "", degree: "", location: "", graduationDate: "" });
    setIsAddingNew(false);
  };

  const handleUpdateField = async (
    id: string,
    field: string,
    value: string | string[]
  ) => {
    await updateEducation({
      id,
      data: { [field]: Array.isArray(value) ? value : value || null },
    });
  };

  const handleAddCoursework = async (id: string, currentCoursework: string[], newCourse: string) => {
    if (!newCourse.trim()) return;
    const updated = [...currentCoursework, newCourse.trim()];
    await updateEducation({
      id,
      data: { coursework: updated },
    });
  };

  const handleRemoveCoursework = async (id: string, currentCoursework: string[], courseToRemove: string) => {
    const updated = currentCoursework.filter((c) => c !== courseToRemove);
    await updateEducation({
      id,
      data: { coursework: updated },
    });
  };

  const handleDeleteEducation = async (id: string) => {
    if (confirm("Are you sure you want to delete this education?")) {
      await deleteEducation(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Education
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
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
            <GraduationCap className="h-5 w-5" />
            Education
          </CardTitle>
          <CardDescription>Your educational background</CardDescription>
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
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <Input
              placeholder="Institution name"
              value={newEducation.institution}
              onChange={(e) =>
                setNewEducation({ ...newEducation, institution: e.target.value })
              }
            />
            <Input
              placeholder="Degree (e.g., B.S. Computer Science)"
              value={newEducation.degree}
              onChange={(e) =>
                setNewEducation({ ...newEducation, degree: e.target.value })
              }
            />
            <Input
              placeholder="Location (e.g., Cambridge, MA)"
              value={newEducation.location}
              onChange={(e) =>
                setNewEducation({ ...newEducation, location: e.target.value })
              }
            />
            <Input
              type="month"
              placeholder="Graduation date"
              value={newEducation.graduationDate}
              onChange={(e) =>
                setNewEducation({
                  ...newEducation,
                  graduationDate: e.target.value,
                })
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
                onClick={handleCreateEducation}
                disabled={
                  isCreating ||
                  !newEducation.institution ||
                  !newEducation.degree
                }
              >
                Add Education
              </Button>
            </div>
          </div>
        )}

        {education.map((edu) => (
          <EducationCard
            key={edu.id}
            edu={edu}
            onUpdateField={handleUpdateField}
            onAddCoursework={handleAddCoursework}
            onRemoveCoursework={handleRemoveCoursework}
            onDelete={handleDeleteEducation}
          />
        ))}

        {education.length === 0 && !isAddingNew && (
          <p className="text-center text-muted-foreground py-8">
            No education added yet. Click &quot;Add&quot; to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface EducationCardProps {
  edu: ProfileEducation;
  onUpdateField: (id: string, field: string, value: string | string[]) => void;
  onAddCoursework: (id: string, currentCoursework: string[], newCourse: string) => void;
  onRemoveCoursework: (id: string, currentCoursework: string[], courseToRemove: string) => void;
  onDelete: (id: string) => void;
}

function EducationCard({
  edu,
  onUpdateField,
  onAddCoursework,
  onRemoveCoursework,
  onDelete,
}: EducationCardProps) {
  const [newCourse, setNewCourse] = useState("");

  const handleAddCourse = () => {
    if (newCourse.trim()) {
      onAddCoursework(edu.id, edu.coursework || [], newCourse.trim());
      setNewCourse("");
    }
  };

  return (
    <div className="group rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <InlineTextField
            value={edu.degree}
            onSave={(value) => onUpdateField(edu.id, "degree", value)}
            className="text-lg font-semibold"
            validate={(v) => (v.length < 1 ? "Degree is required" : null)}
          />
          <InlineTextField
            value={edu.institution}
            onSave={(value) => onUpdateField(edu.id, "institution", value)}
            className="text-muted-foreground"
            validate={(v) => (v.length < 1 ? "Institution is required" : null)}
          />
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <InlineTextField
              value={edu.location || ""}
              onSave={(value) => onUpdateField(edu.id, "location", value)}
              placeholder="Add location"
            />
          </div>
          <InlineTextField
            value={edu.graduationDate || ""}
            onSave={(value) => onUpdateField(edu.id, "graduationDate", value)}
            placeholder="Graduation date"
            className="text-sm text-muted-foreground"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
          onClick={() => onDelete(edu.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Coursework */}
      <Collapsible defaultOpen={false} className="mt-4">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 px-2">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm font-medium">
                Coursework ({edu.coursework?.length || 0})
              </span>
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="space-y-2">
            {/* Add new coursework input */}
            <div className="flex items-center gap-2">
              <Input
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCourse();
                  }
                }}
                placeholder="Add coursework..."
                className="h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddCourse}
                disabled={!newCourse.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Coursework list */}
            <div className="flex flex-wrap gap-2">
              {edu.coursework?.map((course) => (
                <Badge
                  key={course}
                  variant="secondary"
                  className="group/course cursor-pointer text-sm"
                >
                  {course}
                  <button
                    className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                    onClick={() => onRemoveCoursework(edu.id, edu.coursework || [], course)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {(!edu.coursework || edu.coursework.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No coursework added yet.
                </p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

