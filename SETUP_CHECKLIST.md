# MB Live — Phase 1 Setup Checklist

**Phase 1 scope:** get the already-built MVP running locally against a real Supabase project.  
No new product features. Vercel production deploy is optional after local works.

Repo: https://github.com/shankarappan/mb-live

---

## Current app status

| Area | Status |
|------|--------|
| Next.js 16 App Router + TypeScript + Tailwind + shadcn/ui | Built |
| Auth proxy (`src/proxy.ts`) + magic-link login + `/auth/callback` | Built |
| Roles: admin / leader / member + instrument tags | Built |
| Home, Songs CRUD/search, ChordPro render | Built |
| File upload + instrument targeting + signed URLs + audio/PDF | Built |
| Set lists + dnd-kit reorder + overrides + duplicate | Built |
| Reading mode `/sets/[id]/stand` (wake lock, swipe, stale toast) | Built |
| Admin users invite + storage usage page | Built |
| Schema/RLS + private `song-files` bucket (SQL) | Built |
| `scripts/seed-admin.mjs`, `scripts/smoke-test.mjs` | Built |

**Not in Phase 1:** offline PWA, Realtime, transposition, advanced audio, Playwright E2E, Supabase CLI (`config.toml`), automated migration pipeline.

**Migrations:** only [`supabase/migrations/001_schema.sql`](./supabase/migrations/001_schema.sql). No further migration files; nothing else to run in order.

---

## Required manual setup

1. Clone the repo and install dependencies.
2. Create a **new** Supabase project (do **not** reuse the Lets Split / Project-1 database).
3. Run `001_schema.sql` in the Supabase SQL Editor (tables, RLS, trigger, storage bucket).
4. Configure Auth: Email provider, disable public sign-ups, Site URL + redirect URLs.
5. Fill `.env.local` from `.env.example`.
6. Seed the first admin with `npm run seed:admin`.
7. Run `npm run dev` and sign in via magic link.

---

## Required env vars

Put these in **`.env.local`** (never commit real values):

| Variable | Used by | Where the value comes from |
|----------|---------|----------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser client, server client, proxy, auth callback, admin client, seed script | Supabase → **Project Settings → API → Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client, server client, proxy, auth callback | Supabase → **API → `anon` `public` key** |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin invites/removals, seed script, some admin-only server paths | Supabase → **API → `service_role` key** (secret; server only) |
| `NEXT_PUBLIC_APP_URL` | Magic-link and invite `emailRedirectTo` URLs | Local: `http://localhost:3000`. Production: your Vercel URL |

CLI-only (optional to put in `.env.local`; usually passed on the command line):

| Variable | Used by | Notes |
|----------|---------|-------|
| `SEED_ADMIN_EMAIL` | `scripts/seed-admin.mjs` | Required for seeding |
| `SEED_ADMIN_NAME` | `scripts/seed-admin.mjs` | Optional; defaults to `Admin` |

**Note:** `npm run seed:admin` and `npm run check:env` auto-load `.env.local`. You still pass `SEED_ADMIN_EMAIL` on the command line (or uncomment it in `.env.local`).

---

## Supabase setup checklist

- [ ] Create a project at [supabase.com](https://supabase.com)
- [ ] Open **SQL Editor** and run the entire contents of `supabase/migrations/001_schema.sql` once
- [ ] Confirm tables exist: `profiles`, `songs`, `song_files`, `setlists`, `setlist_items`
- [ ] Confirm Storage → bucket **`song-files`** exists, is **Private**, file size limit ~200MB  
  (created by the migration — no manual bucket create if SQL succeeded)
- [ ] **Authentication → Providers → Email**: enabled (magic link / OTP)
- [ ] **Authentication → Settings**: **Allow new users to sign up = OFF** (invite-only)
- [ ] **Authentication → URL configuration**:
  - **Site URL:** `http://localhost:3000` (for local Phase 1)
  - **Redirect URLs** include at least:
    - `http://localhost:3000/auth/callback`
    - (If magic links fail with redirect errors, also add a wildcard form your project accepts for query strings)
    - Later for prod: `https://<your-vercel-domain>/auth/callback`
- [ ] Copy Project URL, anon key, and service_role key into `.env.local`
- [ ] (Optional) Send a test magic link and confirm email delivery (check spam; free tier is rate-limited)

### Public sign-up

**Expected: disabled.**

App login calls `signInWithOtp` with `shouldCreateUser: false`. Unknown emails cannot self-register.

### First admin user

1. Run `npm run seed:admin` with `SEED_ADMIN_EMAIL` set.
2. Script uses the **service role** to:
   - `auth.admin.createUser` (email confirmed), and
   - upsert `profiles` with `role = admin`.
3. Script does **not** send a login email.
4. Open `/login` and request a magic link for that same email.

Later members: signed-in Admin → **Admin → Users → Invite** (`inviteUserByEmail`).

---

## Local run checklist

- [ ] Node.js 20+ available
- [ ] Repo cloned; `npm install` succeeded
- [ ] `.env.local` filled with the four app env vars
- [ ] `001_schema.sql` applied successfully
- [ ] Public sign-up disabled; Email auth enabled; redirect URLs set
- [ ] Admin seeded
- [ ] `npm run smoke` passes (file/schema presence only — does not hit live Supabase)
- [ ] `npm run dev` → http://localhost:3000/login
- [ ] Magic link signs you in → Home
- [ ] Smoke flow: create a song → create a set → open Reading Mode

---

## Risks / missing items

| Risk | Detail |
|------|--------|
| Seed ≠ automatic login | User exists; you must still request a magic link at `/login` |
| Wrong Supabase project | Reusing Lets Split DB will not match this schema/RLS |
| Partial migration | If SQL errors mid-run, re-run after fixing; confirm bucket + policies |
| Storage select policy | Authenticated users can select objects in `song-files`; app still gates via `song_files` RLS + signed URLs — fine for MVP |
| No Supabase CLI wiring | Manual SQL Editor only; no `supabase db push` config in repo |
| Email deliverability | Magic links depend on Supabase email; check spam / rate limits |
| Vercel not required for Phase 1 | Deploy after local verification |

---

## Exact commands to run

```bash
git clone https://github.com/shankarappan/mb-live.git
cd mb-live
npm install
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...
#   NEXT_PUBLIC_APP_URL=http://localhost:3000

# In Supabase SQL Editor: run supabase/migrations/001_schema.sql
# In Supabase Auth: disable public sign-up; set Site URL + redirect URLs

npm run check:env
npm run check:env -- --live

SEED_ADMIN_EMAIL="you@example.com" SEED_ADMIN_NAME="Your Name" npm run seed:admin

npm run setup:verify
npm run dev
# Open http://localhost:3000/login and request a magic link for SEED_ADMIN_EMAIL
# Optional: http://localhost:3000/api/health
```

### Optional later (not Phase 1 required)

```bash
# After Vercel import + env vars set:
# Update Supabase Site URL + redirect URLs to the production domain
# Set NEXT_PUBLIC_APP_URL to https://<your-vercel-domain>
```

---

## Phase 1 completion criteria

- [ ] Admin can sign in via magic link on localhost
- [ ] Admin can create a song with ChordPro body
- [ ] Admin can create a set, add the song, open `/sets/:id/stand`
- [ ] File upload to a song works (private bucket + signed URL open)
- [ ] Public (non-invited) email cannot sign up / get a magic link for a new user
