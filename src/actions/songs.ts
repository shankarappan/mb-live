"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLeaderOrAdmin, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  error?: string;
  success?: string;
};

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseAlternateKeys(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function songLibraryPayload(formData: FormData) {
  const durationRaw = String(formData.get("duration_seconds") ?? "").trim();

  return {
    title: String(formData.get("title") ?? "").trim(),
    artist: String(formData.get("artist") ?? "").trim() || null,
    alternate_keys: parseAlternateKeys(
      String(formData.get("alternate_keys") ?? ""),
    ),
    duration_seconds: durationRaw ? Number(durationRaw) : null,
    tags: parseTags(String(formData.get("tags") ?? "")),
  };
}

function chartPayload(formData: FormData) {
  const tempoRaw = String(formData.get("tempo_bpm") ?? "").trim();
  const capoRaw = String(formData.get("capo") ?? "0").trim();
  const defaultKey = String(formData.get("default_key") ?? "").trim() || null;

  return {
    default_key: defaultKey,
    tempo_bpm: tempoRaw ? Number(tempoRaw) : null,
    time_signature:
      String(formData.get("time_signature") ?? "4/4").trim() || "4/4",
    capo: capoRaw ? Number(capoRaw) : 0,
    body: String(formData.get("body") ?? ""),
    arrangement_notes:
      String(formData.get("arrangement_notes") ?? "").trim() || null,
  };
}

export async function createSong(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) {
    return { error: "Only leaders can create songs." };
  }

  const library = songLibraryPayload(formData);
  const chart = chartPayload(formData);
  if (!library.title) return { error: "Title is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("songs")
    .insert({
      ...library,
      ...chart,
      alternate_keys: [
        ...new Set([
          ...library.alternate_keys,
          ...parseAlternateKeys(String(formData.get("alternate_keys") ?? "")),
        ]),
      ],
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create song." };

  // Prefer first-class arrangement when migration 003 is applied.
  const { data: arrangement, error: arrError } = await supabase
    .from("arrangements")
    .insert({
      song_id: data.id,
      name: "Original",
      body: chart.body,
      default_key: chart.default_key,
      chart_source_key: chart.default_key,
      alternate_keys: library.alternate_keys,
      capo: chart.capo,
      tempo_bpm: chart.tempo_bpm,
      time_signature: chart.time_signature,
      notes: chart.arrangement_notes,
      position: 1000,
      created_by: profile.id,
    })
    .select("id")
    .maybeSingle();

  if (!arrError && arrangement?.id) {
    await supabase
      .from("songs")
      .update({ default_arrangement_id: arrangement.id })
      .eq("id", data.id);
  }

  revalidatePath("/songs");
  redirect(`/songs/${data.id}`);
}

export async function updateSong(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) {
    return { error: "Only leaders can edit songs." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing song id." };

  const library = songLibraryPayload(formData);
  if (!library.title) return { error: "Title is required." };

  // Library metadata only on edit — chart lives on arrangements.
  // Optionally sync mirrors if chart fields are present (create-style forms).
  const hasChartFields = formData.has("body") || formData.has("default_key");
  const chart = hasChartFields ? chartPayload(formData) : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("songs")
    .update({
      ...library,
      ...(chart ?? {}),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  if (chart) {
    const { data: song } = await supabase
      .from("songs")
      .select("default_arrangement_id")
      .eq("id", id)
      .maybeSingle();

    if (song?.default_arrangement_id) {
      await supabase
        .from("arrangements")
        .update({
          body: chart.body,
          default_key: chart.default_key,
          chart_source_key: chart.default_key,
          capo: chart.capo,
          tempo_bpm: chart.tempo_bpm,
          time_signature: chart.time_signature,
          notes: chart.arrangement_notes,
          alternate_keys: library.alternate_keys,
        })
        .eq("id", song.default_arrangement_id);
    }
  }

  revalidatePath("/songs");
  revalidatePath(`/songs/${id}`);
  redirect(`/songs/${id}`);
}

export async function archiveSong(formData: FormData) {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("songs").update({ status: "archived" }).eq("id", id);

  revalidatePath("/songs");
  revalidatePath(`/songs/${id}`);
  redirect("/songs");
}

export async function restoreSong(formData: FormData) {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("songs").update({ status: "active" }).eq("id", id);

  revalidatePath("/songs");
  revalidatePath(`/songs/${id}`);
}
