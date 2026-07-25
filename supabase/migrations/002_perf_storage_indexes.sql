-- Performance indexes + tighter private storage policies for direct uploads.
-- Apply in Supabase SQL Editor after 001_schema.sql (or via supabase db push).

-- ---------------------------------------------------------------------------
-- Indexes for common list / join paths (each tied to a real query)
-- ---------------------------------------------------------------------------

-- Home: recent active songs ordered by updated_at
create index if not exists songs_status_updated_at_idx
  on public.songs (status, updated_at desc);

-- Songs library: active/archived title sort + key filter
create index if not exists songs_status_title_idx
  on public.songs (status, title);

create index if not exists songs_default_key_idx
  on public.songs (default_key);

-- Home upcoming sets + Sets page date ordering
create index if not exists setlists_status_event_date_idx
  on public.setlists (status, event_date desc nulls last);

-- Storage policy / finalize lookups by object path
create unique index if not exists song_files_storage_path_uidx
  on public.song_files (storage_path);

-- Admin membership/role scans
create index if not exists profiles_role_idx
  on public.profiles (role);

-- ---------------------------------------------------------------------------
-- Storage: private bucket; no public list/download
-- Direct uploads use short-lived signed upload URLs (service role).
-- Downloads use server-issued signed download URLs.
-- ---------------------------------------------------------------------------

-- Align bucket cap with the proven Free-plan global Storage limit (50 MB).
-- Raise both the Supabase global limit (Pro+) and this value to restore 200 MB.
update storage.buckets
set public = false,
    file_size_limit = 52428800
where id = 'song-files';

drop policy if exists "song_files_storage_select" on storage.objects;
drop policy if exists "song_files_storage_insert" on storage.objects;
drop policy if exists "song_files_storage_update" on storage.objects;
drop policy if exists "song_files_storage_delete" on storage.objects;

-- Authenticated users may only SELECT objects that have a visible song_files row.
-- (Signed download URLs are still issued server-side with service role.)
create policy "song_files_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'song-files'
    and exists (
      select 1
      from public.song_files sf
      where sf.storage_path = name
        and public.can_see_file(sf.target_instruments)
    )
  );

-- No broad authenticated INSERT. Uploads go through createSignedUploadUrl tokens
-- issued by the server (service role). Leaders/admins may still insert via
-- service role for maintenance; members cannot list/upload arbitrary paths.
-- Keep a narrow owner-path insert as a fallback for non-signed client tools.
create policy "song_files_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'song-files'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "song_files_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'song-files'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_admin_or_leader()
    )
  )
  with check (
    bucket_id = 'song-files'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_admin_or_leader()
    )
  );

create policy "song_files_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'song-files'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_admin_or_leader()
    )
  );
