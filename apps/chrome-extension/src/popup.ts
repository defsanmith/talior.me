import { extractLinkedInJobId } from "./linkedin";
import type {
  BackgroundMessage,
  BackgroundResponse,
  JobData,
  JobStatusResponse,
  StoredJob,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function msg<T = unknown>(
  message: BackgroundMessage,
): Promise<BackgroundResponse<T>> {
  return chrome.runtime.sendMessage(message) as Promise<BackgroundResponse<T>>;
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function showView(id: string) {
  document.querySelectorAll<HTMLElement>(".view").forEach((v) => {
    v.classList.toggle("active", v.id === id);
  });
}

function showError(elId: string, message: string) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.classList.add("visible");
}

function clearError(elId: string) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = "";
  el.classList.remove("visible");
}

const STAGE_LABELS: Record<string, string> = {
  PARSING_JD: "Parsing job description…",
  RETRIEVING_BULLETS: "Retrieving your profile…",
  SELECTING_BULLETS: "Selecting relevant bullets…",
  REWRITING_BULLETS: "Rewriting bullets…",
  VERIFYING: "Verifying accuracy…",
  ASSEMBLING: "Assembling resume…",
  COMPLETED: "Done",
};

const APP_STATUS_LABELS: Record<string, string> = {
  READY_TO_APPLY: "Ready to Apply",
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  NOT_MOVING_FORWARD: "Not Moving Forward",
  ARCHIVED: "Archived",
};

// ─── State ────────────────────────────────────────────────────────────────────

let currentJobData: JobData | null = null;
let currentJobId: string | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

// ─── Current tab URL ──────────────────────────────────────────────────────────

async function getCurrentTabUrl(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ?? null;
}

async function isLinkedInJobsTab(): Promise<boolean> {
  const url = await getCurrentTabUrl();
  return !!url && url.includes("linkedin.com/jobs");
}

// ─── Fetch job data from content script ──────────────────────────────────────

async function fetchJobDataFromTab(): Promise<JobData | null> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return null;
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_JOB_DATA",
    });
    return response as JobData | null;
  } catch {
    return null;
  }
}

// ─── Polling ──────────────────────────────────────────────────────────────────

