# Charts & Music Stand — Implementation Plan

**Status:** Proposal only — await approval before coding  
**Date:** 2026-07-26  
**Scope:** Planning Center–style Lyrics & Chords + Music Stand features on the existing MB Live stack (Next.js App Router, Supabase Auth/RLS/Storage, current roles).

---

## 1. Current-state audit

### 1.1 What already exists

| Area | Current state | Evidence |
|------|---------------|----------|
| Song library | CRUD with metadata (key, capo, tempo, tags, status) | `songs` table, `src/actions/songs.ts`, song form |
| Chart source | Single `songs.body` text field (ChordPro-ish) | `001_schema.sql`, `song-form.tsx` |
| Arrangement | Free-text `arrangement_notes` only — **not** a first-class entity | schema + types |
| Chord parsing | Tokenizer for `[Chord]` + lyrics; inline render | `src/lib/chordpro.ts`, `ChordBody` |
| Transpose / Nashville / Roman / lyrics-only | **Not implemented** (`plainTextFromChordPro` unused) | `chordpro.ts` |
| Set overrides | Per-item `override_key`, `override_tempo`, `override_capo`, `item_note` (display only) | `setlist_items`, stand UI |
| Stand / reading mode | Full-screen dark set navigator: swipe, arrows/space, wake lock, stale-set toast | `/sets/[id]/stand`, `ReadingMode` |
| Stand content | Song `body` text only — **no PDF/files/annotations/temp transpose** | `reading-mode.tsx` |
| Files | Typed attachments, instrument targeting, signed URLs, direct upload ≤50 MB (Free plan) | `song_files`, `actions/files.ts` |
| PDF view | Song-detail iframe after signed URL — not in stand | `file-list.tsx` |
| Roles | `admin` / `leader` / `member` + `instruments[]` | `profiles`, RLS |
| File visibility | Everyone (`target_instruments` null) or instrument overlap; leaders/admins see all | `can_see_file()` |
| Song/set visibility | All authenticated users can SELECT all songs & sets (including drafts) | RLS policies |
| Product phasing | SPEC already parks transpose in Phase 2, annotations in Phase 3 | `SPEC.md` §3 |

### 1.2 Gaps vs requested features

**Chord charts**

| Feature | Gap |
|---------|-----|
| Built-in Lyrics & Chords editor | Textarea only; no preview, sections, or structured workflow |
| Master editable chart source | One `body` string; no arrangement-level chart entity |
| Auto transpose + capo-aware display | Capo/key are metadata labels; chords never rewritten |
| View-only transpose (don’t mutate source) | Missing |
| Output modes (standard / lyrics / Nashville / Roman) | Missing |
| Generated downloadable variants | Missing |
| Variants update when master edits | N/A until engine exists (derive at render time) |
| Section structure / arrangement order | Missing ChordPro section directives / section model |
| Team notes in chart workflow | Only free-text `arrangement_notes` / set `item_note` |
| ChordPro parsing | Partial; no `{title}`, `{soc}`, `{key}`, comments, etc. |
| Mid-song modulation markers | Missing |

**Music Stand**

| Feature | Gap |
|---------|-----|
| Full-screen chart + PDF reader | Chart-only; PDF stays on song page |
| Stage dark layout | Present for text stand |
| Annotations (highlight / draw / text) | Missing entirely |
| Quick / temporary transpose in reader | Missing |
| Keyboard / Bluetooth page-turn | Keyboard + swipe only; no HID/pedal abstraction |
| Switch chart modes + attached files | Missing |

**Permissions**

| Feature | Gap |
|---------|-----|
| Role + instrument file rules | Present and should be reused |
| Read-only users see only assigned/published | Missing — all songs/sets readable by any member |

---

## 2. Architecture proposal

### 2.1 Guiding principles

1. **One master chart source** — store ChordPro (or ChordPro-compatible) text; never store four permanent copies of lyrics/chords.
2. **Derive views at render time** — transpose, capo display, lyrics-only, Nashville, Roman are pure functions over the master AST.
3. **Reuse auth/RLS** — keep `admin`/`leader`/`member` and `can_see_file`; extend only where publish/assign is required.
4. **Stand is a viewer over the same engine** — song detail, editor preview, and stand share one chart pipeline.
5. **Annotations are a separate layer** — never mutate the master chart for personal marks.
6. **Arrangements stay lean for Phase 1** — start with one chart per song (current `body`); introduce first-class arrangements when the band truly needs multiple charts per song.

### 2.2 Chart storage format

**Recommended master format:** ChordPro text (enhanced), stored as `text`.

