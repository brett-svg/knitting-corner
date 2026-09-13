# Knitting Corner

A private craft command center — yarn stash, patterns, projects, and AI label scanning.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v3 · Fraunces (display) + Manrope (body)
- Postgres via Drizzle ORM (Railway Postgres in prod)
- Email + password auth, signed httpOnly session cookie (no third-party auth service)
- Railway Buckets (S3-compatible) for yarn photos, pattern PDFs and covers
- Anthropic Claude (`claude-haiku-4-5` by default) for yarn-label extraction
- Ravelry API for canonical yarn data

## Setup

```bash
npm install
cp .env.example .env      # then fill in keys
npm run db:migrate        # once DATABASE_URL is set
npm run dev
```

Open http://localhost:3000. With no `DATABASE_URL` the app runs in demo mode with mock data and no auth gate.

### Env vars

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | 32+ random chars; signs the session cookie |
| `ALLOWED_EMAILS` | optional comma-separated allowlist for account creation |
| `S3_BUCKET` / `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_REGION` | object storage; uploads are disabled if unset |
| `ANTHROPIC_API_KEY` | enables real label scanning (mocked if absent) |
| `ANTHROPIC_MODEL` | optional override (default `claude-haiku-4-5`) |
| `RAVELRY_USERNAME` / `RAVELRY_PASSWORD` | optional; read-only Ravelry API key. When set, scanned labels are matched against Ravelry's yarn database and fiber/yardage/weight are filled from the canonical listing |

### Railway

One project, three services:

1. **Postgres** — add from the "Database" menu. Nothing to configure.
2. **Bucket** — Create → Bucket. Private by default; the app serves files through `/api/files/…` after checking ownership.
3. **The app** — deploy from this GitHub repo. In its Variables tab add:
   ```
   DATABASE_URL          = ${{Postgres.DATABASE_URL}}
   AUTH_SECRET           = <openssl rand -base64 48>
   ALLOWED_EMAILS        = you@example.com,partner@example.com
   S3_BUCKET             = ${{Bucket.BUCKET}}
   S3_ENDPOINT           = ${{Bucket.ENDPOINT}}
   S3_ACCESS_KEY_ID      = ${{Bucket.ACCESS_KEY_ID}}
   S3_SECRET_ACCESS_KEY  = ${{Bucket.SECRET_ACCESS_KEY}}
   S3_REGION             = ${{Bucket.REGION}}
   ANTHROPIC_API_KEY, RAVELRY_USERNAME, RAVELRY_PASSWORD
   ```
   `npm start` runs pending migrations (`drizzle/*.sql`) before booting Next, so schema changes ship with the deploy.

Once it's up, open `/login`, create your account, and check `/whoami` to confirm every service shows as connected.

### Schema changes

Edit `lib/db/schema.ts`, run `npm run db:generate` to write a migration into `drizzle/`, commit it. It applies on the next deploy (or `npm run db:migrate` locally).

## Status

- ✅ App shell + design system (soft neutrals + rainbow gradient accents)
- ✅ Email + password auth, middleware route gating, every query scoped to the signed-in user
- ✅ Stash: search/filter/palette view · scan flow · manual entry · detail page with edit/delete
- ✅ Patterns: PDF upload (private bucket, owner-gated file route) · auto-rendered first-page covers · "match with stash"
- ✅ Projects: create + edit allocation (add/remove yarn with auto-reserve), status pills, progress slider, resume from home
- ✅ Tools: needles, hooks, notions tabs with add/delete
- ✅ AI label scanning endpoint (real or mocked) + camera flow
- ✅ Ravelry canonicalization: scanned brand/line is matched to Ravelry's yarn DB; fiber, yardage, grams and weight come from the listing (AI tiebreak when several candidates fit; manual pick otherwise)
- ✅ Storage locations CRUD (Tools → Locations) wired into the yarn editor and detail page
- ✅ "What can I make?" — yarn detail page surfaces compatible patterns
- ✅ Mobile pass: tighter 5-tab bottom nav, iOS safe-area, focus rings, scrollable filter rows
