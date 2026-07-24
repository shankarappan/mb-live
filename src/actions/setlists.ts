"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLeaderOrAdmin, requireProfile } from "@/lib/auth";
import { positionAfter, rebalancePositions } from "@/lib/positions";
import { createClient } from "@/lib/supabase/server";
import type {
  EventType,
  SetlistItemType,
  SetlistStatus,
} from "@/lib/types/database";

export type ActionState = {
  error?: string;
  success?: string;
};

async function touchSetlist(supabase: Awaited<ReturnType<typeof createClient>>, setlistId: string) {
  await supabase
    .from("setlists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", setlistId);
}

export async function createSetlist(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) {
    return { error: "Only leaders can create set lists." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const payload = {
    name,
    event_date: String(formData.get("event_date") ?? "").trim() || null,
    event_type: (String(formData.get("event_type") ?? "rehearsal") ||
      "rehearsal") as EventType,
    venue: String(formData.get("venue") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    status: (String(formData.get("status") ?? "draft") || "draft") as SetlistStatus,
    created_by: profile.id,
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("setlists")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create set." };

  revalidatePath("/sets");
  redirect(`/sets/${data.id}`);
}

export async function updateSetlist(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) {
    return { error: "Only leaders can edit set lists." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing set id." };

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    event_date: String(formData.get("event_date") ?? "").trim() || null,
    event_type: String(formData.get("event_type") ?? "rehearsal") as EventType,
    venue: String(formData.get("venue") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    status: String(formData.get("status") ?? "draft") as SetlistStatus,
  };

  if (!payload.name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("setlists").update(payload).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/sets");
  revalidatePath(`/sets/${id}`);
  return { success: "Set saved." };
}

export async function addSongToSetlist(formData: FormData) {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) return;

  const setlistId = String(formData.get("setlist_id") ?? "");
  const songId = String(formData.get("song_id") ?? "");
  if (!setlistId || !songId) return;

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("setlist_items")
    .select("position")
    .eq("setlist_id", setlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("setlist_items").insert({
    setlist_id: setlistId,
    song_id: songId,
    item_type: "song",
    position: positionAfter(last?.position),
  });

  await touchSetlist(supabase, setlistId);
  revalidatePath(`/sets/${setlistId}`);
  revalidatePath(`/sets/${setlistId}/stand`);
}

export async function addNonSongItem(formData: FormData) {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) return;

  const setlistId = String(formData.get("setlist_id") ?? "");
  const itemType = String(formData.get("item_type") ?? "break") as SetlistItemType;
  const label = String(formData.get("label") ?? "").trim() || itemType;

  if (!setlistId) return;
  if (!["break", "note", "medley_marker"].includes(itemType)) return;

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("setlist_items")
    .select("position")
    .eq("setlist_id", setlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("setlist_items").insert({
    setlist_id: setlistId,
    song_id: null,
    item_type: itemType,
    label,
    position: positionAfter(last?.position),
  });

  await touchSetlist(supabase, setlistId);
  revalidatePath(`/sets/${setlistId}`);
}

export async function updateSetlistItem(formData: FormData) {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) return;

  const itemId = String(formData.get("item_id") ?? "");
  const setlistId = String(formData.get("setlist_id") ?? "");
  if (!itemId || !setlistId) return;

  const tempoRaw = String(formData.get("override_tempo") ?? "").trim();
  const capoRaw = String(formData.get("override_capo") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("setlist_items")
    .update({
      override_key: String(formData.get("override_key") ?? "").trim() || null,
      override_tempo: tempoRaw ? Number(tempoRaw) : null,
      override_capo: capoRaw ? Number(capoRaw) : null,
      item_note: String(formData.get("item_note") ?? "").trim() || null,
      label: String(formData.get("label") ?? "").trim() || null,
    })
    .eq("id", itemId);

  await touchSetlist(supabase, setlistId);
  revalidatePath(`/sets/${setlistId}`);
  revalidatePath(`/sets/${setlistId}/stand`);
}

export async function removeSetlistItem(formData: FormData) {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) return;

  const itemId = String(formData.get("item_id") ?? "");
  const setlistId = String(formData.get("setlist_id") ?? "");
  if (!itemId || !setlistId) return;

  const supabase = await createClient();
  await supabase.from("setlist_items").delete().eq("id", itemId);
  await touchSetlist(supabase, setlistId);

  revalidatePath(`/sets/${setlistId}`);
  revalidatePath(`/sets/${setlistId}/stand`);
}

export async function reorderSetlistItems(setlistId: string, orderedIds: string[]) {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) {
    return { error: "Only leaders can reorder." };
  }

  if (!setlistId || orderedIds.length === 0) {
    return { error: "Nothing to reorder." };
  }

  const supabase = await createClient();
  const updates = rebalancePositions(orderedIds);

  for (const row of updates) {
    const { error } = await supabase
      .from("setlist_items")
      .update({ position: row.position })
      .eq("id", row.id)
      .eq("setlist_id", setlistId);
    if (error) return { error: error.message };
  }

  await touchSetlist(supabase, setlistId);
  revalidatePath(`/sets/${setlistId}`);
  revalidatePath(`/sets/${setlistId}/stand`);
  return { success: "Reordered." };
}

export async function duplicateSetlist(formData: FormData) {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) return;

  const sourceId = String(formData.get("setlist_id") ?? "");
  if (!sourceId) return;

  const supabase = await createClient();
  const { data: source } = await supabase
    .from("setlists")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();

  if (!source) return;

  const { data: items } = await supabase
    .from("setlist_items")
    .select("*")
    .eq("setlist_id", sourceId)
    .order("position", { ascending: true });

  const { data: created, error } = await supabase
    .from("setlists")
    .insert({
      name: `${source.name} (copy)`,
      event_date: source.event_date,
      event_type: source.event_type,
      venue: source.venue,
      notes: source.notes,
      status: "draft",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !created) return;

  if (items?.length) {
    await supabase.from("setlist_items").insert(
      items.map((item) => ({
        setlist_id: created.id,
        song_id: item.song_id,
        item_type: item.item_type,
        position: item.position,
        override_key: item.override_key,
        override_tempo: item.override_tempo,
        override_capo: item.override_capo,
        item_note: item.item_note,
        label: item.label,
      }))
    );
  }

  revalidatePath("/sets");
  redirect(`/sets/${created.id}`);
}

export async function archiveSetlist(formData: FormData) {
  const profile = await requireProfile();
  if (!isLeaderOrAdmin(profile.role)) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("setlists").update({ status: "archived" }).eq("id", id);
  revalidatePath("/sets");
  revalidatePath(`/sets/${id}`);
}
