"use server";

import { revalidatePath } from "next/cache";
import { isLeaderOrAdmin, requireProfile } from "@/lib/auth";
import { rewriteChartToKey } from "@/lib/chart";
import { createClient } from "@/lib/supabase/server";
import type { ChartViewMode } from "@/lib/types/database";

export type ActionState = {
  error?: string;
  success?: string;
};

function parseAlternateKeys(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createArrangement(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) {
    return { error: "Only leaders can create arrangements." };
  }

  const songId = String(formData.get("song_id") ?? "");
  const name = String(formData.get("name") ?? "").trim() || "Arrangement";
  if (!songId) return { error: "Missing song." };

  const supabase = await createClient();
  const { data: maxPos } = await supabase
    .from("arrangements")
    .select("position")
    .eq("song_id", songId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = Number(maxPos?.position ?? 0) + 1000;
  const defaultKey = String(formData.get("default_key") ?? "").trim() || null;

  const { data, error } = await supabase
    .from("arrangements")
    .insert({
      song_id: songId,
      name,
      body: String(formData.get("body") ?? ""),
      default_key: defaultKey,
      chart_source_key: defaultKey,
      alternate_keys: parseAlternateKeys(
        String(formData.get("alternate_keys") ?? "")
      ),
      capo: Number(formData.get("capo") ?? 0) || 0,
      tempo_bpm: String(formData.get("tempo_bpm") ?? "").trim()
        ? Number(formData.get("tempo_bpm"))
        : null,
      time_signature:
        String(formData.get("time_signature") ?? "4/4").trim() || "4/4",
      notes: String(formData.get("notes") ?? "").trim() || null,
      position,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Create failed." };

  revalidatePath(`/songs/${songId}`);
  return { success: "Arrangement created." };
}

export async function updateArrangement(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) {
    return { error: "Only leaders can edit arrangements." };
  }

  const id = String(formData.get("id") ?? "");
  const songId = String(formData.get("song_id") ?? "");
  if (!id) return { error: "Missing arrangement." };

  const defaultKey = String(formData.get("default_key") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "");
  const rewrite = formData.get("rewrite_to_display") === "1";
  const displayKey = String(formData.get("display_key") ?? "").trim();

  let nextBody = body;
  let nextKey = defaultKey;
  let chartSourceKey =
    String(formData.get("chart_source_key") ?? "").trim() || defaultKey;

  if (rewrite && displayKey && chartSourceKey) {
    const rewritten = rewriteChartToKey(body, chartSourceKey, displayKey);
    nextBody = rewritten.body;
    nextKey = rewritten.key;
    chartSourceKey = rewritten.key;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("arrangements")
    .update({
      name: String(formData.get("name") ?? "").trim() || "Arrangement",
      body: nextBody,
      default_key: nextKey,
      chart_source_key: chartSourceKey,
      alternate_keys: parseAlternateKeys(
        String(formData.get("alternate_keys") ?? "")
      ),
      capo: Number(formData.get("capo") ?? 0) || 0,
      tempo_bpm: String(formData.get("tempo_bpm") ?? "").trim()
        ? Number(formData.get("tempo_bpm"))
        : null,
      time_signature:
        String(formData.get("time_signature") ?? "4/4").trim() || "4/4",
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Keep legacy song mirrors in sync for default arrangement (search/fallback)
  if (songId) {
    const { data: song } = await supabase
      .from("songs")
      .select("default_arrangement_id")
      .eq("id", songId)
      .maybeSingle();
    if (song?.default_arrangement_id === id) {
      await supabase
        .from("songs")
        .update({
          body: nextBody,
          default_key: nextKey,
          capo: Number(formData.get("capo") ?? 0) || 0,
          tempo_bpm: String(formData.get("tempo_bpm") ?? "").trim()
            ? Number(formData.get("tempo_bpm"))
            : null,
          time_signature:
            String(formData.get("time_signature") ?? "4/4").trim() || "4/4",
          arrangement_notes:
            String(formData.get("notes") ?? "").trim() || null,
        })
        .eq("id", songId);
    }
  }

  revalidatePath(`/songs/${songId}`);
  revalidatePath("/sets");
  return { success: rewrite ? "Chart rewritten to new concert key." : "Saved." };
}

export async function setDefaultArrangement(formData: FormData) {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) return;

  const songId = String(formData.get("song_id") ?? "");
  const arrangementId = String(formData.get("arrangement_id") ?? "");
  if (!songId || !arrangementId) return;

  const supabase = await createClient();
  await supabase
    .from("songs")
    .update({ default_arrangement_id: arrangementId })
    .eq("id", songId);

  revalidatePath(`/songs/${songId}`);
}

export async function saveChartViewPrefs(input: {
  arrangementId: string;
  viewMode: ChartViewMode;
  displayKey: string | null;
  shapeView: boolean;
  capoFret: number | null;
}): Promise<ActionState> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("chart_view_prefs").upsert(
    {
      user_id: profile.id,
      arrangement_id: input.arrangementId,
      view_mode: input.viewMode,
      display_key: input.displayKey,
      shape_view: input.shapeView,
      capo_fret: input.capoFret,
    },
    { onConflict: "user_id,arrangement_id" }
  );
  if (error) return { error: error.message };
  return { success: "Preferences saved." };
}
