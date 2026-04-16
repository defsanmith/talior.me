const LINKEDIN_VIEW_URL_RE = /\/jobs\/view\/(\d+)/;

export function extractLinkedInJobId(inputUrl: string): string | null {
  try {
    const parsed = new URL(inputUrl);

    const fromPath = parsed.pathname.match(LINKEDIN_VIEW_URL_RE)?.[1] ?? null;
    if (fromPath) return fromPath;

    const fromQuery = parsed.searchParams.get("currentJobId");
    if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery;

    return null;
  } catch {
    return null;
  }
}

export function getCanonicalLinkedInViewUrl(jobId: string): string {
  return `https://www.linkedin.com/jobs/view/${jobId}/`;
}
