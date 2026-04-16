export interface JobData {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
}

export interface StoredJob {
  jobId: string;
  linkedInUrl: string;
  submittedAt: number;
}

export type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type JobStage =
  | "PARSING_JD"
  | "RETRIEVING_BULLETS"
  | "SELECTING_BULLETS"
  | "REWRITING_BULLETS"
  | "VERIFYING"
  | "ASSEMBLING"
  | "COMPLETED";

export type ApplicationStatus =
  | "READY_TO_APPLY"
  | "APPLIED"
  | "INTERVIEWING"
  | "ACCEPTED"
  | "REJECTED"
  | "NOT_MOVING_FORWARD"
  | "ARCHIVED";

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  stage: JobStage | null;
  progress: number;
  applicationStatus: ApplicationStatus;
  company?: { name: string } | null;
  position?: { title: string } | null;
}

// Messages from popup → background
export type BackgroundMessage =
  | { type: "LOGIN"; email: string; password: string }
  | { type: "LOGOUT" }
  | { type: "SUBMIT_JOB"; jobData: JobData }
  | { type: "GET_JOB_STATUS"; jobId: string }
  | { type: "GET_STORED_JOB"; linkedInUrl: string }
  | { type: "CHECK_AUTH" };

// Messages from content → popup (via background)
export type ContentMessage =
  | { type: "JOB_DATA"; data: JobData }
  | { type: "NO_JOB_DATA" };

export interface BackgroundResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
