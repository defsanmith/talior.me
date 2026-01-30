export enum JobStatus {
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum AIProvider {
  OPENAI = "OPENAI",
  GEMINI = "GEMINI",
}

export enum JobStage {
  PARSING_JD = "Parsing job description",
  RETRIEVING_BULLETS = "Retrieving candidate bullets",
  SELECTING_BULLETS = "Selecting best bullets",
  REWRITING_BULLETS = "Rewriting bullets",
  VERIFYING = "Verifying rewrites",
  ASSEMBLING = "Assembling resume",
  COMPLETED = "Completed",
  FAILED = "Failed",
}

export enum ApplicationStatus {
  READY_TO_APPLY = "READY_TO_APPLY",
  APPLIED = "APPLIED",
  INTERVIEWING = "INTERVIEWING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  NOT_MOVING_FORWARD = "NOT_MOVING_FORWARD",
  ARCHIVED = "ARCHIVED",
}
