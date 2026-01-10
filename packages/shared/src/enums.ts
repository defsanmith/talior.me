export enum JobStatus {
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
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
