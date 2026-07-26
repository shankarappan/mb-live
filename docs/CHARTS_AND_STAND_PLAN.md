# Charts & Music Stand — Implementation Plan (Revised)

**Status:** Revised proposal — await approval before coding  
**Date:** 2026-07-26 (rev. 2)  
**Scope:** Planning Center–style Lyrics & Chords + Music Stand on MB Live  
**Stack:** Next.js App Router, Supabase Auth/RLS/Storage, existing roles

---

## Approved decisions (locked)

| # | Decision |
|---|----------|
| 1 | Phases **1 → 2 → 3**, with **read-only PDF-in-stand** pulled into Phase 1 |
| 2 | **ChordPro-style text** is the single master chart; Nashville / Roman / lyrics-only are **derived only** |
| 3 | **Minimal first-class arrangements in Phase 1** (not deferred) |
| 4 | **Concert (sounding) key** is canonical stored musical truth; guitarist **shape + capo fret** is optional display |
| 5 | Phase 1 stand: basic full-screen tablet reader + switch chart ↔ attached PDF (read-only). Annotations stay Phase 2 |

---

## 1. Current-state audit (unchanged summary)

| Exists today | Missing |
|--------------|---------|
| `songs.body` ChordPro-ish textarea + inline `ChordBody` | Transpose engine, view modes, section directives |
| Capo/key/tempo metadata; set overrides (display only) | Capo/shape view math; concert-key rewrite |
| `arrangement_notes` free text only | First-class arrangements |
| Dark stand: swipe, keys, wake lock, body text | PDF-in-stand, mode switcher, annotations |
| `song_files` + instrument targeting + signed URLs | Arrangement-scoped files |
| Roles admin/leader/member; members read-only for song/set edits | Publish/assign visibility (Phase 3) |

Evidence: `supabase/migrations/001_schema.sql`, `src/lib/chordpro.ts`, `src/components/stand/reading-mode.tsx`, `src/actions/{songs,files,setlists}.ts`.

---

## 2. Revised phase breakdown

### Phase 1 — Arrangements + chart engine + reader (incl. read-only PDF)

**Goals**

1. Minimal arrangements model under each song.
2. ChordPro master chart per arrangement; live preview editor.
3. Transpose / view modes derived from master (standard, lyrics, Nashville, Roman).
4. Concert key stored as truth; optional shape/capo display.
5. Basic full-screen stand: chart modes + **read-only PDF** switch when a PDF file exists.
6. View-only (temporary) transpose without mutating master.

**Deliverables**

| # | Deliverable |
|---|-------------|
| P1.1 | Migration: `arrangements` table; migrate `songs.body` / key / capo / tempo / meter / notes → default arrangement |
| P1.2 | Move chart source to `arrangements.body`; keep song-level library metadata |
| P1.3 | Optional `song_files.arrangement_id` (nullable = song-level shared file) |
| P1.4 | `setlist_items.arrangement_id` (nullable → song’s default arrangement) |
| P1.5 | Chart package: parse → transpose → modes → render (`src/lib/chart/*`) |
| P1.6 | `ChartView` + `ChartEditor` (preview, mode, concert key, shape/capo toggle) |
| P1.7 | `chart_view_prefs` (per user + arrangement): display mode, temp display key, shape view on/off, capo fret for shape view |
| P1.8 | Stand upgrade: tablet full-screen shell; mode switcher; **Chart \| PDF** tabs; PDF via signed URL iframe/PDF.js **read-only** (no annotate) |
| P1.9 | Set overrides feed stand defaults (`override_key` / `override_capo` as view inputs) |
| P1.10 | Unit tests for transpose + Nashville/Roman + lyrics-only |

**Explicitly out of Phase 1**

- Annotations (highlight / draw / text)
- Shared markup, advanced stage tools, Bluetooth pedal mapping beyond basic keys
- Publish/assign visibility
- PDF export / print polish (can add thin print CSS if cheap; not required)
- Advanced modulation UX beyond parsing `{key:}` markers in source

**Phase 1 acceptance**

- Song can have multiple arrangements; set item can pin one.
- Edit arrangement master → all four chart modes update without stored copies.
- Temp transpose / mode changes do not write `arrangements.body`.
- Concert key is what transposition math uses; shape view is display-only.
- Stand shows generated chart **or** read-only PDF when available, full-screen on tablet.