```
{title: Open Road}
{key: G}
{tempo: 118}
{capo: 0}

{start_of_verse: V1}
[G]Rolling out under [C]city lights
{end_of_verse}

{start_of_chorus}
[D]Keep the [Em]signal
{end_of_chorus}

{comment: Key change}
{key: A}          ; redefine key / modulation marker
[A]Second half...
```

**Why ChordPro text (not JSON-first):**

- Already used in the app; leaders can paste from OnSong / Planning Center exports.
- Diff-friendly, editable offline, easy to backup.
- Directives give sections, comments, key/capo without a second schema.

**Optional compiled cache (Phase 1 later / Phase 2):**  
`chart_ast jsonb` column regenerated on save for faster stand loads. Source of truth remains the text; AST is a cache that can be rebuilt.

**Generated variants:**  
Do **not** persist Nashville/Roman/lyrics copies. Persist only:

- `source_key` (canonical key of the written chords)
- `default_display_key` / song `default_key`
- `capo`
- optional user/set **view preferences** (display key, mode)

### 2.3 Chord parsing

Evolve `src/lib/chordpro.ts` into a small chart package:

```
src/lib/chart/
  parse.ts          // text → ChartDocument AST
  chords.ts         // parse/normalize chord tokens (quality, bass, extensions)
  transpose.ts      // pitch-class math + capo
  modes.ts          // lyrics | nashville | roman | standard
  render.ts         // AST → view model (lines with chord-above-lyric slots)
  directives.ts     // {key}, {capo}, {soc}/{eoc}, {comment}, modulation
  types.ts
```

**AST sketch:**

```ts
type ChartDocument = {
  meta: { title?: string; key?: string; capo?: number; tempo?: number };
  blocks: ChartBlock[];
};

type ChartBlock =
  | { type: "section"; name: string; lines: ChartLine[] }
  | { type: "comment"; text: string }
  | { type: "keyChange"; key: string; label?: string } // modulation
  | { type: "paragraph"; lines: ChartLine[] };

type ChartLine = {
  segments: Array<
    | { type: "lyric"; text: string }
    | { type: "chord"; raw: string; root?: PitchClass; quality?: string; bass?: PitchClass }
  >;
};
```

Parser remains tolerant: unknown directives become comments; plain lines stay lyrics.

### 2.4 Transposition engine

**Inputs:**

- Master chart AST + `sourceKey` (from `{key:}` or song `default_key`)
- Requested `displayKey`
- Optional `capo` (fret)
- Capo display mode: `concert` (sounding) vs `shape` (as written with capo)

**Rules:**

1. Compute semitone delta: `displayKey − sourceKey` (enharmonic policy: prefer flats/sharps by target key family).
2. Transpose every parsed chord root/bass by delta.
3. Capo-aware:
   - **Shape mode (common for guitar):** show chords as fingered shapes; label “Capo N → sounds in X”.
   - **Concert mode:** show sounding chords; still show capo badge.
4. **Temporary / view-only transpose:** client (and optional query param / session preference) never writes `songs.body`.
5. **Permanent transpose (leader action):** optional “Rewrite chart to key X” that updates master text + `default_key` after confirm.

**Set integration:**  
Stand/set reader uses `override_key` / `override_capo` as default view inputs when present, without mutating the song.

### 2.5 Generated chart rendering

Shared renderer component tree:

```
ChartView
  props: document | sourceText, displayKey, capo, mode, density
  → parse (or use cache) → transpose → mode transform → layout

Modes:
  standard   → chord-above-lyric (or compact inline for small screens)
  lyrics     → strip chords
  nashville  → degree numbers relative to current key center
  roman      → I / ii / V7 etc. relative to current key center
```

**Downloads / printable variants (Phase 1.5 / Phase 3):**

- Client print stylesheet (`window.print`) for current mode+key
- Optional server PDF generation later (Puppeteer/React-PDF) — not required for Phase 1
- Filename pattern: `{title}-{mode}-{key}.pdf` when export lands

Because variants are derived, **editing the master automatically updates all modes**.

### 2.6 Annotation layer

**Separate table**, keyed by user + target:

```
chart_annotations
  id, user_id, song_id
  arrangement_id null          -- future
  target_type: 'chart' | 'file'
  target_id: song_id or song_files.id
  page_index int null          -- for PDF
  payload jsonb                -- strokes / highlights / text boxes
  updated_at
```

**Payload shape (JSON):**

```json
{
  "version": 1,
  "strokes": [{ "color": "#9A5CFF", "width": 2, "points": [[x,y], ...] }],
  "highlights": [{ "rect": [x,y,w,h], "color": "#FF727A66" }],
  "notes": [{ "x": 0.2, "y": 0.4, "text": "Watch ending" }]
}
```

Coordinates normalized 0–1 so zoom/layout changes remain stable enough for MVP.

