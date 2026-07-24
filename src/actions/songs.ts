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

function songPayload(formData: FormData) {
  const tempoRaw = String(formData.get("tempo_bpm") ?? "").trim();
  const capoRaw = String(formData.get("capo") ?? "0").trim();
  const durationRaw = String(formData.get("duration_seconds") ?? "").trim();

  return {
    title: String(formData.get("title") ?? "").trim(),
    artist: String(formData.get("artist") ?? "").trim() || null,
    default_key: String(formData.get("default_key") ?? "").trim() || null,
    alternate_keys: parseAlternateKeys(
      String(formData.get("alternate_keys") ?? "")
    ),
    tempo_bpm: tempoRaw ? Number(tempoRaw) : null,
    time_signature: String(formData.get("time_signature") ?? "4/4").trim() || "4/4",
    capo: capoRaw ? Number(capoRaw) : 0,
    duration_seconds: durationRaw ? Number(durationRaw) : null,
    body: String(formData.get("body") ?? ""),
    arrangement_notes:
      String(formData.get("arrangement_notes") ?? "").trim() || null,
    tags: parseTags(String(formData.get("tags") ?? "")),
  };
}

export async function createSong(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) {
    return { error: "Only leaders can create songs." };
  }

  const payload = songPayload(formData);
  if (!payload.title) return { error: "Title is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("songs")
    .insert({ ...payload, created_by: profile.id })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create song." };

  revalidatePath("/songs");
  redirect(`/songs/${data.id}`);
}

export async function updateSong(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) {
    return { error: "Only leaders can edit songs." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing song id." };

  const payload = songPayload(formData);
  if (!payload.title) return { error: "Title is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("songs").update(payload).eq("id", id);

  if (error) return { error: error.message };

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
