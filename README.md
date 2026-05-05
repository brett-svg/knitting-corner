# Knitting Corner

A private craft command center — yarn stash, patterns, projects, and AI label scanning.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v3 · Fraunces (display) + Manrope (body)
- Supabase (Postgres + Auth + Storage) via `@supabase/ssr`
- OpenAI (`gpt-4o-mini` by default) for yarn-label extraction

## Setup

```bash
npm install
cp .env.example .env.local      # then fill in keys
npm run dev
```

Open http://localhost:3000.

### Env vars

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `OPENAI_API_KEY` | enables real label scanning (mocked if absent) |
| `OPENAI_MODEL` | optional override (default `gpt-4o-mini`) |

If both Supabase keys are missing, the app runs in demo mode with mock data and the auth gate is disabled — useful for kicking the tires.

### Supabase

1. Create a project, copy the URL + anon key into `.env.local`.
2. Open the **SQL editor** and paste [supabase/schema.sql](supabase/schema.sql). It creates all tables, RLS policies, and the `yarn-photos` storage bucket.
3. In **Auth → URL Configuration**, add `http://localhost:3000/auth/callback` (and your prod URL) to allowed redirects.
4. Hit `/login` and request a magic link.

Once signed in, scanned yarns persist to Postgres and their photos to Storage. RLS scopes every read/write to `auth.uid()`.

## Status

- ✅ App shell + design system (soft neutrals + rainbow gradient accents)
- ✅ Magic-link auth, middleware route gating, RLS-scoped Supabase
- ✅ Stash: search/filter/palette view · scan flow · manual entry · detail page with edit/delete
- ✅ Patterns: PDF upload (private bucket + signed URLs) · auto-rendered first-page covers · "match with stash"
- ✅ Projects: create + edit allocation (add/remove yarn with auto-reserve), status pills, progress slider, resume from home
- ✅ Tools: needles, hooks, notions tabs with add/delete
- ✅ AI label scanning endpoint (real or mocked) + camera flow
- ✅ Storage locations CRUD (Tools → Locations) wired into the yarn editor and detail page
- ✅ "What can I make?" — yarn detail page surfaces compatible patterns
- ✅ Mobile pass: tighter 5-tab bottom nav, iOS safe-area, focus rings, scrollable filter rows
