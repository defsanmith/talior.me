"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProfileEducation } from "@tailor.me/shared";
import { UserCircle } from "lucide-react";
import { useState } from "react";
import { ResumeCoursework, ResumeEducation } from "./types";

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function profileEduToResumeEdu(
  edu: ProfileEducation,
  order: number,
): ResumeEducation {
  const coursework: ResumeCoursework[] = edu.coursework.map((name) => ({
    id: generateId("cw"),
    name,
    visible: true,
  }));

  return {
    id: generateId("edu"),
    institution: edu.institution,
    degree: edu.degree,
    location: edu.location ?? null,
    graduationDate: edu.graduationDate ?? null,
    coursework,
    visible: true,
    order,
  };
}

interface ProfileEducationPickerProps {
  profileEducation: ProfileEducation[];
  resumeEducation: ResumeEducation[];
  onAdd: (entry: ResumeEducation) => void;
}

export function ProfileEducationPicker({
  profileEducation,
  resumeEducation,
  onAdd,
}: ProfileEducationPickerProps) {
  const [open, setOpen] = useState(false);

  const available = profileEducation.filter(
    (pe) =>
      !resumeEducation.some(
        (re) => re.institution === pe.institution && re.degree === pe.degree,
      ),
  );

  const handleAdd = (edu: ProfileEducation) => {
    onAdd(profileEduToResumeEdu(edu, resumeEducation.length));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          <UserCircle className="mr-2 h-4 w-4" />
          Add from Profile
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[480px] w-80 overflow-y-auto p-3"
        align="start"
      >
        {available.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">
            All profile education entries are already on your resume.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Profile Education
            </p>
            {available.map((edu) => (
              <div key={edu.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium leading-tight">
                      {edu.degree}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {edu.institution}
                      {edu.graduationDate ? ` · ${edu.graduationDate}` : ""}
                    </p>
                    {edu.coursework.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {edu.coursework.map((cw, i) => (
                          <span
                            key={i}
                            className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300"
                          >
                            {cw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 shrink-0 text-xs"
                    onClick={() => handleAdd(edu)}
                  >
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