**Rendering:** SVG/canvas overlay above chart or PDF page; personal by default (RLS: user reads/writes own rows). Optional “shared with band” flag in Phase 3.

### 2.7 Permissions integration

**Reuse as-is:**

- Song/set write: admin|leader
- Member read of library
- File targeting via `can_see_file` + instruments
- Stand requires authenticated session

**Add (Phase 3, optional Phase 1.5 if needed sooner):**

| Concept | Purpose |
|---------|---------|
| `songs.visibility` | `library` (all members) \| `leaders` \| `assigned` |
| `song_assignments` | user_id / instrument → song visibility when `assigned` |
| `setlists.visibility` or honor `status` | e.g. members only see `final` (+ maybe `draft` for leaders) |

**Read-only members:** already cannot mutate songs/sets; chart editor stays leader/admin; stand gets transpose/view prefs only.

**Do not** invent a parallel role system. Instrument tags remain content filters for files; publish/assign is the new song/set gate.

---

## 3. Recommended database changes

### Phase 1 (minimal)

```sql
-- Chart metadata on songs (body remains master ChordPro source)
alter table public.songs
  add column if not exists chart_source_key text,           -- key the body is written in
  add column if not exists chart_format text not null default 'chordpro',
  add column if not exists chart_updated_at timestamptz;

-- Per-user view preferences (temp transpose / mode survive refresh)
create table if not exists public.chart_view_prefs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  display_key text,
  capo_override int,
  view_mode text not null default 'standard'
    check (view_mode in ('standard','lyrics','nashville','roman')),
  updated_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

alter table public.chart_view_prefs enable row level security;
-- user CRUD own rows only
```

Backfill: `chart_source_key = default_key` where present.

### Phase 2

```sql
create table if not exists public.chart_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  target_type text not null check (target_type in ('chart','file')),
  target_file_id uuid references public.song_files(id) on delete cascade,
  page_index int,
  payload jsonb not null default '{}'::jsonb,
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- RLS: owner full access; shared readable by authenticated if shared=true
```

Optional: `songs.chart_ast jsonb` cache.

### Phase 3

```sql
-- First-class arrangements (only when one chart/song is insufficient)
create table public.arrangements (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  name text not null,
  body text not null default '',
  chart_source_key text,
  capo int not null default 0,
  notes text,
  position numeric not null default 1000,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrate songs.body → default arrangement "Original"

alter table public.songs
  add column if not exists visibility text not null default 'library'
    check (visibility in ('library','leaders','assigned'));

create table public.song_assignments (
  song_id uuid references public.songs(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (song_id, user_id)
);

-- Tighten songs SELECT RLS accordingly
-- Optionally: members SELECT setlists where status = 'final' OR is_admin_or_leader()
```

`setlist_items` may later gain `arrangement_id` FK.

---

## 4. Recommended UI changes

### Phase 1 — Chord editor + transpose + view modes

| Screen | Change |
|--------|--------|
| Song edit | Split editor: ChordPro textarea (left) + live `ChartView` preview (right on tablet/desktop; tabbed on phone) |
| Song edit toolbar | Display key, capo, mode toggle, “Reset to source”, “Rewrite chart to this key…” (leader) |
| Song detail | Replace bare `ChordBody` with `ChartView` + mode/key controls |
| Set item | Overrides feed stand defaults; show “viewing in {override_key}” |
| Stand (light touch) | Mode + temp transpose controls even before full Phase 2 polish |

Keep Signal Deck visual language (dark surfaces, violet/cyan).

### Phase 2 — Music Stand + annotations

| Screen | Change |
|--------|--------|
| `/sets/[id]/stand` | Upgrade to Stand Shell: chart \| lyrics \| numbers \| numerals \| files |
| File pane | PDF.js (or iframe) with page next/prev; reuse signed URLs + `can_see_file` |
| Annotation toolbar | Highlight / pen / text; clear; personal save |
| Navigation | Prev/next set item **and** prev/next PDF page; map PageUp/PageDown, `[` `]`, and configurable key codes for pedals |
| Temp transpose | Persistent for session via `chart_view_prefs` or stand local state |

### Phase 3 — Permissions + modulation + exports

| Screen | Change |
|--------|--------|
| Song settings | Visibility: Library / Leaders / Assigned + assignee picker |
| Arrangement tabs | Multiple arrangements per song when table lands |
| Editor | Explicit “Insert key change” control writing `{key: X}` |
| Export | Print / PDF of current mode+key |
| Admin | Optional draft-set visibility rules |

---

## 5. Phased delivery

### Phase 1 — Chord editor + transpose + view modes

**Goal:** Leaders edit one master ChordPro chart; everyone can view transposed / lyrics / Nashville / Roman without mutating source.

