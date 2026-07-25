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

#### Production env vars (Vercel → Project → Settings → Environment Variables)

Set all four for **Production** (and **Preview** if you use preview deployments):

| Variable | Production value | Notes |
|----------|------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as local | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as local | anon / publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as local | **secret** — server only; never expose in client |
| `NEXT_PUBLIC_APP_URL` | `https://<your-vercel-domain>` | **No trailing slash.** Must match Supabase Site URL |

Do **not** set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_NAME` on Vercel.

#### Supabase Auth settings that must match production

**Authentication → URL Configuration:**

| Setting | Value |
|---------|--------|
| **Site URL** | `https://<your-vercel-domain>` (primary production origin) |
| **Redirect URLs** | Include **both**: `https://<your-vercel-domain>/auth/callback` **and** `http://localhost:3000/auth/callback` (keep local for development) |

Also keep:
- Email provider **enabled**
- Public sign-up **disabled**

`NEXT_PUBLIC_APP_URL` on Vercel, Supabase **Site URL**, and the production redirect entry must all use the **same https origin**.

#### Deploy steps (exact order)

1. Push `main` to https://github.com/shankarappan/mb-live (already the deploy source).
2. In Vercel: **Add New Project** → Import `shankarappan/mb-live` → Framework: Next.js (auto).
3. Before first deploy, add the four env vars above for Production.
4. Deploy.
5. Copy the production URL (e.g. `https://mb-live.vercel.app` or your custom domain).
6. If `NEXT_PUBLIC_APP_URL` was a placeholder, set it to that exact origin and **redeploy** (NEXT_PUBLIC_* is baked in at build time).
7. In Supabase Auth URL config: set Site URL + add production `/auth/callback` (keep localhost redirect too).
8. Open `https://<your-vercel-domain>/api/health` → `"ok": true`.
9. Open `/login` → magic link for the seeded admin → land on Home.
10. Optional Preview: add the same env vars for Preview, plus each preview URL’s `/auth/callback` in Supabase Redirect URLs (or use a wildcard if your Supabase plan/UI supports it).

#### Auth correctness notes

- Magic links and invites use `NEXT_PUBLIC_APP_URL` (with a safe `VERCEL_URL` fallback). Prefer setting `NEXT_PUBLIC_APP_URL` explicitly.
- After changing any `NEXT_PUBLIC_*` var on Vercel, you must **redeploy**.
- Custom domain: use the custom origin in Site URL, Redirect URLs, and `NEXT_PUBLIC_APP_URL`, then redeploy.

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
