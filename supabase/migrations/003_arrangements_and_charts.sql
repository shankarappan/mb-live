-- Phase 1: arrangements + chart view prefs + FKs
-- Run after 001_schema.sql and 002_perf_storage_indexes.sql

-- ---------------------------------------------------------------------------
-- Arrangements (master ChordPro chart lives here; concert key is canonical)
-- ---------------------------------------------------------------------------
create table if not exists public.arrangements (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  name text not null default 'Original',
  body text not null default '',
  default_key text,
  alternate_keys text[] not null default '{}',
  chart_source_key text,
  capo int not null default 0,
  tempo_bpm int,
  time_signature text not null default '4/4',
  notes text,
  position numeric not null default 1000,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists arrangements_song_id_idx on public.arrangements (song_id);
create index if not exists arrangements_song_position_idx
  on public.arrangements (song_id, position);

drop trigger if exists arrangements_set_updated_at on public.arrangements;
create trigger arrangements_set_updated_at
  before update on public.arrangements
  for each row execute function public.set_updated_at();

alter table public.songs
  add column if not exists default_arrangement_id uuid;

-- Add FK after column exists (safe re-run)
do $$ begin
  alter table public.songs
    add constraint songs_default_arrangement_id_fkey
    foreign key (default_arrangement_id)
    references public.arrangements(id)
    on delete set null;
exception when duplicate_object then null;
end $$;

alter table public.song_files
  add column if not exists arrangement_id uuid
    references public.arrangements(id) on delete cascade;

create index if not exists song_files_arrangement_id_idx
  on public.song_files (arrangement_id);

alter table public.setlist_items
  add column if not exists arrangement_id uuid
    references public.arrangements(id) on delete set null;

create index if not exists setlist_items_arrangement_id_idx
  on public.setlist_items (arrangement_id);

-- ---------------------------------------------------------------------------
-- Migrate existing song charts → default "Original" arrangement
-- ---------------------------------------------------------------------------
insert into public.arrangements (
  song_id, name, body, default_key, alternate_keys, chart_source_key,
  capo, tempo_bpm, time_signature, notes, position, status, created_by
)
select
  s.id,
  'Original',
  coalesce(s.body, ''),
  s.default_key,
  coalesce(s.alternate_keys, '{}'),
  s.default_key,
  coalesce(s.capo, 0),
  s.tempo_bpm,
  coalesce(nullif(s.time_signature, ''), '4/4'),
  s.arrangement_notes,
  1000,
  'active',
  s.created_by
from public.songs s
where not exists (
  select 1 from public.arrangements a where a.song_id = s.id
);

update public.songs s
set default_arrangement_id = a.id
from public.arrangements a
where a.song_id = s.id
  and a.name = 'Original'
  and s.default_arrangement_id is null;

-- ---------------------------------------------------------------------------
-- Per-user chart view preferences
-- ---------------------------------------------------------------------------
create table if not exists public.chart_view_prefs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  arrangement_id uuid not null references public.arrangements(id) on delete cascade,
  view_mode text not null default 'standard'
    check (view_mode in ('standard', 'lyrics', 'nashville', 'roman')),
  display_key text,
  shape_view boolean not null default false,
  capo_fret int,
  updated_at timestamptz not null default now(),
  primary key (user_id, arrangement_id)
);

drop trigger if exists chart_view_prefs_set_updated_at on public.chart_view_prefs;
create trigger chart_view_prefs_set_updated_at
  before update on public.chart_view_prefs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.arrangements enable row level security;
alter table public.chart_view_prefs enable row level security;

drop policy if exists "arrangements_select_authenticated" on public.arrangements;
create policy "arrangements_select_authenticated" on public.arrangements
  for select to authenticated using (true);

drop policy if exists "arrangements_insert_leader" on public.arrangements;
create policy "arrangements_insert_leader" on public.arrangements
  for insert to authenticated
  with check (public.is_admin_or_leader());

drop policy if exists "arrangements_update_leader" on public.arrangements;
create policy "arrangements_update_leader" on public.arrangements
  for update to authenticated
  using (public.is_admin_or_leader())
  with check (public.is_admin_or_leader());

drop policy if exists "arrangements_delete_leader" on public.arrangements;
create policy "arrangements_delete_leader" on public.arrangements
  for delete to authenticated
  using (public.is_admin_or_leader());

drop policy if exists "chart_view_prefs_select_own" on public.chart_view_prefs;
create policy "chart_view_prefs_select_own" on public.chart_view_prefs
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "chart_view_prefs_insert_own" on public.chart_view_prefs;
create policy "chart_view_prefs_insert_own" on public.chart_view_prefs
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "chart_view_prefs_update_own" on public.chart_view_prefs;
create policy "chart_view_prefs_update_own" on public.chart_view_prefs
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "chart_view_prefs_delete_own" on public.chart_view_prefs;
create policy "chart_view_prefs_delete_own" on public.chart_view_prefs
  for delete to authenticated
  using (user_id = auth.uid());
