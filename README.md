# Word of the Week

An AI-powered app that sends you a vocabulary word with definition, etymology, and example sentence every week via email.

Built with **Next.js (App Router) + Upstash Redis + Gemini API + Gmail SMTP + Vercel Cron**.

## Architecture

```
Vercel Cron (every hour)
         ↓
   Checks schedule (day/time/timezone from Redis)
         ↓
   Gemini API generates word (definition, etymology, example)
         ↓
   Gmail SMTP sends to all active recipients
         ↓
   Stored in Upstash Redis (history)
```

## Pages

| Route | Purpose |
|---|---|
| `/` | Dashboard — stats, recent words |
| `/recipients` | Manage who receives the weekly word |
| `/preview` | Generate a sample word and send a test email |
| `/history` | Browse previously sent words |

## API Routes

| Route | Purpose |
|---|---|
| `GET/POST /api/recipients` | List and create recipients |
| `PUT/DELETE /api/recipients/[id]` | Update or remove a recipient |
| `POST /api/preview` | Generate a word via Gemini (no send) |
| `POST /api/preview/send` | Generate a word and send a test email |
| `GET /api/history` | Paginated history of sent words |
| `GET /api/cron` | Scheduled delivery (protected by `CRON_SECRET`) |

## Prerequisites

- **Gemini API key** — [aistudio.google.com](https://aistudio.google.com) (free tier)
- **Upstash Redis** — [upstash.com](https://upstash.com) (free tier)
- **Gmail account** with [2FA and an app password](https://myaccount.google.com/apppasswords)
- **pnpm** — `npm install -g pnpm`

## Setup

```bash
pnpm install
```

Copy the environment template and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `GMAIL_USER` | Your Gmail address |
| `GMAIL_APP_PASSWORD` | Gmail app password |
| `CRON_SECRET` | Random string to protect the cron endpoint |

## Local Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The Upstash Redis and Gemini API work locally — the only thing that won't fire is the Vercel Cron.

To test the cron flow locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron
```

## Deployment to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables in Project Settings → Environment Variables
4. Deploy
5. The cron (`0 * * * *`) runs every hour and checks the configured day/time before sending
