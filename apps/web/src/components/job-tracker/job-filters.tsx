import { CompanyCombobox } from "@/components/job-tracker/company-combobox";
import { PositionCombobox } from "@/components/job-tracker/position-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicationStatus } from "@tailor.me/shared";

interface JobFiltersProps {
  statusFilter: string;
  companyFilter: string;
  positionFilter: string;
  sortBy: string;
  onFilterChange: (key: string, value: string) => void;
}

export function JobFilters({
  statusFilter,
  companyFilter,
  positionFilter,
  sortBy,
  onFilterChange,
}: JobFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-4">
      <div>
        <Select
          value={statusFilter}
          onValueChange={(value) => onFilterChange("status", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value={ApplicationStatus.READY_TO_APPLY}>
              Ready to Apply
            </SelectItem>
            <SelectItem value={ApplicationStatus.APPLIED}>Applied</SelectItem>
            <SelectItem value={ApplicationStatus.INTERVIEWING}>
              Interviewing
            </SelectItem>
            <SelectItem value={ApplicationStatus.ACCEPTED}>Accepted</SelectItem>
            <SelectItem value={ApplicationStatus.REJECTED}>Rejected</SelectItem>
            <SelectItem value={ApplicationStatus.NOT_MOVING_FORWARD}>
              Not Moving Forward
            </SelectItem>
            <SelectItem value={ApplicationStatus.ARCHIVED}>Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <CompanyCombobox
          value={companyFilter}
          onChange={(value) => onFilterChange("company", value || "")}
          className="w-full"
        />
      </div>

      <div>
        <PositionCombobox
          value={positionFilter}
          onChange={(value) => onFilterChange("position", value || "")}
          className="w-full"
        />
      </div>

      <div>
        <Select
          value={sortBy}
          onValueChange={(value) => onFilterChange("sortBy", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Created Date</SelectItem>
            <SelectItem value="applicationDate">Application Date</SelectItem>
            <SelectItem value="updatedAt">Updated Date</SelectItem>
            {/* <SelectItem value="priority">Priority</SelectItem> */}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
