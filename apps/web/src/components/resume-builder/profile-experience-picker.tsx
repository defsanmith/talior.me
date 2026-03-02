"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProfileExperience } from "@tailor.me/shared";
import { UserCircle } from "lucide-react";
import { useState } from "react";
import { ResumeBullet, ResumeExperience } from "./types";

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function profileExpToResumeExp(
  exp: ProfileExperience,
  selectedBulletIds: Set<string>,
  order: number,
): ResumeExperience {
  const bullets: ResumeBullet[] = exp.bullets
    .filter((b) => selectedBulletIds.has(b.id))
    .map((b, idx) => ({
      id: generateId("bullet"),
      text: b.content,
      visible: true,
      order: idx,
    }));

  return {
    id: generateId("exp"),
    company: exp.company,
    title: exp.title,
    location: exp.location ?? null,
    startDate: exp.startDate,
    endDate: exp.endDate ?? null,
    bullets,
    visible: true,
    order,
  };
}

interface ProfileExperiencePickerProps {
  profileExperiences: ProfileExperience[];
  resumeExperiences: ResumeExperience[];
  onAdd: (entry: ResumeExperience) => void;
}

export function ProfileExperiencePicker({
  profileExperiences,
  resumeExperiences,
  onAdd,
}: ProfileExperiencePickerProps) {
  const [open, setOpen] = useState(false);
  // Map of experienceId → Set of selected bullet ids
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});

  // Profile experiences whose company+title aren't already represented on the resume
  const available = profileExperiences.filter(
    (pe) =>
      !resumeExperiences.some(
        (re) => re.company === pe.company && re.title === pe.title,
      ),
  );

  const toggleBullet = (expId: string, bulletId: string) => {
    setSelections((prev) => {
      const current = new Set(prev[expId] ?? []);
      if (current.has(bulletId)) {
        current.delete(bulletId);
      } else {
        current.add(bulletId);
      }
      return { ...prev, [expId]: current };
    });
  };

  const selectAll = (expId: string, exp: ProfileExperience) => {
    setSelections((prev) => ({
      ...prev,
      [expId]: new Set(exp.bullets.map((b) => b.id)),
    }));
  };

  const selectNone = (expId: string) => {
    setSelections((prev) => ({ ...prev, [expId]: new Set() }));
  };

  const handleAdd = (exp: ProfileExperience) => {
    const selected =
      selections[exp.id] ?? new Set(exp.bullets.map((b) => b.id));
    const entry = profileExpToResumeExp(
      exp,
      selected,
      resumeExperiences.length,
    );
    onAdd(entry);
    // Remove from selections after adding
    setSelections((prev) => {
      const next = { ...prev };
      delete next[exp.id];
      return next;
    });
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
        className="max-h-[480px] w-96 overflow-y-auto p-3"
        align="start"
      >
        {available.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">
            All profile experiences are already on your resume.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Profile Experiences
            </p>
            {available.map((exp) => {
              const bulletSel =
                selections[exp.id] ?? new Set(exp.bullets.map((b) => b.id));
              const allSelected =
                exp.bullets.length > 0 &&
                exp.bullets.every((b) => bulletSel.has(b.id));
              return (
                <div key={exp.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {exp.title}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {exp.company} · {exp.startDate} –{" "}
                        {exp.endDate ?? "Present"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 shrink-0 text-xs"
                      onClick={() => handleAdd(exp)}
                    >
                      Add
                    </Button>
                  </div>

                  {exp.bullets.length > 0 && (
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Bullets</span>
                        <button
                          type="button"
                          onClick={() =>
                            allSelected
                              ? selectNone(exp.id)
                              : selectAll(exp.id, exp)
                          }
                          className="text-xs text-emerald-500 hover:underline"
                        >
                          {allSelected ? "Deselect all" : "Select all"}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {exp.bullets.map((b) => (
                          <label
                            key={b.id}
                            className="flex cursor-pointer items-start gap-2"
                          >
                            <Checkbox
                              checked={bulletSel.has(b.id)}
                              onCheckedChange={() => toggleBullet(exp.id, b.id)}
                              className="mt-0.5 shrink-0"
                            />
                            <span className="text-xs leading-relaxed text-zinc-300">
                              {b.content}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
