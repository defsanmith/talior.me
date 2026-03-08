"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResumePreset } from "@tailor.me/shared";

interface PresetSelectorProps {
  presets: ResumePreset[];
  value: string;
  onChange: (id: string) => void;
}

export function PresetSelector({
  presets,
  value,
  onChange,
}: PresetSelectorProps) {
  if (!presets.length) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        // data-slot lets ButtonGroup apply connected border styling
        data-slot="select-trigger"
        className="h-8 text-xs shadow-none"
      >
        <SelectValue placeholder="Select preset…" />
      </SelectTrigger>
      <SelectContent>
        {presets.map((p) => (
          <SelectItem key={p.id} value={p.id} className="text-xs">
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