---

### Phase 2 — Annotations + advanced stand tools

**Goals**

- Personal (then optional shared) markup on chart and PDF pages.
- Pedal-friendly page turn; richer stage controls.

**Deliverables**

| # | Deliverable |
|---|-------------|
| P2.1 | `chart_annotations` table + RLS |
| P2.2 | Highlight / draw / text tools over chart + PDF |
| P2.3 | Keyboard / Bluetooth page-turn mapping layer |
| P2.4 | Annotation sync persistence; clear/reset; color-independent status |
| P2.5 | Landscape / density prefs; per-user stand defaults |

**Out of Phase 2:** publish/assign, arrangements version history, PDF export pipeline.

---

### Phase 3 — Permissions, modulation UX, exports, arrangement maturity

**Goals**

- Assigned/published visibility; stronger mid-song key-change UX; exports.

**Deliverables**

| # | Deliverable |
|---|-------------|
| P3.1 | Song/set visibility (`library` / `leaders` / `assigned`) + assignments + RLS |
| P3.2 | Editor “Insert key change” + stand visual break for `{key:}` modulations |
| P3.3 | Print / PDF export of current derived view (mode + concert/shape) |
| P3.4 | Arrangement status/order polish, duplicate arrangement, optional `chart_ast` cache |
| P3.5 | Optional shared annotations |

---

## 3. Proposed schema changes

### 3.1 Phase 1 migration (conceptual SQL)

```sql
-- 003_arrangements_and_charts.sql

create table public.arrangements (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  name text not null default 'Original',
  -- Master ChordPro source (concert-key chords)
  body text not null default '',
  -- Canonical musical truth (sounding / concert)
  default_key text,                    -- concert key of the arrangement
  alternate_keys text[] not null default '{}',
  chart_source_key text,               -- key the body was written in (usually = default_key)
  -- Capo is a performance/display aid for shape view; concert key remains truth
  capo int not null default 0,
  tempo_bpm int,
  time_signature text not null default '4/4',
  notes text,                          -- arrangement-level team notes
  position numeric not null default 1000,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index arrangements_song_id_idx on public.arrangements (song_id);
create index arrangements_song_position_idx on public.arrangements (song_id, position);

-- One default arrangement per song (optional helper)
alter table public.songs
  add column if not exists default_arrangement_id uuid
    references public.arrangements(id) on delete set null;

-- Data migration (run in same migration transaction):
-- For each song, insert arrangement from songs.body / default_key / capo /
-- tempo_bpm / time_signature / arrangement_notes, then set default_arrangement_id.
-- Leave songs.body / arrangement_notes readable during transition; stop writing
-- them after app cutover (deprecate columns in a later migration).

alter table public.song_files
  add column if not exists arrangement_id uuid
    references public.arrangements(id) on delete cascade;
-- null arrangement_id = shared across arrangements of the song
create index song_files_arrangement_id_idx on public.song_files (arrangement_id);

alter table public.setlist_items
  add column if not exists arrangement_id uuid
    references public.arrangements(id) on delete set null;
-- null = use song.default_arrangement_id at read time

create table public.chart_view_prefs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  arrangement_id uuid not null references public.arrangements(id) on delete cascade,
  view_mode text not null default 'standard'
    check (view_mode in ('standard', 'lyrics', 'nashville', 'roman')),
  -- Temporary concert display key (null = arrangement.default_key or set override)
  display_key text,
  -- Shape view: show guitar shapes for capo_fret; concert key still shown as badge
  shape_view boolean not null default false,
  capo_fret int,                       -- null = arrangement.capo
  updated_at timestamptz not null default now(),
  primary key (user_id, arrangement_id)
);

-- RLS: arrangements follow song write rules (admin/leader mutate; all auth select — until Phase 3)
-- chart_view_prefs: user CRUD own rows only
```

**Capo / key semantics (Phase 1)**

| Field | Meaning |
|-------|---------|
| `arrangements.default_key` | **Concert** (sounding) key — canonical |
| `arrangements.chart_source_key` | Concert key that `body` chords are written in |
| `arrangements.capo` | Default fret for optional shape view |
| `chart_view_prefs.display_key` | Temp concert key for viewing |
| `chart_view_prefs.shape_view` + `capo_fret` | UI-only guitarist shape display |

