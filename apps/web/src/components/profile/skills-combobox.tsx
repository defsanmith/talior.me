"use client";

import { useState } from "react";
import { ProfileSkill } from "@tailor.me/shared";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface SkillsComboboxProps {
  skills: ProfileSkill[];
  selectedSkillIds: string[];
  onToggleSkill: (skillId: string) => void;
  placeholder?: string;
  className?: string;
}

export function SkillsCombobox({
  skills,
  selectedSkillIds,
  onToggleSkill,
  placeholder = "Select skills...",
  className,
}: SkillsComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleToggleSkill = (skillId: string) => {
    onToggleSkill(skillId);
    setSearch("");
  };

  // Group skills by category
  const groupedSkills = skills.reduce(
    (acc, skill) => {
      const categoryName = skill.category?.name || "Other";
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(skill);
      return acc;
    },
    {} as Record<string, ProfileSkill[]>,
  );

  const selectedSkills = skills.filter((s) => selectedSkillIds.includes(s.id));

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-7 px-2 text-xs justify-between min-w-[120px]"
          >
            <span className="truncate">
              {selectedSkillIds.length === 0
                ? placeholder
                : `${selectedSkillIds.length} skill${selectedSkillIds.length > 1 ? "s" : ""}`}
            </span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search skills..."
              className="h-9"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No skills found.</CommandEmpty>
              {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                <CommandGroup key={category} heading={category}>
                  {categorySkills.map((skill) => {
                    const isSelected = selectedSkillIds.includes(skill.id);
                    return (
                      <CommandItem
                        key={skill.id}
                        value={skill.name}
                        onSelect={() => handleToggleSkill(skill.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {skill.name}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display selected skills as badges */}
      {selectedSkills.map((skill) => (
        <Badge
          key={skill.id}
          variant="secondary"
          className="group/skill cursor-pointer text-xs h-6"
        >
          {skill.name}
          <button
            className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
            onClick={() => onToggleSkill(skill.id)}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

