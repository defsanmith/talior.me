"use client";

import { useState } from "react";
import { ProfileEducation } from "@tailor.me/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineTextField } from "./inline-text-field";
import {
  useCreateEducationMutation,
  useUpdateEducationMutation,
  useDeleteEducationMutation,
} from "@/store/api/profile/queries";
import { GraduationCap, MapPin, Plus, Trash2 } from "lucide-react";
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
    value: string
  ) => {
    await updateEducation({
      id,
      data: { [field]: value || null },
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
          <div
            key={edu.id}
            className="group rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <InlineTextField
                  value={edu.degree}
                  onSave={(value) => handleUpdateField(edu.id, "degree", value)}
                  className="text-lg font-semibold"
                  validate={(v) => (v.length < 1 ? "Degree is required" : null)}
                />
                <InlineTextField
                  value={edu.institution}
                  onSave={(value) =>
                    handleUpdateField(edu.id, "institution", value)
                  }
                  className="text-muted-foreground"
                  validate={(v) =>
                    v.length < 1 ? "Institution is required" : null
                  }
                />
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <InlineTextField
                    value={edu.location || ""}
                    onSave={(value) =>
                      handleUpdateField(edu.id, "location", value)
                    }
                    placeholder="Add location"
                  />
                </div>
                <InlineTextField
                  value={edu.graduationDate || ""}
                  onSave={(value) =>
                    handleUpdateField(edu.id, "graduationDate", value)
                  }
                  placeholder="Graduation date"
                  className="text-sm text-muted-foreground"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                onClick={() => handleDeleteEducation(edu.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
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

