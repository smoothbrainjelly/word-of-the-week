# Word of the Week

An AI-powered email newsletter that delivers a vocabulary word — with definition, etymology, pronunciation, and example — to your inbox every week.

Built with **Next.js 16 (App Router)**, **Upstash Redis**, **Gemini API**, **Gmail SMTP**, and **Vercel Cron**.

[![CI](https://github.com/smoothbrainjelly/word-of-the-week/actions/workflows/ci.yml/badge.svg)](https://github.com/smoothbrainjelly/word-of-the-week/actions/workflows/ci.yml)

> **Note:** The CI badge will show once the workflow has run on your default branch.

## Features

- **AI-generated word pool** — Gemini generates batches of words into a Redis pool, refilled automatically when low
- **Password auth** — Sign-up/sign-in with password (scrypt-hashed); the first account becomes admin
- **Admin dashboard** — Manage users, bulk word stats, preview words, send test emails, browse history
- **Word detail pages** — Per-word pages with definition, pronunciation, synonyms, antonyms, and TTS audio
- **Email delivery** — Sends formatted HTML emails via Gmail SMTP
- **Unsubscribe** — One-click unsubscribe from any email
- **Phonetics & TTS** — Professional IPA pronunciation with simplified guides and generated audio
- **Games** — Matching and Hangman games built from past words
- **Scheduled delivery** — Weekly send powered by Vercel Cron
- **Fully tested** — Unit tests (Vitest) + E2E tests (Playwright)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Upstash Redis |
| AI | Google Gemini API (incl. TTS models) |
| Email | Gmail SMTP (Nodemailer) |
| Auth | Email + password (scrypt), JWT sessions (jose) |
| Cron | Vercel Cron Jobs |
| Testing | Vitest + Playwright |

## Getting Started

### Prerequisites

- [Gemini API key](https://aistudio.google.com) (free tier)
- [Upstash Redis](https://upstash.com) instance (free tier)
- Gmail account with [2FA and app password](https://myaccount.google.com/apppasswords)
- Node.js 20+ and pnpm (`npm install -g pnpm`)

### Setup

```bash
pnpm install
cp .env.example .env
```

Fill in your `.env`:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Gemini API key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `GMAIL_USER` | Gmail address for sending |
| `GMAIL_APP_PASSWORD` | Gmail app password |
| `CRON_SECRET` | Random string to protect the cron endpoint |
| `JWT_SECRET` | Random string for signing auth tokens |
| `DEV_EMAIL` | Email address for dev login (local only) |
| `NEXT_PUBLIC_DEV_EMAIL` | Same email, exposed to client for dev button (local only) |

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The first account you sign up with becomes the admin. In development, the login page shows a one-click dev login button (`NEXT_PUBLIC_DEV_EMAIL`).

### Testing

```bash
pnpm test        # Unit tests (Vitest)
pnpm test:e2e    # E2E tests (Playwright)
pnpm test:watch  # Unit tests in watch mode
```

### Build

```bash
pnpm build
pnpm start
```

## Architecture

```
Vercel Cron (Sunday 23:00 UTC)
         ↓
   Checks weekly guard (avoids double-send)
         ↓
   Word pool in Redis (refilled via Gemini when low)
         ↓
   Gemini enriches word (definition, etymology, example, pronunciation, synonyms/antonyms)
         ↓
   Gmail SMTP sends to all active recipients
         ↓
   Stored in Upstash Redis (history)
```

## API Routes

| Route | Purpose |
|---|---|
| `POST /api/auth/signup` | Create account (first user becomes admin) |
| `POST /api/auth/login` | Sign in with email + password |
| `GET /api/auth/me` | Get current user |
| `POST /api/auth/dev-login` | Dev-only instant login |
| `POST /api/auth/logout` | Clear session cookie |
| `POST /api/auth/toggle-subscription` | Toggle user subscription |
| `GET /api/cron` | Scheduled word delivery (protected) |
| `GET /api/history` | Paginated word history |
| `POST /api/preview` | Generate sample word (no send) |
| `POST /api/preview/render` | Render word as HTML preview |
| `POST /api/preview/send` | Send test email |
| `GET /api/unsubscribe` | One-click unsubscribe |
| `GET/PUT/DELETE /api/users` | User management (admin) |
| `GET/POST /api/admin/force-send` | Force the weekly send (admin) |
| `GET/POST /api/admin/refill-pool` | Inspect/refill the word pool (admin) |
| `GET /api/game` | Word game deck from past words |
| `GET /api/word/[slug]` | Single word detail entry |
| `POST /api/word/[slug]/speech` | TTS audio for a word |

## Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables in Project Settings
4. Deploy
5. The cron fires every Sunday at 23:00 UTC and sends the weekly word to active subscribers

## License

MIT
