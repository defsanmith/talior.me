"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProfileProject } from "@tailor.me/shared";
import { UserCircle } from "lucide-react";
import { useState } from "react";
import { ResumeBullet, ResumeProject } from "./types";

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function profileProjectToResumeProject(
  proj: ProfileProject,
  selectedBulletIds: Set<string>,
  order: number,
): ResumeProject {
  const bullets: ResumeBullet[] = proj.bullets
    .filter((b) => selectedBulletIds.has(b.id))
    .map((b, idx) => ({
      id: generateId("bullet"),
      text: b.content,
      visible: true,
      order: idx,
    }));

  return {
    id: generateId("proj"),
    name: proj.name,
    date: proj.date ?? null,
    url: proj.url ?? null,
    tech: proj.skills.map((s) => s.skill.name),
    bullets,
    visible: true,
    order,
  };
}

interface ProfileProjectPickerProps {
  profileProjects: ProfileProject[];
  resumeProjects: ResumeProject[];
  onAdd: (entry: ResumeProject) => void;
}

export function ProfileProjectPicker({
  profileProjects,
  resumeProjects,
  onAdd,
}: ProfileProjectPickerProps) {
  const [open, setOpen] = useState(false);
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});

  const available = profileProjects.filter(
    (pp) => !resumeProjects.some((rp) => rp.name === pp.name),
  );

  const toggleBullet = (projId: string, bulletId: string) => {
    setSelections((prev) => {
      const current = new Set(prev[projId] ?? []);
      if (current.has(bulletId)) {
        current.delete(bulletId);
      } else {
        current.add(bulletId);
      }
      return { ...prev, [projId]: current };
    });
  };

  const selectAll = (projId: string, proj: ProfileProject) => {
    setSelections((prev) => ({
      ...prev,
      [projId]: new Set(proj.bullets.map((b) => b.id)),
    }));
  };

  const selectNone = (projId: string) => {
    setSelections((prev) => ({ ...prev, [projId]: new Set() }));
  };

  const handleAdd = (proj: ProfileProject) => {
    const selected =
      selections[proj.id] ?? new Set(proj.bullets.map((b) => b.id));
    const entry = profileProjectToResumeProject(
      proj,
      selected,
      resumeProjects.length,
    );
    onAdd(entry);
    setSelections((prev) => {
      const next = { ...prev };
      delete next[proj.id];
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
            All profile projects are already on your resume.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Profile Projects
            </p>
            {available.map((proj) => {
              const bulletSel =
                selections[proj.id] ?? new Set(proj.bullets.map((b) => b.id));
              const allSelected =
                proj.bullets.length > 0 &&
                proj.bullets.every((b) => bulletSel.has(b.id));
              return (
                <div key={proj.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {proj.name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {proj.skills.map((s) => (
                          <span
                            key={s.id}
                            className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300"
                          >
                            {s.skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 shrink-0 text-xs"
                      onClick={() => handleAdd(proj)}
                    >
                      Add
                    </Button>
                  </div>

                  {proj.bullets.length > 0 && (
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Bullets</span>
                        <button
                          type="button"
                          onClick={() =>
                            allSelected
                              ? selectNone(proj.id)
                              : selectAll(proj.id, proj)
                          }
                          className="text-xs text-emerald-500 hover:underline"
                        >
                          {allSelected ? "Deselect all" : "Select all"}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {proj.bullets.map((b) => (
                          <label
                            key={b.id}
                            className="flex cursor-pointer items-start gap-2"
                          >
                            <Checkbox
                              checked={bulletSel.has(b.id)}
                              onCheckedChange={() =>
                                toggleBullet(proj.id, b.id)
                              }
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
