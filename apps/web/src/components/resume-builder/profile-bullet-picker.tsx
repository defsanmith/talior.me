"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProfileBullet } from "@tailor.me/shared";
import { BookOpen } from "lucide-react";
import { useState } from "react";
import { ResumeBullet } from "./types";

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface ProfileBulletPickerProps {
  /** All bullets from the matching profile entry */
  profileBullets: ProfileBullet[];
  /** Current bullets already on this resume item (used to filter duplicates) */
  existingBullets: ResumeBullet[];
  /** Called with new bullets to append */
  onAddBullets: (bullets: ResumeBullet[]) => void;
}

export function ProfileBulletPicker({
  profileBullets,
  existingBullets,
  onAddBullets,
}: ProfileBulletPickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filter out bullets whose content is already present in the resume entry
  const existingTexts = new Set(
    existingBullets.map((b) => b.text.trim().toLowerCase()),
  );
  const available = profileBullets.filter(
    (b) => !existingTexts.has(b.content.trim().toLowerCase()),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(available.map((b) => b.id)));
  const selectNone = () => setSelected(new Set());

  const handleAdd = () => {
    if (selected.size === 0) return;

    const newBullets: ResumeBullet[] = available
      .filter((b) => selected.has(b.id))
      .map((b, i) => ({
        id: generateId("bullet"),
        text: b.content,
        visible: true,
        order: existingBullets.length + i,
      }));

    onAddBullets(newBullets);
    setSelected(new Set());
    setOpen(false);
  };

  if (available.length === 0) return null;

  const allSelected =
    available.length > 0 && available.every((b) => selected.has(b.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="mt-1 w-full justify-start text-emerald-500 hover:text-emerald-400"
        >
          <BookOpen className="mr-2 h-3 w-3" />
          Add bullet from profile ({available.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[400px] w-[460px] overflow-y-auto p-3"
        align="start"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Profile Bullets
            </p>
            <button
              type="button"
              onClick={allSelected ? selectNone : selectAll}
              className="text-xs text-emerald-500 hover:underline"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="space-y-1.5">
            {available.map((b) => (
              <label
                key={b.id}
                className="flex cursor-pointer items-start gap-2 rounded p-1.5 hover:bg-zinc-800/50"
              >
                <Checkbox
                  checked={selected.has(b.id)}
                  onCheckedChange={() => toggle(b.id)}
                  className="mt-0.5 shrink-0"
                />
                <span className="text-sm leading-relaxed">{b.content}</span>
              </label>
            ))}
          </div>

          <Button
            size="sm"
            className="mt-2 w-full"
            disabled={selected.size === 0}
            onClick={handleAdd}
          >
            Add{" "}
            {selected.size > 0
              ? `${selected.size} bullet${selected.size !== 1 ? "s" : ""}`
              : "Bullets"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
