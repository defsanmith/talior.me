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
import { useCreateCompanyMutation } from "@/store/api/tracker/mutations";
import { useGetCompaniesQuery } from "@/store/api/tracker/queries";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useState } from "react";

interface CompanyComboboxProps {
  value?: string;
  onChange: (companyId: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function CompanyCombobox({
  value,
  onChange,
  placeholder = "Select company...",
  className,
}: CompanyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: companiesResponse } = useGetCompaniesQuery();
  const [createCompany, { isLoading: isCreating }] = useCreateCompanyMutation();

  const companies = companiesResponse?.data || [];
  const selectedCompany = companies.find((c) => c.id === value);

  const handleSelect = (companyId: string) => {
    onChange(companyId === value ? undefined : companyId);
    setOpen(false);
    setSearch("");
  };

  const handleCreateNew = async () => {
    if (!search.trim() || isCreating) return;

    try {
      const result = await createCompany({ name: search.trim() }).unwrap();
      if (result.data) {
        onChange(result.data.id);
        setSearch("");
        setOpen(false);
      }
    } catch (error) {
      console.error("Failed to create company:", error);
    }
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(search.toLowerCase()),
  );

  const showCreateOption =
    search.trim() &&
    !filteredCompanies.some(
      (c) => c.name.toLowerCase() === search.trim().toLowerCase(),
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
            {selectedCompany ? selectedCompany.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search companies..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No companies found.</CommandEmpty>
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
              {filteredCompanies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.name}
                  onSelect={() => handleSelect(company.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === company.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {company.name}
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