function stopPolling() {
  if (pollInterval !== null) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function startPolling(jobId: string) {
  stopPolling();
  pollInterval = setInterval(async () => {
    const res = await msg<JobStatusResponse>({
      type: "GET_JOB_STATUS",
      jobId,
    });
    if (res.success && res.data) {
      renderJobStatus(res.data);
      if (res.data.status === "COMPLETED" || res.data.status === "FAILED") {
        stopPolling();
      }
    }
  }, 3000);
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function populateJobMeta(
  prefix: string,
  title: string,
  company: string,
  location: string,
) {
  const titleEl = document.getElementById(`${prefix}-title`);
  const companyEl = document.getElementById(`${prefix}-company`);
  const locationEl = document.getElementById(`${prefix}-location`);
  if (titleEl) titleEl.textContent = title || "Untitled Role";
  if (companyEl) companyEl.textContent = company || "";
  if (locationEl) locationEl.textContent = location || "";
}

function renderJobStatus(job: JobStatusResponse) {
  const status = job.status;

  if (status === "QUEUED" || status === "PROCESSING") {
    populateJobMeta(
      "proc",
      currentJobData?.title ?? "",
      currentJobData?.company ?? job.company?.name ?? "",
      currentJobData?.location ?? "",
    );

    const badge = el("proc-status-badge");
    const statusText = el("proc-status-text");
    if (status === "QUEUED") {
      badge.className = "status-badge queued";
      statusText.textContent = "Queued";
    } else {
      badge.className = "status-badge processing";
      statusText.textContent = "Processing";
    }

    const progress = job.progress ?? 0;
    el("proc-progress-bar").style.width = `${progress}%`;
    el("proc-progress-pct").textContent = `${progress}%`;
    el("proc-stage-label").textContent =
      STAGE_LABELS[job.stage ?? ""] ?? "Starting…";

    showView("view-job-processing");
    return;
  }

  if (status === "COMPLETED") {
    populateJobMeta(
      "done",
      currentJobData?.title ?? "",
      currentJobData?.company ?? job.company?.name ?? "",
      currentJobData?.location ?? "",
    );

    const appLabel =
      APP_STATUS_LABELS[job.applicationStatus] ?? job.applicationStatus;
    el("done-app-status").textContent = appLabel;

    el("btn-open-resume").onclick = () => {
      chrome.tabs.create({
        url: `http://localhost:3000/jobs/${job.id}`,
      });
    };

    showView("view-job-done");
    return;
  }

  if (status === "FAILED") {
    populateJobMeta(
      "failed",
      currentJobData?.title ?? "",
      currentJobData?.company ?? job.company?.name ?? "",
      currentJobData?.location ?? "",
    );
    showView("view-job-failed");
  }
}

// ─── Main init ────────────────────────────────────────────────────────────────

async function init() {
  // Load saved API URL into settings input
  const stored = await chrome.storage.local.get("tailorme_api_url");
  const savedUrl =
    (stored["tailorme_api_url"] as string) ?? "http://localhost:3001";
  el<HTMLInputElement>("input-api-url").value = savedUrl;

  // Check auth
  const authRes = await msg<{ loggedIn: boolean }>({ type: "CHECK_AUTH" });
  const loggedIn = authRes.success && authRes.data?.loggedIn;

  if (!loggedIn) {
    el("btn-logout").style.display = "none";
    el("settings-row").style.display = "none";
    showView("view-login");
    return;
  }

  el("btn-logout").style.display = "block";
  el("settings-row").style.display = "flex";

  const onJobsPage = await isLinkedInJobsTab();
  if (!onJobsPage) {
    showView("view-no-job");
    return;
  }

  // Try to extract job data from the active tab
  currentJobData = await fetchJobDataFromTab();

  const tabUrl = await getCurrentTabUrl();
  const linkedInJobId =
    currentJobData?.linkedInJobId ??
    (tabUrl ? extractLinkedInJobId(tabUrl) : null);

  if (linkedInJobId) {
    // Check if this LinkedIn job was already submitted
    const storedRes = await msg<StoredJob | null>({
      type: "GET_STORED_JOB",
      linkedInJobId,
    });

    if (storedRes.success && storedRes.data) {
      currentJobId = storedRes.data.jobId;
      const statusRes = await msg<JobStatusResponse>({
        type: "GET_JOB_STATUS",
        jobId: currentJobId,
      });
      if (statusRes.success && statusRes.data) {
        renderJobStatus(statusRes.data);
        if (
          statusRes.data.status === "QUEUED" ||
          statusRes.data.status === "PROCESSING"
        ) {
          startPolling(currentJobId);
        }
        return;
      }

      // Remove stale local mapping if backend job no longer exists.
      const stored = await chrome.storage.local.get("tailorme_jobs");
      const jobs = (stored["tailorme_jobs"] as Record<string, unknown>) ?? {};
      delete jobs[linkedInJobId];
      await chrome.storage.local.set({ tailorme_jobs: jobs });
    }
  }

  // Not submitted yet — show the ready-to-submit view
  if (currentJobData) {
    populateJobMeta(
      "ready",
      currentJobData.title,
      currentJobData.company,
      currentJobData.location,
    );
    el("ready-desc").textContent = currentJobData.description.slice(0, 300);
    showView("view-job-ready");
  } else {
    showView("view-no-job");
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────

// Login
el("btn-login").addEventListener("click", async () => {
  clearError("login-error");
  const email = el<HTMLInputElement>("input-email").value.trim();
  const password = el<HTMLInputElement>("input-password").value;

  if (!email || !password) {
    showError("login-error", "Please enter your email and password.");
    return;
  }

  const btn = el<HTMLButtonElement>("btn-login");
  btn.disabled = true;
  btn.textContent = "Signing in…";

  const res = await msg({ type: "LOGIN", email, password });
  btn.disabled = false;
  btn.textContent = "Sign in";

  if (!res.success) {
    showError("login-error", res.error ?? "Login failed");
    return;
  }

  await init();
});

el("input-password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") el("btn-login").click();
});

// Logout
el("btn-logout").addEventListener("click", async () => {
  stopPolling();
  await msg({ type: "LOGOUT" });
  el("btn-logout").style.display = "none";
  el("settings-row").style.display = "none";
  showView("view-login");
});

// Submit job
el("btn-submit").addEventListener("click", async () => {
  if (!currentJobData) return;
  clearError("submit-error");

  if (!currentJobData.linkedInJobId) {
    showError(
      "submit-error",
      "Could not determine LinkedIn job id for this posting. Open the job details and try again.",
    );
    return;
  }

  if (!currentJobData.description || currentJobData.description.length < 10) {
    showError(
      "submit-error",
      "Could not read this job description from LinkedIn yet. Scroll the job details panel, wait a second, and try again.",
    );
    return;
  }

  const btn = el<HTMLButtonElement>("btn-submit");
  btn.disabled = true;
  btn.textContent = "Sending…";

  const res = await msg<{ jobId: string }>({
    type: "SUBMIT_JOB",
    jobData: currentJobData,
  });

  btn.disabled = false;
  btn.textContent = "Tailor Resume";

  if (!res.success || !res.data) {
    showError("submit-error", res.error ?? "Submission failed");
    return;
  }

  currentJobId = res.data.jobId;

  // Show processing view immediately
  populateJobMeta(
    "proc",
    currentJobData.title,
    currentJobData.company,
    currentJobData.location,
  );
  el("proc-progress-bar").style.width = "0%";
  el("proc-progress-pct").textContent = "0%";
  el("proc-stage-label").textContent = "Starting…";
  el("proc-status-badge").className = "status-badge queued";
  el("proc-status-text").textContent = "Queued";
  showView("view-job-processing");

  startPolling(currentJobId);
});

// Open in tailor.me while processing
el("btn-open-processing").addEventListener("click", () => {
  if (currentJobId) {
    chrome.tabs.create({ url: `http://localhost:3000/jobs/${currentJobId}` });
  }
});

// Re-tailor (from completed view)
el("btn-re-tailor").addEventListener("click", async () => {
  if (!currentJobData) return;
  if (!currentJobData.linkedInJobId) {
    showView("view-job-ready");
    return;
  }
  // Clear the stored job so the ready view shows again
  const stored = await chrome.storage.local.get("tailorme_jobs");
  const jobs = (stored["tailorme_jobs"] as Record<string, unknown>) ?? {};
  delete jobs[currentJobData.linkedInJobId];
  await chrome.storage.local.set({ tailorme_jobs: jobs });
  currentJobId = null;
  if (currentJobData) {
    populateJobMeta(
      "ready",
      currentJobData.title,
      currentJobData.company,
      currentJobData.location,
    );
    el("ready-desc").textContent = currentJobData.description.slice(0, 300);
  }
  showView("view-job-ready");
});

// Retry failed job
el("btn-retry").addEventListener("click", () => {
  el("btn-submit").click();
  showView("view-job-ready");
  setTimeout(() => el("btn-submit").click(), 50);
});

// Settings toggle
el("btn-toggle-settings").addEventListener("click", () => {
  const panel = el("api-settings-panel");
  panel.classList.toggle("open");
  el("btn-toggle-settings").textContent = panel.classList.contains("open")
    ? "Configure ▴"
    : "Configure ▾";
});

el("btn-save-api").addEventListener("click", async () => {
  const url = el<HTMLInputElement>("input-api-url").value.trim();
  if (url) {
    await chrome.storage.local.set({ tailorme_api_url: url });
    el("api-settings-panel").classList.remove("open");
    el("btn-toggle-settings").textContent = "Configure ▾";
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

init();
