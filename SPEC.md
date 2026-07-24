# MB Live — Product Strategy & Technical Plan

**Version:** 1.0  
**Product type:** Private team web app (mobile / tablet / desktop)  
**Inspiration:** Planning Center Services + Music Stand, simplified for a single band

## Vision

MB Live is the single source of truth for the band: every song, every chart, every audio file, and every set list lives in one place, with the right version served to the right person at the right time.

## Goals (MVP)

- G1 Canonical song library with metadata (key, tempo, capo, notes)
- G2 Per-song files with role/instrument-aware visibility
- G3 Fast set list creation, reorder, last-minute edits
- G4 Reliable music-stand reading mode
- G5 Lean, invite-only, low maintenance

## Non-goals

Multi-band SaaS, scheduling/availability, public sharing, in-app mixing, realtime collaborative chart editing (Phase 3).

## Roles

| Capability | Admin | Leader | Member |
|---|---|---|---|
| Invite / remove users | yes | no | no |
| Song CRUD | yes | yes | no |
| Upload files | yes | yes | yes (own) |
| Delete others' files | yes | yes | no |
| Set list CRUD / reorder | yes | yes | no |
| View sets + reading mode | yes | yes | yes |
| See all files | yes | yes | targeted + everyone |

Instrument tags on profiles filter content; they are not permission roles.

## Schema (see `supabase/migrations/001_schema.sql`)

- `profiles` — id↔auth.users, display_name, email, role, instruments[]
- `songs` — metadata + ChordPro `body`, tags, status active/archived
- `song_files` — typed attachments, `target_instruments` null=everyone, private storage path
- `setlists` — name, date, type, venue, notes, status
- `setlist_items` — song or break/note/medley, fractional `position`, per-set overrides

Storage: private bucket `song-files`, signed URLs after permission check. RLS enforces visibility.

## Sitemap

```
/                       Home — next set, recent songs
/login                  Magic-link (invite-only)
/songs                  Library + filters
/songs/new|/songs/:id|/songs/:id/edit
/sets                   Set lists
/sets/new|/sets/:id|/sets/:id/stand
/settings/profile       Name + instruments
/admin/users            Invites (admin)
/admin/storage          Usage (admin)
```

## Phasing

**MVP (this repo):** auth, songs, files, set lists + DnD, reading mode, search/filters, set duplicate.  
**Phase 2:** offline PWA, realtime set updates, transposition, advanced audio, per-user defaults.  
**Phase 3:** annotations, follow-me sync, practice mode, version history.

## Stack

Next.js App Router + TypeScript, Tailwind + shadcn/ui, dnd-kit, Supabase Auth/Postgres/Storage, Vercel.

## MVP litmus test

Can the band run one full rehearsal and one full gig using only the app?
