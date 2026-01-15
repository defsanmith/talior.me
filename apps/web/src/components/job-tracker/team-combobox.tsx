"use client";

import { Button } from "@/components/ui/button";
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
import { useCreateTeamMutation } from "@/store/api/tracker/mutations";
import { useGetTeamsQuery } from "@/store/api/tracker/queries";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useState } from "react";

interface TeamComboboxProps {
  value?: string;
  onChange: (teamId: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function TeamCombobox({
  value,
  onChange,
  placeholder = "Select team...",
  className,
}: TeamComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: teamsResponse } = useGetTeamsQuery();
  const [createTeam, { isLoading: isCreating }] = useCreateTeamMutation();

  const teams = teamsResponse?.data || [];
  const selectedTeam = teams.find((t) => t.id === value);

  const handleSelect = (teamId: string) => {
    onChange(teamId === value ? undefined : teamId);
    setOpen(false);
    setSearch("");
  };

  const handleCreateNew = async () => {
    if (!search.trim() || isCreating) return;

    try {
      const result = await createTeam({ name: search.trim() }).unwrap();
      if (result.data) {
        onChange(result.data.id);
        setSearch("");
        setOpen(false);
      }
    } catch (error) {
      console.error("Failed to create team:", error);
    }
  };

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(search.toLowerCase()),
  );

  const showCreateOption =
    search.trim() &&
    !filteredTeams.some(
      (t) => t.name.toLowerCase() === search.trim().toLowerCase(),
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <span className="truncate">
            {selectedTeam ? selectedTeam.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search teams..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No teams found.</CommandEmpty>
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
              {filteredTeams.map((team) => (
                <CommandItem
                  key={team.id}
                  value={team.name}
                  onSelect={() => handleSelect(team.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === team.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {team.name}
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
