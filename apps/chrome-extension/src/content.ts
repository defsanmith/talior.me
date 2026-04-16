import { extractLinkedInJobId, getCanonicalLinkedInViewUrl } from "./linkedin";
import type { ContentMessage, JobData } from "./types";

let extensionContextValid = true;

function isContextInvalidationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /extension context invalidated/i.test(error.message)
  );
}

function isExtensionContextAvailable(): boolean {
  return extensionContextValid && Boolean(chrome?.runtime?.id);
}

// ─── Selector helpers ──────────────────────────────────────────────────────────

function queryText(selectors: string[]): string {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return "";
}

function extractTitle(): string {
  // Primary: heading inside unified top card
  const heading = queryText([
    ".job-details-jobs-unified-top-card__job-title h1",
    "h1.t-24",
    "h1.jobs-unified-top-card__job-title",
  ]);
  if (heading) return heading;

  // Fallback: parse the apply button aria-label
  // e.g. "Apply to Software Engineer II on company website"
  const applyBtn = document.querySelector<HTMLElement>(
    "#jobs-apply-button-id, [data-live-test-job-apply-button]",
  );
  if (applyBtn) {
    const label = applyBtn.getAttribute("aria-label") ?? "";
    const match = label.match(/^Apply to (.+?) on /i);
    if (match) return match[1].trim();
  }

  return "";
}

function extractCompany(): string {
  return queryText([
    ".job-details-jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name",
  ]);
}

function extractLocation(): string {
  // Confirmed selector from real LinkedIn HTML:
  // first tvm__text--low-emphasis span inside the tertiary description container
  const container = document.querySelector(
    ".job-details-jobs-unified-top-card__tertiary-description-container span[dir='ltr']",
  );
  if (container) {
    const first = container.querySelector<HTMLElement>(
      "span.tvm__text--low-emphasis",
    );
    if (first?.textContent?.trim()) {
      const text = first.textContent.trim();
      // Skip separators like "·" or purely numeric strings
      if (text !== "·" && !/^\d+$/.test(text)) return text;
    }
  }

  // Fallback selectors
  return queryText([
    ".jobs-unified-top-card__bullet",
    ".jobs-unified-top-card__workplace-type",
  ]);
}

function extractDescription(): string {
  // Confirmed: #job-details holds the full posting text including requirements
  const el =
    document.getElementById("job-details") ??
    document.querySelector(".jobs-description__content") ??
    document.querySelector(".jobs-description-content__text");

  if (!el) return "";

  // Use innerText to preserve newlines from block elements
  return (el as HTMLElement).innerText.trim();
}

// ─── Core extraction ───────────────────────────────────────────────────────────

function extractJobData(): JobData | null {
  const title = extractTitle();
  const company = extractCompany();
  const description = extractDescription();
  const linkedInJobId = extractLinkedInJobId(window.location.href);

  // Must have at least a description to be a valid job page
  if (!description) return null;

  return {
    title,
    company,
    location: extractLocation(),
    description,
    linkedInJobId,
    url: linkedInJobId
      ? getCanonicalLinkedInViewUrl(linkedInJobId)
      : window.location.href,
  };
}

// ─── Messaging ────────────────────────────────────────────────────────────────

function sendJobData() {
  if (!isExtensionContextAvailable()) return;

  const data = extractJobData();
  const message: ContentMessage = data
    ? { type: "JOB_DATA", data }
    : { type: "NO_JOB_DATA" };

  try {
    chrome.runtime.sendMessage(message).catch((error: unknown) => {
      if (isContextInvalidationError(error)) {
        stopContentScriptActivity();
      }
      // Popup not open – ignore
    });
  } catch (error) {
    if (isContextInvalidationError(error)) {
      stopContentScriptActivity();
    }
  }
}

// ─── SPA navigation detection ─────────────────────────────────────────────────
// LinkedIn is a SPA; URL changes happen without full page reloads.

let lastUrl = location.href;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function stopContentScriptActivity() {
  extensionContextValid = false;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  observer.disconnect();
}

function onUrlChange() {
  if (location.href === lastUrl) return;
  lastUrl = location.href;

  // Debounce to wait for the new job content to render
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(sendJobData, 800);
}

const observer = new MutationObserver(onUrlChange);
observer.observe(document.body, { subtree: true, childList: true });

// ─── Respond to popup requests ────────────────────────────────────────────────

try {
  if (isExtensionContextAvailable()) {
    chrome.runtime.onMessage.addListener(
      (message: { type: string }, _sender, sendResponse) => {
        if (!isExtensionContextAvailable()) return false;

        if (message.type === "GET_JOB_DATA") {
          const data = extractJobData();
          sendResponse(data ?? null);
        }
        return true;
      },
    );
  }
} catch (error) {
  if (isContextInvalidationError(error)) {
    stopContentScriptActivity();
  }
}

// Send on initial load
sendJobData();
