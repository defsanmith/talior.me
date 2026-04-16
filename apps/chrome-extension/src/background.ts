import type {
  BackgroundMessage,
  BackgroundResponse,
  JobData,
  JobStatusResponse,
  StoredJob,
} from "./types";

// ─── Storage keys ─────────────────────────────────────────────────────────────

const STORAGE_KEY_TOKEN = "tailorme_access_token";
const STORAGE_KEY_JOBS = "tailorme_jobs"; // Record<linkedInUrl, StoredJob>

// ─── Config ───────────────────────────────────────────────────────────────────

async function getApiBase(): Promise<string> {
  const result = await chrome.storage.local.get("tailorme_api_url");
  return (result["tailorme_api_url"] as string) ?? "http://localhost:3001";
}

// ─── Token management ─────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY_TOKEN);
  return (result[STORAGE_KEY_TOKEN] as string) ?? null;
}

async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_TOKEN]: token });
}

async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY_TOKEN);
}

// ─── Authenticated fetch with auto-refresh ────────────────────────────────────

async function apiFetch(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<Response> {
  const base = await getApiBase();
  const token = await getToken();

  const res = await fetch(`${base}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch(path, options, false);
  }

  return res;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const base = await getApiBase();
    const res = await fetch(`${base}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const body = await res.json();
    const token = body?.data?.accessToken ?? body?.accessToken;
    if (token) {
      await setToken(token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Auth handlers ────────────────────────────────────────────────────────────

async function login(
  email: string,
  password: string
): Promise<BackgroundResponse<{ email: string }>> {
  try {
    const base = await getApiBase();
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.message ?? "Login failed" };
    }

    const body = await res.json();
    const token = body?.data?.accessToken ?? body?.accessToken;
    if (!token) return { success: false, error: "No access token in response" };

    await setToken(token);
    return { success: true, data: { email } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function logout(): Promise<BackgroundResponse> {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Best effort
  }
  await clearToken();
  return { success: true };
}

async function checkAuth(): Promise<BackgroundResponse<{ loggedIn: boolean }>> {
  const token = await getToken();
  if (!token) return { success: true, data: { loggedIn: false } };

  // Validate by hitting a lightweight authenticated endpoint
  const res = await apiFetch("/api/profile", { method: "GET" });
  if (res.ok) return { success: true, data: { loggedIn: true } };

  await clearToken();
  return { success: true, data: { loggedIn: false } };
}

// ─── Job submission ───────────────────────────────────────────────────────────

async function submitJob(
  jobData: JobData
): Promise<BackgroundResponse<{ jobId: string }>> {
  try {
    const res = await apiFetch("/api/jobs", {
      method: "POST",
      body: JSON.stringify({
        jobDescription: jobData.description,
        companyName: jobData.company || null,
        jobPosition: jobData.title || null,
        strategy: "openai",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err?.message ?? `Failed to submit job (${res.status})`,
      };
    }

    const body = await res.json();
    const jobId: string =
      body?.data?.jobId ?? body?.jobId ?? body?.data?.id ?? body?.id;
    if (!jobId) return { success: false, error: "No job ID in response" };

    // Store applicationUrl (LinkedIn URL) against the job
    apiFetch(`/api/tracker/jobs/${jobId}`, {
      method: "PATCH",
      body: JSON.stringify({ applicationUrl: jobData.url }),
    }).catch(() => {
      // Non-critical — don't fail the whole flow
    });

    // Persist the LinkedIn URL → jobId mapping locally
    await saveStoredJob(jobData.url, jobId);

    return { success: true, data: { jobId } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Job status ───────────────────────────────────────────────────────────────

async function getJobStatus(
  jobId: string
): Promise<BackgroundResponse<JobStatusResponse>> {
  try {
    const res = await apiFetch(`/api/jobs/${jobId}`);
    if (!res.ok) {
      return {
        success: false,
        error: `Failed to fetch job status (${res.status})`,
      };
    }
    const body = await res.json();
    // Support both wrapped responses ({ data: { job, ... } }) and flatter/legacy shapes.
    const job = body?.data?.job ?? body?.job ?? body?.data ?? body;
    return {
      success: true,
      data: {
        id: job.id,
        status: job.status,
        stage: job.stage ?? null,
        progress: job.progress ?? 0,
        applicationStatus: job.applicationStatus,
        company: job.company ?? null,
        position: job.position ?? null,
      },
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Stored job helpers ───────────────────────────────────────────────────────

async function saveStoredJob(
  linkedInUrl: string,
  jobId: string
): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY_JOBS);
  const jobs: Record<string, StoredJob> = result[STORAGE_KEY_JOBS] ?? {};
  jobs[linkedInUrl] = { jobId, linkedInUrl, submittedAt: Date.now() };
  await chrome.storage.local.set({ [STORAGE_KEY_JOBS]: jobs });
}

async function getStoredJob(
  linkedInUrl: string
): Promise<BackgroundResponse<StoredJob | null>> {
  const result = await chrome.storage.local.get(STORAGE_KEY_JOBS);
  const jobs: Record<string, StoredJob> = result[STORAGE_KEY_JOBS] ?? {};

  // Normalize the URL to strip trailing slashes and query params for matching
  const normalize = (url: string) => url.split("?")[0].replace(/\/$/, "");
  const normalizedInput = normalize(linkedInUrl);

  for (const [key, value] of Object.entries(jobs)) {
    if (normalize(key) === normalizedInput) {
      return { success: true, data: value };
    }
  }
  return { success: true, data: null };
}

// ─── Message router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: BackgroundMessage,
    _sender,
    sendResponse: (r: BackgroundResponse) => void
  ) => {
    (async () => {
      switch (message.type) {
        case "LOGIN":
          sendResponse(await login(message.email, message.password));
          break;
        case "LOGOUT":
          sendResponse(await logout());
          break;
        case "CHECK_AUTH":
          sendResponse(await checkAuth());
          break;
        case "SUBMIT_JOB":
          sendResponse(await submitJob(message.jobData));
          break;
        case "GET_JOB_STATUS":
          sendResponse(await getJobStatus(message.jobId));
          break;
        case "GET_STORED_JOB":
          sendResponse(await getStoredJob(message.linkedInUrl));
          break;
        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    })();
    return true; // keep message channel open for async response
  }
);
