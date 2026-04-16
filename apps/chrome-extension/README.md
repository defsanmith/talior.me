# tailor.me – LinkedIn Job Importer (Chrome Extension)

A Chrome extension that extracts job details from LinkedIn job postings and sends them to [tailor.me](http://localhost:3000) to automatically generate a tailored resume.

## What it does

When you're on a LinkedIn job page, the extension:

1. Extracts the **job title**, **company name**, **location**, **full job description** (including requirements), and the **LinkedIn job URL**
2. Sends the data to your local tailor.me API to kick off an AI resume-tailoring job
3. Shows live **processing status** with a progress bar directly in the popup
4. Provides a one-click **"Open Resume"** button once the resume is ready

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- tailor.me monorepo running locally (`apps/api` on port 3001, `apps/web` on port 3000)
- Google Chrome

## Installation

### 1. Build the extension

```bash
cd apps/chrome-extension
pnpm install
pnpm build
```

This produces a `dist/` folder with the compiled extension.

### 2. Load in Chrome

1. Open **chrome://extensions**
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the `apps/chrome-extension/dist/` folder
5. The tailor.me icon will appear in your Chrome toolbar

> Pin it for easy access: click the puzzle-piece icon in the toolbar → pin tailor.me.

## Usage

### First use

1. Click the tailor.me icon in the toolbar
2. Sign in with your tailor.me credentials (same email/password you use at `localhost:3000`)

### Tailoring a resume from a job posting

1. Navigate to any LinkedIn job page: `linkedin.com/jobs/view/...`
2. Click the tailor.me icon — it shows the extracted job title, company, and location
3. Click **"Tailor Resume"**
4. The popup shows live progress (Parsing JD → Selecting bullets → Rewriting → Assembling)
5. Once complete, click **"Open Resume ↗"** to open the full editor in tailor.me

### Returning to a job you've already submitted

If you revisit a LinkedIn job page you previously submitted, the extension remembers it and immediately shows the current status — no need to re-submit.

### Re-tailoring

On the completed view, click **"Re-tailor"** to generate a fresh resume for the same job posting.

## Configuration

By default the extension talks to `http://localhost:3001`. To change this:

1. Click the tailor.me icon
2. Click **"Configure ▾"** at the bottom of the popup
3. Enter your API URL and click **Save**

## Supported LinkedIn URL patterns

The extension activates on:
- `linkedin.com/jobs/view/:jobId` — individual job detail pages
- `linkedin.com/jobs/search/` — job search pages (when a job panel is open)
- `linkedin.com/jobs/collections/` — job collection pages

## Data extracted

| Field | Source |
|---|---|
| Job title | `.job-details-jobs-unified-top-card__job-title h1` (with fallbacks) |
| Company | `.job-details-jobs-unified-top-card__company-name a` |
| Location | First `.tvm__text--low-emphasis` in the tertiary description container |
| Description + Requirements | Full text of `#job-details` |
| Job URL | `window.location.href` |

The full job description (including "Required Qualifications" and "Preferred Qualification" sections) is sent to the API as raw text. The AI pipeline parses it into structured `required_skills`, `nice_to_have`, `responsibilities`, and `keywords` automatically.

## Development (watch mode)

To rebuild automatically on file changes:

```bash
pnpm watch
```

After each rebuild, go to `chrome://extensions` and click the **refresh** icon on the tailor.me card.

## Project structure

```
apps/chrome-extension/
├── manifest.json          # Chrome Extension Manifest V3
├── build.js               # esbuild bundler script
├── package.json
├── tsconfig.json
├── src/
│   ├── types.ts           # Shared TypeScript types
│   ├── content.ts         # LinkedIn DOM scraper (runs on linkedin.com/jobs/*)
│   ├── background.ts      # Service worker – API calls, auth, storage
│   └── popup.ts           # Popup UI logic
└── public/
    ├── popup.html         # Popup markup
    └── icons/             # Extension icons (16, 48, 128px)
```
