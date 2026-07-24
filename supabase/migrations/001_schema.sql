-- MB Live schema + RLS
-- Run in Supabase SQL Editor (or supabase db push)

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type public.user_role as enum ('admin', 'leader', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.song_status as enum ('active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.file_type as enum (
    'lyric_sheet', 'chord_chart', 'lead_sheet',
    'mp3', 'stem', 'click', 'guide', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_type as enum ('rehearsal', 'gig', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.setlist_status as enum ('draft', 'final', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.setlist_item_type as enum ('song', 'break', 'note', 'medley_marker');
exception when duplicate_object then null; end $$;

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text unique not null,
  role public.user_role not null default 'member',
  instruments text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Songs
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  default_key text,
  alternate_keys text[] not null default '{}',
  tempo_bpm int,
  time_signature text not null default '4/4',
  capo int not null default 0,
  duration_seconds int,
  body text not null default '',
  arrangement_notes text,
  tags text[] not null default '{}',
  status public.song_status not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists songs_title_idx on public.songs (title);
create index if not exists songs_status_idx on public.songs (status);
create index if not exists songs_tags_idx on public.songs using gin (tags);

-- Song files
create table if not exists public.song_files (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  file_type public.file_type not null default 'other',
  storage_path text not null,
  filename text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  target_instruments text[] null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists song_files_song_id_idx on public.song_files (song_id);

-- Set lists
create table if not exists public.setlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  event_type public.event_type not null default 'rehearsal',
  venue text,
  notes text,
  status public.setlist_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists setlists_event_date_idx on public.setlists (event_date desc nulls last);

-- Set list items (fractional position for cheap reorders)
create table if not exists public.setlist_items (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  song_id uuid references public.songs(id) on delete set null,
  item_type public.setlist_item_type not null default 'song',
  position numeric not null,
  override_key text,
  override_tempo int,
  override_capo int,
  item_note text,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists setlist_items_setlist_pos_idx
  on public.setlist_items (setlist_id, position);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

drop trigger if exists setlists_set_updated_at on public.setlists;
create trigger setlists_set_updated_at
  before update on public.setlists
  for each row execute function public.set_updated_at();

-- Auto-create profile on auth signup (invite / magic link)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role, instruments)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'member'), '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'member'),
    coalesce(
      array(select jsonb_array_elements_text(new.raw_user_meta_data->'instruments')),
      '{}'::text[]
    )
  )
  on conflict (id) do update set
    email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers for RLS
create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin_or_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'leader')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.can_see_file(target text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin_or_leader()
    or target is null
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.instruments && target
    );
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.song_files enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_items enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated
  using (true);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()))
    or public.is_admin()
  );

-- Songs policies
drop policy if exists "songs_select_authenticated" on public.songs;
create policy "songs_select_authenticated" on public.songs
  for select to authenticated using (true);

drop policy if exists "songs_insert_leader" on public.songs;
create policy "songs_insert_leader" on public.songs
  for insert to authenticated
  with check (public.is_admin_or_leader());

drop policy if exists "songs_update_leader" on public.songs;
create policy "songs_update_leader" on public.songs
  for update to authenticated
  using (public.is_admin_or_leader())
  with check (public.is_admin_or_leader());

drop policy if exists "songs_delete_leader" on public.songs;
create policy "songs_delete_leader" on public.songs
  for delete to authenticated
  using (public.is_admin_or_leader());

-- Song files policies
drop policy if exists "song_files_select_targeted" on public.song_files;
create policy "song_files_select_targeted" on public.song_files
  for select to authenticated
  using (public.can_see_file(target_instruments));

drop policy if exists "song_files_insert_authenticated" on public.song_files;
create policy "song_files_insert_authenticated" on public.song_files
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      public.is_admin_or_leader()
      or target_instruments is null
      or target_instruments && (select instruments from public.profiles where id = auth.uid())
    )
  );

drop policy if exists "song_files_update_own_or_leader" on public.song_files;
create policy "song_files_update_own_or_leader" on public.song_files
  for update to authenticated
  using (uploaded_by = auth.uid() or public.is_admin_or_leader())
  with check (uploaded_by = auth.uid() or public.is_admin_or_leader());

drop policy if exists "song_files_delete_own_or_leader" on public.song_files;
create policy "song_files_delete_own_or_leader" on public.song_files
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_admin_or_leader());

-- Setlists policies
drop policy if exists "setlists_select_authenticated" on public.setlists;
create policy "setlists_select_authenticated" on public.setlists
  for select to authenticated using (true);

drop policy if exists "setlists_insert_leader" on public.setlists;
create policy "setlists_insert_leader" on public.setlists
  for insert to authenticated
  with check (public.is_admin_or_leader());

drop policy if exists "setlists_update_leader" on public.setlists;
create policy "setlists_update_leader" on public.setlists
  for update to authenticated
  using (public.is_admin_or_leader())
  with check (public.is_admin_or_leader());

drop policy if exists "setlists_delete_leader" on public.setlists;
create policy "setlists_delete_leader" on public.setlists
  for delete to authenticated
  using (public.is_admin_or_leader());

-- Setlist items policies
drop policy if exists "setlist_items_select_authenticated" on public.setlist_items;
create policy "setlist_items_select_authenticated" on public.setlist_items
  for select to authenticated using (true);

drop policy if exists "setlist_items_mutate_leader" on public.setlist_items;
create policy "setlist_items_mutate_leader" on public.setlist_items
  for all to authenticated
  using (public.is_admin_or_leader())
  with check (public.is_admin_or_leader());

-- Private storage bucket
insert into storage.buckets (id, name, public, file_size_limit)
values ('song-files', 'song-files', false, 209715200)
on conflict (id) do update set
  public = false,
  file_size_limit = 209715200;

-- Storage: authenticated users can upload under their user folder; leaders anywhere
drop policy if exists "song_files_storage_select" on storage.objects;
create policy "song_files_storage_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'song-files');

drop policy if exists "song_files_storage_insert" on storage.objects;
create policy "song_files_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'song-files');

drop policy if exists "song_files_storage_update" on storage.objects;
create policy "song_files_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'song-files' and (owner = auth.uid() or public.is_admin_or_leader()));

drop policy if exists "song_files_storage_delete" on storage.objects;
create policy "song_files_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'song-files' and (owner = auth.uid() or public.is_admin_or_leader()));
