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

function getDocumentTitleFallback(): string {
  const raw = document.title?.trim() ?? "";
  if (!raw) return "";

  // Usually shaped like: "Role Name | LinkedIn"
  const beforePipe = raw.split("|")[0]?.trim() ?? "";
  return beforePipe;
}

function parseCompanyFromAriaLabel(label: string): string {
  // Example: "Company, Brook Health."
  const cleaned = label.replace(/^Company,\s*/i, "").trim();
  return cleaned.replace(/\.$/, "").trim();
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

  // Fallback: often present as document title in newer LinkedIn layouts.
  const fromDocTitle = getDocumentTitleFallback();
  if (fromDocTitle) return fromDocTitle;

  return "";
}

function extractCompany(): string {
  const byClassSelector = queryText([
    ".job-details-jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name",
  ]);
  if (byClassSelector) return byClassSelector;

  // Fallback: obfuscated header often keeps a semantic aria-label.
  const byAria = document.querySelector<HTMLElement>(
    '[aria-label^="Company,"]',
  );
  if (byAria) {
    const label = byAria.getAttribute("aria-label") ?? "";
    const parsed = parseCompanyFromAriaLabel(label);
    if (parsed) return parsed;
  }

  // Fallback: first company profile link in the details area.
  const companyLink = document.querySelector<HTMLAnchorElement>(
    'a[href*="/company/"]',
  );
  if (companyLink?.textContent?.trim()) {
    return companyLink.textContent.trim();
  }

  return "";
}

function looksLikeLocation(text: string): boolean {
  return (
    /\b(remote|hybrid|on-site|onsite)\b/i.test(text) ||
    /,\s*[A-Z]{2}\b/.test(text) ||
    /\b(united states|usa|canada|india|uk|united kingdom)\b/i.test(text)
  );
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

  // (Unreachable in current flow; retained below with explicit return for readability)
}

function extractLocationFallback(): string {
  // New LinkedIn headers often render location in a metadata row like:
  // "Bellevue, WA · Reposted 1 day ago · Over 100 people clicked apply"
  const rows = document.querySelectorAll<HTMLElement>("p, span");
  for (const row of rows) {
    const raw = row.innerText?.trim();
    if (!raw || !raw.includes("·")) continue;

    const firstPart = raw.split("·")[0]?.trim() ?? "";
    if (firstPart && looksLikeLocation(firstPart)) {
      return firstPart;
    }
  }

  // Last fallback: extract trailing location from a title like
  // "Software Engineer - Hybrid/Bellevue, WA"
  const title = extractTitle();
  const slashParts = title.split("/");
  const tail = slashParts[slashParts.length - 1]?.trim() ?? "";
  if (tail && looksLikeLocation(tail)) return tail;

  return "";
}

function extractDescription(): string {
  // Confirmed: #job-details holds the full posting text including requirements
  const el =
    document.querySelector('[componentkey^="JobDetails_AboutTheJob_"]') ??
    document.querySelector('[componentkey*="AboutTheJob"]') ??
    document.getElementById("job-details") ??
    document.querySelector(".jobs-description__container") ??
    document.querySelector(".jobs-description") ??
    document.querySelector(".jobs-description__content") ??
    document.querySelector(".jobs-description-content__text") ??
    document.querySelector(".jobs-box__html-content");

  if (el) {
    // Use innerText to preserve newlines from block elements
    const text = (el as HTMLElement).innerText.trim();
    if (text) return text;
  }

  // Fallback: LinkedIn often embeds job details in JSON-LD.
  const jsonLdNodes = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  );
  for (const node of jsonLdNodes) {
    const raw = node.textContent?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as
        | Record<string, unknown>
        | Array<Record<string, unknown>>;
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const typeValue = item["@type"];
        const type = typeof typeValue === "string" ? typeValue : "";
        const description = item["description"];
        if (
          /jobposting/i.test(type) &&
          typeof description === "string" &&
          description.trim()
        ) {
          // JSON-LD description is often HTML; convert to plain text.
          const temp = document.createElement("div");
          temp.innerHTML = description;
          const text = temp.textContent?.trim() ?? "";
          if (text) return text;
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return "";
}

// ─── Core extraction ───────────────────────────────────────────────────────────

function extractJobData(): JobData | null {
  const title = extractTitle();
  const company = extractCompany();
  const description = extractDescription();
  const linkedInJobId = extractLinkedInJobId(window.location.href);

  // Recognize valid job detail pages by LinkedIn job ID.
  if (!linkedInJobId) return null;

  return {
    title,
    company,
    location: extractLocation() || extractLocationFallback(),
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