**Deliverables:**

1. Chart package (`parse` / `chords` / `transpose` / `modes` / `render`) with unit tests.
2. Enhanced ChordPro support: sections, comments, `{key}` / `{capo}`, tolerant parse.
3. `ChartView` UI shared by song detail + editor preview.
4. Editor UX: live preview, mode switcher, display-key & capo controls.
5. View-only transpose; optional leader “rewrite master to key”.
6. Capo-aware labeling (shape vs concert — ship shape-first).
7. Wire set `override_key` / `override_capo` into stand/detail defaults.
8. Migration: `chart_source_key`, `chart_view_prefs`.
9. Stand: add mode + temp transpose chrome (even if PDF/annotations wait).

**Out of scope:** PDF-in-stand, annotations, arrangements table, publish/assign.

**Acceptance:**

- Edit master → all four modes update immediately.
- Temp transpose does not change DB `body`.
- Capo + display key produce correct sounding/shape labels.
- Members remain read-only for chart source.

---

### Phase 2 — Music Stand mode + annotations

**Goal:** Gig-ready tablet reader for charts and PDFs with personal marks and pedal-friendly navigation.

**Deliverables:**

1. Stand content switcher: Standard / Lyrics / Nashville / Roman / Files.
2. PDF page viewer in stand (signed URL, page state).
3. Annotation tools (highlight, draw, text) with `chart_annotations` persistence.
4. Quick temp transpose in stand (synced with prefs).
5. Keyboard + Bluetooth page-turn mapping layer (`PageDown` / custom codes).
6. Landscape tablet layout; reduced-motion respect; color-independent status.

**Acceptance:**

- Full set navigable with chart or PDF without leaving stand.
- Annotations reload for the same user; do not alter master chart.
- Pedal-equivalent keys advance PDF page or next set item (documented mapping).

---

### Phase 3 — Advanced permissions + modulation + exports

**Goal:** Assigned/published visibility, robust mid-song key changes, exportable charts, arrangements when needed.

**Deliverables:**

1. Modulation markers first-class in parser + editor insert affordance + stand visual break.
2. Print/PDF export of current derived view.
3. `visibility` + `song_assignments` (+ optional set draft gating) with RLS.
4. First-class `arrangements` table + migrate `songs.body` → default arrangement; set items can pin arrangement.
5. Optional shared annotations; version history stretch goal.

**Acceptance:**

- Members with `assigned` visibility only see assigned songs.
- Mid-song `{key:}` changes transpose subsequent sections correctly.
- Export matches on-screen mode/key.

---

## 6. Suggested module & route map

```
src/lib/chart/*                 # engine (Phase 1)
src/components/chart/ChartView.tsx
src/components/chart/ChartEditor.tsx
src/components/chart/ChartToolbar.tsx
src/components/stand/*          # evolve ReadingMode → StandShell (Phase 2)
src/actions/chart-prefs.ts
src/actions/annotations.ts      # Phase 2
supabase/migrations/003_charts.sql
supabase/migrations/004_annotations.sql
supabase/migrations/005_visibility_arrangements.sql
```

No new hosting. Continue Vercel + Supabase. Preserve Signal Deck shell.

---

## 7. Risks & decisions to confirm before coding

1. **Arrangements timing** — Recommend deferring first-class arrangements to Phase 3 unless you need multiple charts per song immediately.
2. **Capo default mode** — Recommend **shape** (guitarist) with sounding key badge; confirm for your band.
3. **Nashville / Roman quality** — Complex chords (sus, add9, slash) need a defined simplification policy.
4. **PDF engine** — Prefer PDF.js in-browser over server rasterization for annotations + page index.
5. **Publish model** — Confirm whether members should stop seeing `draft` sets once visibility work starts.
6. **Asset constraint** — Keep master as text ChordPro; avoid duplicating chart bodies in Storage.

---

## 8. Approval checklist

Please confirm before implementation:

- [ ] Phase order (1 → 2 → 3) as written  
- [ ] ChordPro text as master format (derive all modes)  
- [ ] Defer arrangements table to Phase 3  
- [ ] Capo display default: shape vs concert  
- [ ] Phase 3 visibility model (library / leaders / assigned)  
- [ ] Any must-have pulled forward (e.g. PDF-in-stand into Phase 1)

---

## 9. Summary

MB Live already has the **right skeleton**: song `body`, set key/capo overrides, dark stand navigation, and instrument-targeted files. The missing core is a **real chart engine** (parse → transpose → mode render) plus a **stand content switcher** and **annotation layer**. Prefer derived views over stored variants, reuse existing roles/file RLS, and introduce arrangements/publish controls only when the band outgrows one chart and open library access.
