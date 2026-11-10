# Personal Intelligence Engine (Single-User V1)

A production-ready, hyper-personalized daily briefing platform built exclusively for a single user. Instead of multi-tenant SaaS overhead, login screens, or public registration flows, this engine focuses entirely on automating a high-precision personal intelligence pipeline.

Once per day, it fetches data from specialized APIs, RSS feeds, and developer release notes, passes the raw context through a Google Gemini AI synthesis pipeline to convert technical jargon into clear, simple English, and dispatches a comprehensive, inline-styled responsive HTML briefing to your personal inbox via Resend. Additionally, you can inspect past briefings within a rolling 7-day retention window directly inside an installable PWA control dashboard.

---

## Key Features

- **Zero Authentication Overhead:** Direct access to your personal control panel with no passwords, sessions, or multi-tenant database complexity.
- **Fixed Core Interest Tracks:** Pre-configured out of the box with 3 active tracks:
  1. *Big Tech & Ecosystem Code Upgrades:* Google, Gemini AI, Meta engineering, Node.js, React, Fastify, Next.js, Python, C++, Rust, and trending GitHub repositories.
  2. *Entertainment Hub:* TMDB API trending movies, TV series premieres, trailers, box office summaries, and reviews.
  3. *Global Music & Tracks:* Spotify Web API global top 50 charts, new album releases, single drops, and artist updates.
- **Dynamic Topic Configuration Engine:** Type any custom interest prompt (e.g., "Formula 1 Racing", "Quantum Computing") inside the dashboard settings; the AI agent resolves, validates, and appends the source RSS/API config to the active pipeline without breaking templates.
- **Deduplication Engine:** SHA-256 canonical hashing cross-references fetched items against database history and intra-batch items to ensure zero repeated updates.
- **Gemini AI Synthesis Pipeline:** Deep integration with Google Gemini Flash models to translate raw developer jargon into concise, plain-English executive briefings with customizable reading density (Compact vs. In-Depth).
- **Responsive Inline HTML Email:** Mobile- and desktop-optimized email template formatted with high-contrast theme styling, urgency/impact badges, and direct source links.
- **7-Day Rolling Retention Window (TTL Purge):** Automated cleanup permanently keeps database footprint under ~5–10 MB.
- **Automated Scheduling:** Daily execution via GitHub Actions (`.github/workflows/daily-digest.yml`) at 7:00 AM UTC, plus an instant "Trigger Immediate Dispatch" button in the PWA.
- **1-Click Pause/Unsubscribe:** Instant delivery pause endpoint integrated directly into every email footer.

---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Data Ingestion                       │
│  [GitHub API]  [TMDB API]  [Spotify API]  [RSS/Atom]   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│               Deduplication Engine                     │
│    Canonical URL Normalization + SHA-256 Hashing       │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│            Google Gemini AI Synthesis                  │
│   Jargon Elimination • Density Tuning (Compact/Deep)   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                Delivery & Storage                      │
│   Resend API Email Dispatch • 7-Day TTL Database Purge │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│          PWA Control Dashboard (Zero Auth)             │
│   7-Day Viewer • Track Controls • Dynamic Topic Engine │
└────────────────────────────────────────────────────────┘
```

---

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript (Strict, zero `any`)
- **Styling & UI:** Tailwind CSS, Lucide Icons
- **Database:** Node 24 Native SQLite (`node:sqlite`) with WAL mode
- **AI Synthesis:** Google Generative AI (`gemini-2.5-flash`)
- **Email Delivery:** Resend API
- **Testing:** Vitest test suite with end-to-end and unit coverage
- **CI/CD:** GitHub Actions (CI & daily scheduled cron workflow)

---

## Getting Started

### Prerequisites

- Node.js 24+ (or Node.js 22.5+)
- npm 10+

### Installation

```bash
git clone <repository-url>
cd RaavaDigest
npm install
```

### Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your configuration keys:

```env
# Gemini AI API Key (required for synthesis & topic resolver)
GEMINI_API_KEY="your-gemini-api-key"

# Resend API Key & Email Configuration
RESEND_API_KEY="your-resend-api-key"
NOTIFICATION_EMAIL="your-email@example.com"
SENDER_EMAIL="briefing@yourdomain.com"

# The Movie Database (TMDB) API Key (optional - built-in fallback provided)
TMDB_API_KEY=""

# Spotify Web API Credentials (optional - built-in fallback provided)
SPOTIFY_CLIENT_ID=""
SPOTIFY_CLIENT_SECRET=""

# GitHub Personal Access Token (optional - public API used if empty)
GITHUB_TOKEN=""

# Secret key to secure /api/cron endpoint
CRON_SECRET="personal-intelligence-secure-cron-key"

# App Base URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Running the Application

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access your PWA Control Dashboard.

### Production Build

```bash
npm run build
npm start
```

### Manual CLI Dispatch Trigger

You can test the ingestion, synthesis, and delivery pipeline directly from the command line:

```bash
npm run dispatch:cron
```

Or trigger an immediate run from the PWA Control Dashboard via the **Trigger Immediate Dispatch** button.

---

## Testing & Verification

Run the comprehensive Vitest test suite:

```bash
npm test
```

Run TypeScript strict type checking:

```bash
npm run typecheck
```

---

## GitHub Actions Automated Dispatch

Configure your repository Secrets in **Settings > Secrets and variables > Actions**:

- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `NOTIFICATION_EMAIL`
- `SENDER_EMAIL`
- `TMDB_API_KEY` (optional)
- `SPOTIFY_CLIENT_ID` (optional)
- `SPOTIFY_CLIENT_SECRET` (optional)
- `GITHUB_TOKEN` (optional)
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`

The workflow in `.github/workflows/daily-digest.yml` will automatically run every morning at **7:00 AM UTC**, synthesize your feeds, dispatch the briefing to your inbox, and purge expired database records older than 7 days.
