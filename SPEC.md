# MB Live — Product Strategy & Technical Plan

**Version:** 1.0  
**Prepared for:** Internal band team  
**Product type:** Private team web app (mobile / tablet / desktop)  
**Inspiration:** Planning Center Services + Music Stand, simplified for a single band's workflow

---

## 1. Product Requirements Document (PRD)

### 1.1 Vision

MB Live is the single source of truth for the band: every song, every chart, every audio file, and every set list lives in one place, with the right version served to the right person at the right time — in the rehearsal room, at home, and on stage.

### 1.2 Problem Statement

Today the band's material is scattered across group chats, email attachments, personal drives, and paper. Consequences:

- Nobody is confident which chart or key is current.
- Last-minute set changes don't propagate to everyone reliably.
- Each musician needs *different* materials (lyrics vs. chord chart vs. stems), but everything is shared to everyone, creating noise.
- On stage, flipping between PDFs in a generic file app is slow and error-prone.

### 1.3 Goals

| # | Goal | Success signal |
|---|------|----------------|
| G1 | One canonical library of songs with metadata (key, tempo, capo, notes) | Zero "which version?" questions at rehearsal |
| G2 | Per-song file organization with role-aware visibility | Each member opens the app and sees only what they need |
| G3 | Fast set list creation, reordering, and last-minute edits | A set can be reordered in under 30 seconds from a phone |
| G4 | Reliable music-stand reading mode on tablet/phone | Whole band performs a full gig from the app without touching paper |
| G5 | Lean, low-maintenance, private | No public sign-up; near-zero admin overhead |

### 1.4 Non-Goals

- Multi-band / multi-tenant SaaS features.
- Scheduling, availability polling, or volunteer management.
- Public sharing, streaming, or fan-facing pages.
- In-app audio mixing or DAW features (playback only).
- Real-time collaborative chart editing (Phase 3 at most).

### 1.5 Users & Personas

| Persona | Primary needs | Primary device |
|---|---|---|
| **Band Leader / MD** | Build sets, set keys/tempos, assign notes, push last-minute changes | Phone + laptop |
| **Singer** | Lyrics-first view, key info, guide vocals | Phone / tablet |
| **Guitarist / Keys** | Chord charts, capo info, alternate keys, stems | Tablet |
| **Drummer** | Click tracks, tempo, arrangement maps, guide tracks | Tablet + in-ears rig |
| **Admin** | User management, storage hygiene, backups | Laptop |

### 1.6 Functional Requirements (MVP)

**Song library**
- FR1: CRUD songs with title, artist, default key, alternate keys, tempo, time signature, capo, duration, tags, arrangement notes, lyrics+chords body (ChordPro or plain text), status (active/archived).
- FR2: Search and filter by title, tag, key, tempo range.
- FR3: Per-song file attachments with file type and optional instrument/role targeting.

**Set lists**
- FR5: Create a set list with name, date, event type, venue/notes.
- FR6: Add songs; per-set overrides for key, tempo, capo, and per-set note.
- FR7: Drag-and-drop reorder; insert non-song items (talk break, intermission, medley marker).
- FR8: Changes visible on next refresh (MVP); realtime is Phase 2.
- FR9: Duplicate a past set list.

**Roles & access**
- FR10: Roles Admin, Band Leader, Member (+ instrument tags).
- FR11: File visibility: everyone or targeted instruments; Admin/Leader see all.
- FR12: Invite-only; no self-service registration.

**Reading mode**
- FR13: Full-screen set view; swipe/tap between songs; large type; dark mode.
- FR15: Screen stays awake (Wake Lock API).

### 1.7 Non-Functional Requirements

| Requirement | Target |
|---|---|
| Devices | Responsive web app; installable feel on tablets |
| Security | Auth required for every route and file URL; no public buckets |
| Storage | Files up to ~200 MB; signed URLs only |
| Maintenance | Managed services only (Vercel + Supabase) |

---

## 2. Roles & Permissions

| Capability | Admin | Band Leader | Member |
|---|:---:|:---:|:---:|
| Invite / remove users, assign roles | yes | no | no |
| Create / edit / archive songs | yes | yes | no |
| Upload / delete files | yes | yes | upload own; delete own only |
| Set file visibility | yes | yes | own uploads only |
| Create / edit / reorder set lists | yes | yes | no |
| View set lists & reading mode | yes | yes | yes |
| View targeted files | all | all | targeted + everyone |
| Per-set overrides | yes | yes | no |
| Storage management | yes | no | no |

Instrument tags are content filters, not permission levels.

---

## 3. Phasing

**MVP (this codebase):** auth, songs, files, set lists + DnD, reading mode, search/filters, set duplicate.  
**Phase 2:** offline PWA, realtime set updates, transposition, advanced audio, per-user defaults.  
**Phase 3:** annotations, follow-me sync, practice mode, version history, multi-band.

**MVP litmus test:** can the band run one full rehearsal and one full gig using only the app?

---

## 4. Database Schema

Implemented in `supabase/migrations/001_schema.sql`.

- `profiles` — id ↔ auth.users, display_name, email, role, instruments[]
- `songs` — metadata + ChordPro `body`, tags, status
- `song_files` — typed attachments, `target_instruments` null = everyone, private storage path
- `setlists` — name, date, type, venue, notes, status
- `setlist_items` — song or break/note/medley, fractional `position`, overrides

RLS enforces song/setlist writes for admin|leader and file visibility by instrument overlap. Storage bucket `song-files` is private; serve via signed URLs after permission check.

---

## 5. Key User Flows

**A — Leader builds a set:** New Set → add songs → drag reorder → overrides → mark Final.  
**B — Member prepares:** Home shows next set → open song → see only their files → play guide.  
**C — Live performance:** Reading Mode → swipe songs → leader edits set → members refresh toast.  
**D — New song with files:** Create song → upload chord/lyric/click with targeting.  
**E — Admin onboards:** Invite email + role + instruments → magic link → profile.

---

## 6. UI Sitemap

```
/                       Home — next set, recent songs
/login                  Magic-link sign-in (invite-only)
/songs                  Library — search, filters
/songs/new              Create song (leader/admin)
/songs/:id              Song detail — body, files
/songs/:id/edit         Edit song
/sets                   Set lists
/sets/new               Create set
/sets/:id               Set detail — DnD, overrides
/sets/:id/stand         READING MODE
/settings/profile       Display name, instruments
/admin/users            User management (admin)
/admin/storage          Storage usage (admin)
```

Bottom tabs: Home / Songs / Sets. Reading Mode is chromeless.

---

## 7. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js App Router + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Drag & drop | dnd-kit |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Auth | Magic links, invite-only |
| Hosting | Vercel |

See `README.md` for setup runbook.