Chords in `body` are stored as **concert-pitch ChordPro** (Planning Center–style sounding truth). Shape view computes fretted chord labels from concert chords − capo.

### 3.2 Phase 2 migration

```sql
-- 004_annotations.sql
create table public.chart_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  arrangement_id uuid not null references public.arrangements(id) on delete cascade,
  target_type text not null check (target_type in ('chart', 'file')),
  target_file_id uuid references public.song_files(id) on delete cascade,
  page_index int,
  payload jsonb not null default '{}'::jsonb,
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.3 Phase 3 migration

```sql
-- 005_visibility.sql
alter table public.songs
  add column visibility text not null default 'library'
    check (visibility in ('library', 'leaders', 'assigned'));

create table public.song_assignments (
  song_id uuid references public.songs(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (song_id, user_id)
);
-- Tighten songs/arrangements SELECT RLS; optional setlist draft gating
```

---

## 4. Which current tables / files will change

### 4.1 Database tables

| Table | Change |
|-------|--------|
| **New** `arrangements` | Master chart + arrangement metadata |
| **New** `chart_view_prefs` | Per-user temp mode/key/shape prefs |
| `songs` | Add `default_arrangement_id`; stop treating `body` as chart source after migrate (deprecate `body`, `arrangement_notes`, possibly song-level key/capo/tempo once migrated) |
| `song_files` | Add nullable `arrangement_id` |
| `setlist_items` | Add nullable `arrangement_id` |
| **New** `chart_annotations` | Phase 2 |
| `songs` visibility + `song_assignments` | Phase 3 |

### 4.2 Application files (Phase 1 touch list)

| Path | Change |
|------|--------|
| `supabase/migrations/003_*.sql` | New |
| `src/lib/types/database.ts` | `Arrangement`, prefs types; update `Song` / `SongFile` / `SetlistItem` |
| `src/lib/chordpro.ts` | Superseded / thin re-export → `src/lib/chart/*` |
| `src/lib/chart/*` | **New** engine |
| `src/actions/songs.ts` | Create default arrangement with song; arrangement CRUD actions (new file ok) |
| `src/actions/setlists.ts` | Pass/store `arrangement_id`; stand load joins arrangement |
| `src/actions/files.ts` | Accept optional `arrangement_id` on prepare/finalize |
| `src/components/songs/song-form.tsx` | Song meta only; chart moves to arrangement editor |
| `src/components/songs/chord-body.tsx` | Replace usages with `ChartView` |
| `src/components/chart/*` | **New** ChartView, ChartEditor, ChartToolbar |
| `src/app/songs/[id]/page.tsx` | Arrangement tabs/picker + ChartView |
| `src/app/songs/[id]/edit/page.tsx` | Edit song meta and/or arrangement |
| `src/app/songs/page.tsx` | Search: include arrangement body (join or denormalized search later) |
| `src/components/sets/*` | Choose arrangement when adding song; show arrangement name |
| `src/components/stand/reading-mode.tsx` | Stand shell: modes + Chart/PDF switch, read-only PDF |
| `src/app/sets/[id]/stand/page.tsx` | Load arrangement + visible PDF files |
| `src/app/page.tsx` | Queue metadata from arrangement when pinned |
| `SPEC.md` / `SETUP_CHECKLIST.md` | Document migration 003 |

---

## 5. Storage format — master chart + derived views

### Master (persisted)

- **Format:** ChordPro-compatible **text** on `arrangements.body`
- **Pitch convention:** chords written at **concert / sounding** pitch
- **Directives (Phase 1 parse):** `{title}`, `{key}`, `{tempo}`, `{time}`, `{capo}` (informational), `{start_of_*}` / `{end_of_*}`, `{comment}`, mid-chart `{key: X}` as modulation marker
- **Not persisted:** Nashville, Roman, lyrics-only, shape-transposed copies

Example:

```chordpro
{title: Open Road}
{key: G}
{tempo: 118}
{time: 4/4}

{start_of_verse: V1}
[G]Rolling out under [C]city lights
{end_of_verse}

{comment: modulate}
{key: A}
[A]Second half in concert A
```

### Derived (runtime only)

```
arrangements.body
    → parse(ChartDocument)
    → applyView({
         displayConcertKey,   // temp or override or default_key
         shapeView,           // bool
         capoFret,            // for shape labeling only
         mode: standard | lyrics | nashville | roman
       })
    → ChartViewModel → UI / print
```

| Mode | Derivation |
|------|------------|
| Standard | Concert chords (or shape labels if shape view on) above/inline lyrics |
| Lyrics-only | Strip chords |
| Nashville | Degree numbers vs active concert key center |
| Roman | I / ii / V7 vs active concert key center |

**PDF attachments** remain binary in Storage (`song-files`); stand fetches via existing signed-URL path + `can_see_file`. They are **not** generated from ChordPro in Phase 1.

---

## 6. Risks of moving minimal arrangements into Phase 1

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Migration of existing `songs.body`** — every song needs a default arrangement; bugs leave empty charts | High | Transactional migrate + assert row counts; keep `songs.body` read-only fallback for one release |
| **Setlist join complexity** — items need song + arrangement; null `arrangement_id` must resolve to default | Medium | Server helper `resolveArrangement(songId, arrangementId)`; backfill defaults before UI ships |
| **Files dual-scope** — song-level vs arrangement-level files can confuse upload UX | Medium | Default new uploads to **current arrangement**; show “All arrangements” bucket for null `arrangement_id` |
| **Search regression** — song list searches `songs.body` today | Medium | Search `arrangements.body` via join/`exists`, or maintain optional `songs.search_text` trigger later |
| **Larger Phase 1 surface** — arrangements + engine + PDF stand increases schedule/regression risk | Medium | Ship vertical slice: migrate → one arrangement CRUD → ChartView → stand PDF tab; feature-flag PDF if needed |
| **Duplicate metadata** — song still has key/capo/tempo columns during transition | Low | Treat song-level fields as deprecated mirrors of default arrangement until Phase 1.1 cleanup migration |
| **Capo mental model** — concert storage + shape display can confuse leaders used to “write in capo shapes” | Medium | Editor copy: “Write chords in concert key”; shape toggle is view-only; optional “import as shapes + capo” converter later |
| **Set override vs arrangement key** — three key concepts (arrangement concert, set override, temp display) | Medium | Clear stand chrome: “Concert: A · Shape: G (capo 2) · Set override” |
| **RLS expansion** — arrangements need policies parallel to songs | Low | Mirror `is_admin_or_leader()` write / authenticated read in 003 |

**Net assessment:** Pulling arrangements into Phase 1 is the right long-term call and avoids a chart-on-song → chart-on-arrangement rewrite. Main cost is a careful data migration and updating set/file/stand query paths in the same release.

---

## 7. Architecture sketch (Phase 1)

```
Song (library identity: title, artist, tags, status)
  └── Arrangement[] (name, concert key, capo default, tempo, meter, notes, body ChordPro)
        ├── song_files? (arrangement_id nullable)
        └── chart_view_prefs (per user)

SetlistItem → song_id + arrangement_id?
  overrides: override_key / override_capo / …  → view inputs only

Stand:
  resolve arrangement → ChartView(modes) | PDF(signed URL, read-only)
```

```
src/lib/chart/
  parse.ts | chords.ts | transpose.ts | modes.ts | render.ts | types.ts
src/components/chart/
  ChartView.tsx | ChartEditor.tsx | ChartToolbar.tsx
src/components/stand/
  reading-mode.tsx → StandShell (chart | pdf tabs)
```

---

## 8. Approval checklist (revised)

Please confirm:

- [ ] Phase 1 includes minimal arrangements + read-only PDF-in-stand + chart/PDF switch  
- [ ] Annotations remain Phase 2  
- [ ] ChordPro text on `arrangements.body` as sole master; all modes derived  
- [ ] Concert key canonical; shape/capo optional display  
- [ ] `song_files.arrangement_id` + `setlist_items.arrangement_id` as specified  
- [ ] Deprecate writing `songs.body` after migration (keep column temporarily for rollback)

---

*No feature code until this revised plan is approved.*
