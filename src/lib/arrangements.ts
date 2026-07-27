import type { Arrangement, Song } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve arrangement for a song (explicit id or song default / first active). */
export async function resolveArrangement(
  supabase: SupabaseClient,
  songId: string,
  arrangementId?: string | null
): Promise<Arrangement | null> {
  if (arrangementId) {
    const { data } = await supabase
      .from("arrangements")
      .select("*")
      .eq("id", arrangementId)
      .eq("song_id", songId)
      .maybeSingle();
    if (data) return data as Arrangement;
  }

  const { data: song } = await supabase
    .from("songs")
    .select("default_arrangement_id")
    .eq("id", songId)
    .maybeSingle();

  if (song?.default_arrangement_id) {
    const { data } = await supabase
      .from("arrangements")
      .select("*")
      .eq("id", song.default_arrangement_id)
      .maybeSingle();
    if (data) return data as Arrangement;
  }

  const { data: first } = await supabase
    .from("arrangements")
    .select("*")
    .eq("song_id", songId)
    .eq("status", "active")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (first as Arrangement | null) ?? null;
}

/** Fallback chart fields when arrangements table is not yet migrated. */
export function songAsLegacyArrangement(song: Song): Arrangement {
  return {
    id: song.default_arrangement_id || song.id,
    song_id: song.id,
    name: "Original",
    body: song.body ?? "",
    default_key: song.default_key,
    alternate_keys: song.alternate_keys ?? [],
    chart_source_key: song.default_key,
    capo: song.capo ?? 0,
    tempo_bpm: song.tempo_bpm,
    time_signature: song.time_signature || "4/4",
    notes: song.arrangement_notes,
    position: 1000,
    status: "active",
    created_by: song.created_by,
    created_at: song.created_at,
    updated_at: song.updated_at,
  };
}
