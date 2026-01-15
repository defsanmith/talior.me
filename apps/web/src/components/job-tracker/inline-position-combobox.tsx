"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCreatePositionMutation } from "@/store/api/tracker/mutations";
import { useGetPositionsQuery } from "@/store/api/tracker/queries";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";

interface InlinePositionComboboxProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function InlinePositionCombobox({
  value,
  onChange,
  placeholder = "Job Title",
  className,
}: InlinePositionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: positionsResponse } = useGetPositionsQuery();
  const [createPosition, { isLoading: isCreating }] =
    useCreatePositionMutation();

  const positions = positionsResponse?.data || [];
  const selectedPosition = positions.find((p) => p.id === value);

  const handleSelect = (positionId: string) => {
    onChange(positionId === value ? undefined : positionId);
    setOpen(false);
    setSearch("");
  };

  const handleCreateNew = async () => {
    if (!search.trim() || isCreating) return;

    try {
      const result = await createPosition({ title: search.trim() }).unwrap();
      if (result.data) {
        onChange(result.data.id);
        setSearch("");
        setOpen(false);
      }
    } catch (error) {
      console.error("Failed to create position:", error);
    }
  };

  const filteredPositions = positions.filter((position) =>
    position.title.toLowerCase().includes(search.toLowerCase()),
  );

  const showCreateOption =
    search.trim() &&
    !filteredPositions.some(
      (p) => p.title.toLowerCase() === search.trim().toLowerCase(),
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className={cn(
            "cursor-text rounded px-1 hover:bg-primary/10",
            !selectedPosition && "italic text-muted-foreground",
            className,
          )}
        >
          {selectedPosition ? selectedPosition.title : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search positions..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No positions found.</CommandEmpty>
            <CommandGroup>
              {value && (
                <>
                  <CommandItem
                    onSelect={() => {
                      onChange(undefined);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="text-muted-foreground"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear selection
                  </CommandItem>
                  <CommandSeparator />
                </>
              )}
              {filteredPositions.map((position) => (
                <CommandItem
                  key={position.id}
                  value={position.title}
                  onSelect={() => handleSelect(position.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === position.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {position.title}
                </CommandItem>
              ))}
              {showCreateOption && (
                <CommandItem
                  onSelect={handleCreateNew}
                  className="text-primary"
                  disabled={isCreating}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create &quot;{search}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
