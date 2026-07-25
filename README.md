# MB Live

Private band web app for songs, charts, audio, set lists, and music-stand reading mode.  
Inspired by Planning Center Services + Music Stand — simplified for a single band.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase (Auth, Postgres RLS, Storage) · Vercel

| Doc | Purpose |
|-----|---------|
| [`SETUP_CHECKLIST.md`](./SETUP_CHECKLIST.md) | Full Phase 1 checklist (env sources, risks, verification) |
| [`SPEC.md`](./SPEC.md) | Product requirements |

---

## Quick Start

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (use a **dedicated** project for MB Live; do not reuse another app’s database).
2. Wait until the project is healthy.
3. Open **Project Settings → API** and keep this tab handy for env values.

### 2. Run the SQL migration

1. In Supabase, open **SQL Editor**.
2. Paste the entire contents of [`supabase/migrations/001_schema.sql`](./supabase/migrations/001_schema.sql).
3. Run it once.

This creates tables, RLS policies, the auth→profile trigger, and the private Storage bucket **`song-files`** (200MB limit).  
There is only **one** migration file — nothing else to run in order.

Confirm afterwards:

- **Table Editor:** `profiles`, `songs`, `song_files`, `setlists`, `setlist_items`
- **Storage:** bucket `song-files` exists and is **not** public

### 3. Fill `.env.local`

```bash
git clone https://github.com/shankarappan/mb-live.git
cd mb-live
npm install
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → **`anon` `public`** key |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → **`service_role`** key (secret) |
| `NEXT_PUBLIC_APP_URL` | Local: `http://localhost:3000` |

Validate (does not print secrets):

```bash
npm run check:env
```

After the migration is applied, optionally ping the live project:

```bash
npm run check:env -- --live
```

### 4. Disable public sign-ups (invite-only)

In Supabase:

1. **Authentication → Providers → Email** — enable Email (magic link / OTP).
2. **Authentication → Providers / Settings** — turn **off** “Allow new users to sign up” (wording varies by dashboard version).
3. **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs** include:
     - `http://localhost:3000/auth/callback`
     - (later) `https://<your-vercel-domain>/auth/callback`

The app signs in with `shouldCreateUser: false`, so unknown emails cannot self-register.

### 5. Seed the first admin

```bash
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_NAME="Your Name" npm run seed:admin
```

This loads `.env.local` automatically, creates (or promotes) the auth user, and upserts `profiles.role = admin`.  
It does **not** send a login email — you request a magic link next.

### 6. Run the app locally

```bash
npm run setup:verify   # env + repo smoke checks
npm run dev
```

1. Open http://localhost:3000/login  
2. Enter the seeded admin email → check inbox for the magic link  
3. You should land on Home  

Optional health endpoint (no secrets returned): http://localhost:3000/api/health  

### 7. Deploy to Vercel

1. Import https://github.com/shankarappan/mb-live into Vercel.
2. Set env vars for Production (and Preview if you want):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` = `https://<your-vercel-domain>` (no trailing slash)
3. Deploy.
4. In Supabase Auth URL config, set **Site URL** to the production URL and add  
   `https://<your-vercel-domain>/auth/callback` to **Redirect URLs**.
5. Hit `https://<your-vercel-domain>/api/health` and confirm `"ok": true`.

---

## Features (MVP)

- Invite-only magic-link auth (Admin / Band Leader / Member + instrument tags)
- Song library with ChordPro lyrics/chords, search & filters
- Per-song file uploads with instrument targeting + signed URLs
- Set lists with drag-and-drop reorder, overrides, breaks, duplicate
- Full-screen reading mode (dark, large type, swipe/keys, wake lock)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run check:env` | Validate `.env.local` keys (add `-- --live` to ping Supabase) |
| `npm run smoke` | Repo file + schema string smoke checks |
| `npm run setup:verify` | `check:env` + `smoke` |
| `npm run seed:admin` | Create/promote first admin (loads `.env.local`) |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Roles & file visibility

| Role | Authority |
|------|-----------|
| Admin | Users, storage, all content |
| Band Leader | Songs, files, set lists |
| Member | View sets/songs; upload own files; see targeted + everyone files |

Instrument tags on the profile (`vocals`, `guitar`, `keys`, `bass`, `drums`, …) filter `song_files.target_instruments`. Admins and leaders always see every file.

## Reading mode notes

- Route: `/sets/:id/stand`
- Uses the Screen Wake Lock API (best reliability in installed PWA / standalone mode on iOS).
- Set changes: focus check shows “Set updated — tap to refresh” (realtime is Phase 2).

## Phase 2 (not in MVP)

Offline PWA cache, Supabase Realtime set sync, ChordPro transposition, advanced audio loops, per-user default views.

## License

Private band tool — keep Supabase locked down; charts and stems must never be public.
