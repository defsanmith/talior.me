"use client";

import { CompanyCombobox } from "@/components/job-tracker/company-combobox";
import { PositionCombobox } from "@/components/job-tracker/position-combobox";
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
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ApplicationStatus } from "@tailor.me/shared";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useState } from "react";

interface JobFiltersProps {
  statusFilter: string;
  companyFilter: string;
  positionFilter: string;
  trackingFilter: string;
  sortBy: string;
  onFilterChange: (key: string, value: string) => void;
}

const STATUS_OPTIONS = [
  { value: ApplicationStatus.READY_TO_APPLY, label: "Ready to Apply" },
  { value: ApplicationStatus.APPLIED, label: "Applied" },
  { value: ApplicationStatus.INTERVIEWING, label: "Interviewing" },
  { value: ApplicationStatus.ACCEPTED, label: "Accepted" },
  { value: ApplicationStatus.REJECTED, label: "Rejected" },
  { value: ApplicationStatus.NOT_MOVING_FORWARD, label: "Not Moving Forward" },
  { value: ApplicationStatus.ARCHIVED, label: "Archived" },
];

function StatusCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = STATUS_OPTIONS.find((o) => o.value === value);
  const isFiltered = value && value !== "all";

  const filtered = STATUS_OPTIONS.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
        >
          <span className={cn("flex-1 truncate text-left", !isFiltered && "text-muted-foreground")}>
            {selected ? selected.label : "All statuses"}
          </span>
          {isFiltered ? (
            <span
              role="button"
              aria-label="Clear status filter"
              className="ml-2 shrink-0 rounded-sm opacity-40 hover:opacity-100 transition-opacity"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onChange("all");
                setOpen(false);
              }}
            >
              <X className="h-4 w-4" />
            </span>
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search statuses..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No status found.</CommandEmpty>
            <CommandGroup>
              {isFiltered && (
                <>
                  <CommandItem
                    onSelect={() => {
                      onChange("all");
                      setOpen(false);
                      setSearch("");
                    }}
                    className="text-muted-foreground"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear filter
                  </CommandItem>
                  <CommandSeparator />
                </>
              )}
              {filtered.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value === value ? "all" : option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function JobFilters({
  statusFilter,
  companyFilter,
  positionFilter,
  trackingFilter,
  sortBy,
  onFilterChange,
}: JobFiltersProps) {
  const handleTrackingInput = (raw: string) => {
    let slug = raw;
    try {
      const url = new URL(raw);
      slug = url.pathname.split("/").filter(Boolean).pop() ?? raw;
    } catch {
      // bare slug or partial — use as-is
    }
    onFilterChange("tracking", slug);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <StatusCombobox
        value={statusFilter}
        onChange={(value) => onFilterChange("status", value)}
      />

      <CompanyCombobox
        value={companyFilter}
        onChange={(value) => onFilterChange("company", value || "")}
      />

      <PositionCombobox
        value={positionFilter}
        onChange={(value) => onFilterChange("position", value || "")}
      />

      <Select
        value={sortBy}
        onValueChange={(value) => onFilterChange("sortBy", value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt">Created Date</SelectItem>
          <SelectItem value="applicationDate">Application Date</SelectItem>
          <SelectItem value="updatedAt">Updated Date</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={trackingFilter}
          onChange={(e) => handleTrackingInput(e.target.value)}
          placeholder="Tracking URL or hash…"
          className={cn("h-9 w-48 pl-8 text-xs", trackingFilter && "pr-8")}
        />
        {trackingFilter && (
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50 hover:opacity-100 transition-opacity"
            onClick={() => onFilterChange("tracking", "")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
