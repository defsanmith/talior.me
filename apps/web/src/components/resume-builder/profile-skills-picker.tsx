"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProfileSkillCategory } from "@tailor.me/shared";
import { UserCircle } from "lucide-react";
import { useState } from "react";
import { ResumeSkillCategory, ResumeSkillItem } from "./types";

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Merges selected skills (grouped by profile category name) into the existing
 * resume skill categories.  If a matching category already exists it appends;
 * otherwise a new category is created.
 */
function mergeSkillsIntoCategories(
  existing: ResumeSkillCategory[],
  selectedSkillIds: Set<string>,
  profileCategories: ProfileSkillCategory[],
): ResumeSkillCategory[] {
  const result: ResumeSkillCategory[] = existing.map((c) => ({
    ...c,
    skills: [...c.skills],
  }));

  for (const profCat of profileCategories) {
    const selectedSkills = profCat.skills.filter((s) =>
      selectedSkillIds.has(s.id),
    );
    if (selectedSkills.length === 0) continue;

    const existingCat = result.find(
      (c) => c.name.toLowerCase() === profCat.name.toLowerCase(),
    );

    if (existingCat) {
      const newItems: ResumeSkillItem[] = selectedSkills.map((s) => ({
        id: generateId("skill"),
        name: s.name,
        visible: true,
      }));
      existingCat.skills = [...existingCat.skills, ...newItems];
    } else {
      const newCat: ResumeSkillCategory = {
        id: generateId("cat"),
        name: profCat.name,
        skills: selectedSkills.map((s) => ({
          id: generateId("skill"),
          name: s.name,
          visible: true,
        })),
        visible: true,
        order: result.length,
      };
      result.push(newCat);
    }
  }

  return result;
}

interface ProfileSkillsPickerProps {
  profileSkillCategories: ProfileSkillCategory[];
  resumeSkillCategories: ResumeSkillCategory[];
  onAdd: (updatedCategories: ResumeSkillCategory[]) => void;
}

export function ProfileSkillsPicker({
  profileSkillCategories,
  resumeSkillCategories,
  onAdd,
}: ProfileSkillsPickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Skills already on the resume (by name, case-insensitive)
  const existingSkillNames = new Set(
    resumeSkillCategories.flatMap((c) =>
      c.skills.map((s) => s.name.toLowerCase()),
    ),
  );

  // Only show categories that have at least one new skill to add
  const availableCategories = profileSkillCategories
    .map((cat) => ({
      ...cat,
      skills: cat.skills.filter(
        (s) => !existingSkillNames.has(s.name.toLowerCase()),
      ),
    }))
    .filter((cat) => cat.skills.length > 0);

  const toggleSkill = (skillId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  const toggleCategory = (cat: (typeof availableCategories)[number]) => {
    const allSelected = cat.skills.every((s) => selected.has(s.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        cat.skills.forEach((s) => next.delete(s.id));
      } else {
        cat.skills.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const handleAdd = () => {
    if (selected.size === 0) return;
    const updated = mergeSkillsIntoCategories(
      resumeSkillCategories,
      selected,
      profileSkillCategories,
    );
    onAdd(updated);
    setSelected(new Set());
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
        {availableCategories.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">
            All profile skills are already on your resume.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Profile Skills
            </p>

            {availableCategories.map((cat) => {
              const allSelected = cat.skills.every((s) => selected.has(s.id));
              return (
                <div key={cat.id} className="space-y-1.5">
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    <span className="text-sm font-medium">{cat.name}</span>
                  </label>
                  <div className="ml-6 flex flex-wrap gap-1.5">
                    {cat.skills.map((skill) => (
                      <label
                        key={skill.id}
                        className="flex cursor-pointer items-center gap-1"
                      >
                        <Checkbox
                          checked={selected.has(skill.id)}
                          onCheckedChange={() => toggleSkill(skill.id)}
                          className="h-3.5 w-3.5"
                        />
                        <span
                          className={`rounded border px-1.5 py-0.5 text-xs ${
                            selected.has(skill.id)
                              ? "border-emerald-600 bg-emerald-900/40 text-emerald-300"
                              : "border-zinc-700 bg-zinc-800 text-zinc-300"
                          }`}
                        >
                          {skill.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            <Button
              size="sm"
              className="w-full"
              disabled={selected.size === 0}
              onClick={handleAdd}
            >
              Add{" "}
              {selected.size > 0
                ? `${selected.size} skill${selected.size !== 1 ? "s" : ""}`
                : "Skills"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
