# Linked arrangements — proposal (not implemented)

**Status:** Design proposal only — do **not** implement without reviewing migration impact  
**Date:** 2026-07-27  
**Depends on:** Phase 1 arrangements + `rewriteChartToKey` / `planChartTranspose`

---

## Goal

Better-than–Planning Center: keep one **master** ChordPro chart and derive key-specific arrangements dynamically, while preserving today’s independent editable arrangements.

---

## Proposed model

| Field | Type | Purpose |
|-------|------|---------|
| `source_arrangement_id` | `uuid null` FK → `arrangements(id)` | Master chart this row derives from (`null` = independent) |
| `arrangement_mode` | `text` (`independent` \| `linked`) | Explicit mode; default `independent` |
| `transposition_semitones` | `int` | Optional cache of `semitoneDelta(master.chart_source_key, this.default_key)` |
| `source_revision` | `timestamptz` or `int` | Optional stale detection vs master `updated_at` / version |

**Behaviour**

- **Independent (current):** editable `body`; `chart_source_key` agrees with stored chords.
- **Linked:** `body` may be empty or a materialised cache; render uses `planChartTranspose(master.body, master.chart_source_key, linked.default_key)` (or live `buildChartView`). Capo/shape stay on `chart_view_prefs` / arrangement defaults.
- **Detach from master:** run transpose once, write body, set `arrangement_mode = independent`, clear `source_arrangement_id`.
- Corrections to the master appear in linked views automatically until detach.

---

## Suggested migration (draft — do not apply yet)

```sql
alter table public.arrangements
  add column if not exists arrangement_mode text not null default 'independent'
    check (arrangement_mode in ('independent', 'linked')),
  add column if not exists source_arrangement_id uuid
    references public.arrangements(id) on delete restrict,
  add column if not exists transposition_semitones int,
  add column if not exists source_revision timestamptz;

create index if not exists arrangements_source_id_idx
  on public.arrangements (source_arrangement_id)
  where source_arrangement_id is not null;

-- Prevent cycles: linked rows must not be masters of others (app-enforced);
-- optional DB check via trigger.
```

---

## Compatibility analysis

| Concern | Impact | Mitigation |
|---------|--------|------------|
| Existing rows | All remain `independent` with current body | Default column values; no rewrite of bodies |
| Setlist `arrangement_id` | Still points at a concrete arrangement row | Stand resolves linked → load master + transpose at read time |
| `chart_view_prefs` | Still per arrangement id | OK; prefs are display, not master text |
| Search (`songs.body` mirror) | Only default/independent mirrors today | Keep mirroring default independent arrangement only; do not mirror linked empties |
| PDF `song_files.arrangement_id` | Files stay on the arrangement they were uploaded to | Linked rows share or inherit song-level PDFs (product choice) |
| RLS | Same leader write / all read | Add policy: cannot delete master while linked children exist (`ON DELETE RESTRICT`) |
| Offline / export | Linked needs master body at render | Detach before export, or join master in export query |
| Performance | Extra read of master per linked stand item | Batch-fetch masters by id set; optional body cache column refreshed on master save |

---

## Product rules to decide before coding

1. Can a linked arrangement have its own PDF attachments, or only the master?
2. On master delete: block vs cascade-detach children?
3. Is linked `body` always empty, or a stale-safe cache?
4. Who can create linked vs independent copies?

---

## Implementation order (when approved)

1. Migration + types  
2. Read path: `resolveArrangementChart(arrangement)` returns `{ body, sourceKey }`  
3. UI: “Link to master” / “Detach”  
4. Stop writing transposed body on create when user chooses **linked** mode  
5. Tests: master edit reflects in linked stand; detach freezes body  

**No database migration is required for the Phase 1 transpose-on-create fix shipped alongside this proposal.**
