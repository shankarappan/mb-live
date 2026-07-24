"use server";

import { revalidatePath } from "next/cache";
import { isLeaderOrAdmin, requireProfile } from "@/lib/auth";
import { INSTRUMENTS, MAX_FILE_BYTES, STORAGE_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { FileType } from "@/lib/types/database";

export type ActionState = {
  error?: string;
  success?: string;
  url?: string;
};

const FILE_TYPE_VALUES: FileType[] = [
  "lyric_sheet",
  "chord_chart",
  "lead_sheet",
  "mp3",
  "stem",
  "click",
  "guide",
  "other",
];

export async function uploadSongFile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const songId = String(formData.get("song_id") ?? "");
  const fileType = String(formData.get("file_type") ?? "other") as FileType;
  const everyone = formData.get("everyone") === "on" || formData.get("everyone") === "true";
  const instruments = formData
    .getAll("target_instruments")
    .map(String)
    .filter((i) => (INSTRUMENTS as readonly string[]).includes(i));
  const file = formData.get("file");

  if (!songId) return { error: "Missing song." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "File exceeds 200 MB limit." };
  }
  if (!FILE_TYPE_VALUES.includes(fileType)) {
    return { error: "Invalid file type." };
  }

  // Members may only set targeting that includes their instruments or everyone
  const target: string[] | null =
    everyone || instruments.length === 0 ? null : instruments;
  if (!isLeaderOrAdmin(profile.role) && target !== null) {
    const allowed = target.every((t) => profile.instruments.includes(t));
    if (!allowed) {
      return { error: "You can only target your own instruments." };
    }
  }

  const supabase = await createClient();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const storagePath = `${songId}/${profile.id}/${Date.now()}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("song_files").insert({
    song_id: songId,
    file_type: fileType,
    storage_path: storagePath,
    filename: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    target_instruments: target,
    uploaded_by: profile.id,
  });

  if (insertError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return { error: insertError.message };
  }

  revalidatePath(`/songs/${songId}`);
  revalidatePath("/admin/storage");
  return { success: "File uploaded." };
}

export async function deleteSongFile(formData: FormData) {
  const profile = await requireProfile();
  const fileId = String(formData.get("file_id") ?? "");
  const songId = String(formData.get("song_id") ?? "");
  if (!fileId) return;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("song_files")
    .select("*")
    .eq("id", fileId)
    .maybeSingle();

  if (!row) return;
  if (row.uploaded_by !== profile.id && !isLeaderOrAdmin(profile.role)) {
    return;
  }

  await supabase.storage.from(STORAGE_BUCKET).remove([row.storage_path]);
  await supabase.from("song_files").delete().eq("id", fileId);

  revalidatePath(`/songs/${songId || row.song_id}`);
  revalidatePath("/admin/storage");
}

export async function getSignedFileUrl(fileId: string): Promise<ActionState> {
  await requireProfile();
  const supabase = await createClient();

  // RLS filters visibility
  const { data: row, error } = await supabase
    .from("song_files")
    .select("storage_path")
    .eq("id", fileId)
    .maybeSingle();

  if (error || !row) {
    return { error: "File not found or not visible for your instruments." };
  }

  const { data, error: signError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(row.storage_path, 60 * 30);

  if (signError || !data?.signedUrl) {
    return { error: signError?.message ?? "Could not sign URL." };
  }

  return { url: data.signedUrl };
}
