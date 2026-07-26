import { notFound } from "next/navigation";
import { ReadingMode } from "@/components/stand/reading-mode";
import { songAsLegacyArrangement } from "@/lib/arrangements";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  Arrangement,
  ChartViewPrefs,
  Setlist,
  SetlistItemWithSong,
  Song,
  SongFile,
} from "@/lib/types/database";

export default async function StandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const { data: setlist } = await supabase
    .from("setlists")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!setlist) notFound();

  let baseItems: SetlistItemWithSong[] = [];
  const withArr = await supabase
    .from("setlist_items")
    .select("*, song:songs(*), arrangement:arrangements(*)")
    .eq("setlist_id", id)
    .order("position", { ascending: true });

  if (withArr.error) {
    const fallback = await supabase
      .from("setlist_items")
      .select("*, song:songs(*)")
      .eq("setlist_id", id)
      .order("position", { ascending: true });
    baseItems = (fallback.data as SetlistItemWithSong[] | null) ?? [];
  } else {
    baseItems = (withArr.data as SetlistItemWithSong[] | null) ?? [];
  }

  const songIds = [
    ...new Set(
      baseItems
        .map((item) => item.song_id)
        .filter((sid): sid is string => Boolean(sid)),
    ),
  ];

  const filesBySong = new Map<string, SongFile[]>();
  if (songIds.length > 0) {
    const { data: files } = await supabase
      .from("song_files")
      .select("*")
      .in("song_id", songIds)
      .order("created_at", { ascending: false });
    for (const file of (files as SongFile[] | null) ?? []) {
      const list = filesBySong.get(file.song_id) ?? [];
      list.push(file);
      filesBySong.set(file.song_id, list);
    }
  }

  const missingSongIds = baseItems
    .filter(
      (item) =>
        item.item_type === "song" &&
        item.song_id &&
        !item.arrangement &&
        item.song,
    )
    .map((item) => item.song_id as string);

  const defaultArrBySong = new Map<string, Arrangement>();
  if (missingSongIds.length > 0) {
    const { data: defaults, error } = await supabase
      .from("arrangements")
      .select("*")
      .in("song_id", missingSongIds)
      .eq("status", "active")
      .order("position", { ascending: true });
    if (!error) {
      for (const arr of (defaults as Arrangement[] | null) ?? []) {
        if (!defaultArrBySong.has(arr.song_id)) {
          defaultArrBySong.set(arr.song_id, arr);
        }
      }
    }
  }

  const arrangementIds = new Set<string>();
  const items: SetlistItemWithSong[] = baseItems.map((item) => {
    let arrangement = item.arrangement ?? null;
    if (!arrangement && item.song_id) {
      arrangement =
        defaultArrBySong.get(item.song_id) ??
        (item.song ? songAsLegacyArrangement(item.song as Song) : null);
    }
    if (arrangement) arrangementIds.add(arrangement.id);
    return {
      ...item,
      arrangement,
      files: item.song_id ? (filesBySong.get(item.song_id) ?? []) : [],
    };
  });

  const prefsByArrangement: Record<string, ChartViewPrefs | null> = {};
  if (arrangementIds.size > 0) {
    const { data: prefs, error } = await supabase
      .from("chart_view_prefs")
      .select("*")
      .eq("user_id", profile.id)
      .in("arrangement_id", [...arrangementIds]);
    if (!error) {
      for (const row of (prefs as ChartViewPrefs[] | null) ?? []) {
        prefsByArrangement[row.arrangement_id] = row;
      }
    }
  }

  return (
    <ReadingMode
      setlist={setlist as Setlist}
      items={items}
      initialUpdatedAt={(setlist as Setlist).updated_at}
      prefsByArrangement={prefsByArrangement}
    />
  );
}
