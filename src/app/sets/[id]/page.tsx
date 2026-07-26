import { notFound } from "next/navigation";
import { archiveSetlist, duplicateSetlist } from "@/actions/setlists";
import { AppShell } from "@/components/layout/app-shell";
import { AddSongPanel } from "@/components/sets/add-song-panel";
import { SetlistMetaForm } from "@/components/sets/setlist-meta-form";
import { SortableSetlist } from "@/components/sets/sortable-setlist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { isLeaderOrAdmin, requireProfile } from "@/lib/auth";
import { LIST_PAGE_SIZE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  Arrangement,
  Setlist,
  SetlistItemWithSong,
  Song,
} from "@/lib/types/database";

export default async function SetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const editable = isLeaderOrAdmin(profile.role);

  const { data: setlist } = await supabase
    .from("setlists")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!setlist) notFound();

  const withArr = await supabase
    .from("setlist_items")
    .select("*, song:songs(*), arrangement:arrangements(*)")
    .eq("setlist_id", id)
    .order("position", { ascending: true })
    .limit(300);

  let ordered: SetlistItemWithSong[] = [];
  if (withArr.error) {
    const fallback = await supabase
      .from("setlist_items")
      .select("*, song:songs(*)")
      .eq("setlist_id", id)
      .order("position", { ascending: true })
      .limit(300);
    ordered = (fallback.data as SetlistItemWithSong[] | null) ?? [];
  } else {
    ordered = (withArr.data as SetlistItemWithSong[] | null) ?? [];
  }

  let songList: Song[] = [];
  if (editable) {
    const songsQuery = await supabase
      .from("songs")
      .select(
        "id, title, artist, default_key, tempo_bpm, status, default_arrangement_id",
      )
      .eq("status", "active")
      .order("title")
      .limit(LIST_PAGE_SIZE);
    if (songsQuery.error) {
      const legacy = await supabase
        .from("songs")
        .select("id, title, artist, default_key, tempo_bpm, status")
        .eq("status", "active")
        .order("title")
        .limit(LIST_PAGE_SIZE);
      songList = (legacy.data as Song[] | null) ?? [];
    } else {
      songList = (songsQuery.data as Song[] | null) ?? [];
    }
  }

  const songIdsForArr = [
    ...new Set([
      ...ordered
        .map((i) => i.song_id)
        .filter((sid): sid is string => Boolean(sid)),
      ...songList.map((s) => s.id),
    ]),
  ];

  const arrangementsBySong: Record<string, Arrangement[]> = {};
  if (songIdsForArr.length > 0) {
    const { data: arrs, error } = await supabase
      .from("arrangements")
      .select("*")
      .in("song_id", songIdsForArr)
      .eq("status", "active")
      .order("position", { ascending: true });
    if (!error) {
      for (const arr of (arrs as Arrangement[] | null) ?? []) {
        const list = arrangementsBySong[arr.song_id] ?? [];
        list.push(arr);
        arrangementsBySong[arr.song_id] = list;
      }
    }
  }

  const s = setlist as Setlist;

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="font-display text-3xl">{s.name}</h1>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="capitalize">
                {s.status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {s.event_type}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/sets/${s.id}/stand`}>Reading mode</LinkButton>
            {editable && (
              <>
                <form action={duplicateSetlist}>
                  <input type="hidden" name="setlist_id" value={s.id} />
                  <Button type="submit" variant="secondary" size="default">
                    Duplicate
                  </Button>
                </form>
                {s.status !== "archived" && (
                  <form action={archiveSetlist}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="ghost">
                      Archive
                    </Button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>

        {editable && <SetlistMetaForm setlist={s} />}

        <section className="space-y-3">
          <h2 className="font-display text-xl">Order</h2>
          <SortableSetlist
            setlistId={s.id}
            items={ordered}
            editable={editable}
            arrangementsBySong={arrangementsBySong}
          />
        </section>

        {editable && (
          <AddSongPanel
            setlistId={s.id}
            songs={songList}
            arrangementsBySong={arrangementsBySong}
          />
        )}
      </div>
    </AppShell>
  );
}
