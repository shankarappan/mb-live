# MB Live

Private band web app for songs, charts, audio, set lists, and music-stand reading mode.  
Inspired by Planning Center Services + Music Stand — simplified for a single band.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase (Auth, Postgres RLS, Storage) · Vercel

Product context lives in [`SPEC.md`](./SPEC.md).

## Features (MVP)

- Invite-only magic-link auth (Admin / Band Leader / Member + instrument tags)
- Song library with ChordPro lyrics/chords, search & filters
- Per-song file uploads with instrument targeting + signed URLs
- Set lists with drag-and-drop reorder, overrides, breaks, duplicate
- Full-screen reading mode (dark, large type, swipe/keys, wake lock)

## Setup

### 1. Install

```bash
git clone https://github.com/shankarappan/mb-live.git
cd mb-live
npm install
cp .env.example .env.local
```

### 2. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon key** into `.env.local`.
3. Copy the **service role** key into `SUPABASE_SERVICE_ROLE_KEY` (server only).
4. In **SQL Editor**, run [`supabase/migrations/001_schema.sql`](./supabase/migrations/001_schema.sql).
5. **Authentication → Providers → Email**: enable magic links.
6. **Authentication → Settings**: disable public sign-ups (invite-only).
7. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-domain>/auth/callback`

### 3. Seed the first admin

```bash
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_NAME="Your Name" \
  npm run seed:admin
```

Then open `/login` and request a magic link for that email.

### 4. Run locally

```bash
npm run dev
```

### 5. Deploy (Vercel)

1. Import the GitHub repo into Vercel.
2. Set the same env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`).
3. Deploy, then update Supabase auth redirect URLs to the production domain.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run seed:admin` | Create/promote first admin |
| `npm run smoke` | File/schema smoke checks |

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
- Set changes: pull-to-refresh / focus check shows “Set updated — tap to refresh” (realtime is Phase 2).

## Phase 2 (not in MVP)

Offline PWA cache, Supabase Realtime set sync, ChordPro transposition, advanced audio loops, per-user default views.

## License

Private band tool — keep the repo access and Supabase project locked down; charts and stems must never be public.

## GitHub remote

If `origin` is missing, see [PUBLISH.md](./PUBLISH.md) — create the empty `shankarappan/mb-live` repo and grant the Cursor GitHub App access, then push `main`.
