"use server";

import { revalidatePath } from "next/cache";
import { isLeaderOrAdmin, requireProfile } from "@/lib/auth";
import { MAX_FILE_BYTES, MAX_FILE_LABEL, STORAGE_BUCKET } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildSongStoragePath,
  isOwnedSongStoragePath,
  parseTargetInstruments,
  validateUploadMeta,
} from "@/lib/uploads";

export type ActionState = {
  error?: string;
  success?: string;
  url?: string;
};

export type PrepareUploadResult = {
  error?: string;
  path?: string;
  token?: string;
  signedUrl?: string;
  maxBytes?: number;
};

export type FinalizeUploadResult = {
  error?: string;
  success?: string;
  fileId?: string;
};

/**
 * Authorize a direct browser→Supabase Storage upload.
 * Issues a short-lived signed upload URL (service role, server-only).
 * File bytes never pass through Vercel.
 */
export async function prepareSongFileUpload(input: {
  songId: string;
  arrangementId?: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  fileType: string;
  everyone: boolean;
  targetInstruments: string[];
}): Promise<PrepareUploadResult> {
  const profile = await requireProfile();
  const meta = validateUploadMeta(input);
  if ("error" in meta) return { error: meta.error };

  const target = parseTargetInstruments(
    input.everyone,
    input.targetInstruments
  );
  if (!isLeaderOrAdmin(profile.role) && target !== null) {
    const allowed = target.every((t) => profile.instruments.includes(t));
    if (!allowed) {
      return { error: "You can only target your own instruments." };
    }
  }

  const supabase = await createClient();
  const { data: song, error: songError } = await supabase
    .from("songs")
    .select("id")
    .eq("id", input.songId)
    .maybeSingle();

  if (songError || !song) {
    return { error: "Song not found." };
  }

  const storagePath = buildSongStoragePath(
    input.songId,
    profile.id,
    meta.safeName
  );

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !data?.token || !data?.path) {
      return { error: error?.message ?? "Could not authorize upload." };
    }

    return {
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      maxBytes: MAX_FILE_BYTES,
    };
  } catch {
    return { error: "Could not authorize upload." };
  }
}

/**
 * After a successful direct Storage upload, attach DB metadata (RLS).
 * Cleans up the storage object if metadata insert fails.
 */
export async function finalizeSongFileUpload(input: {
  songId: string;
  arrangementId?: string | null;
  storagePath: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  fileType: string;
  everyone: boolean;
  targetInstruments: string[];
}): Promise<FinalizeUploadResult> {
  const profile = await requireProfile();
  const meta = validateUploadMeta(input);
  if ("error" in meta) return { error: meta.error };

  if (!isOwnedSongStoragePath(input.storagePath, input.songId, profile.id)) {
    return { error: "Invalid storage path." };
  }

  const target = parseTargetInstruments(
    input.everyone,
    input.targetInstruments
  );
  if (!isLeaderOrAdmin(profile.role) && target !== null) {
    const allowed = target.every((t) => profile.instruments.includes(t));
    if (!allowed) {
      return { error: "You can only target your own instruments." };
    }
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Server storage client unavailable." };
  }

  // Confirm the object landed in Storage before writing metadata.
  const objectFolder = input.storagePath.split("/").slice(0, -1).join("/");
  const objectName = input.storagePath.split("/").pop() || "";
  const { data: listed, error: listError } = await admin.storage
    .from(STORAGE_BUCKET)
    .list(objectFolder, { search: objectName, limit: 20 });

  if (listError) {
    return { error: "Could not verify uploaded file." };
  }

  const object = listed?.find((row) => row.name === objectName);
  if (!object) {
    return { error: "Upload not found in storage. Retry the upload." };
  }

  const reportedSize =
    typeof object.metadata?.size === "number"
      ? object.metadata.size
      : typeof object.metadata?.size === "string"
        ? Number(object.metadata.size)
        : null;

  if (reportedSize != null && Number.isFinite(reportedSize)) {
    if (reportedSize > MAX_FILE_BYTES) {
      await admin.storage.from(STORAGE_BUCKET).remove([input.storagePath]);
      return { error: `Uploaded file exceeds ${MAX_FILE_LABEL} limit.` };
    }
    // Allow small client/server size mismatch; reject large discrepancies.
    if (Math.abs(reportedSize - input.sizeBytes) > 1024 * 1024) {
      await admin.storage.from(STORAGE_BUCKET).remove([input.storagePath]);
      return { error: "Uploaded size did not match the authorized request." };
    }
  }

  const arrangementId = input.arrangementId?.trim() || null;

  const supabase = await createClient();
  const baseRow = {
    song_id: input.songId,
    file_type: meta.fileType,
    storage_path: input.storagePath,
    filename: input.filename,
    mime_type: input.mimeType || null,
    size_bytes: input.sizeBytes,
    target_instruments: target,
    uploaded_by: profile.id,
  };

  let inserted: { id: string } | null = null;
  let insertError: { message: string } | null = null;

  const first = await supabase
    .from("song_files")
    .insert({ ...baseRow, arrangement_id: arrangementId })
    .select("id")
    .maybeSingle();

  if (first.error && /arrangement_id/i.test(first.error.message)) {
    const retry = await supabase
      .from("song_files")
      .insert(baseRow)
      .select("id")
      .maybeSingle();
    inserted = retry.data;
    insertError = retry.error;
  } else {
    inserted = first.data;
    insertError = first.error;
  }

  if (insertError || !inserted) {
    await admin.storage.from(STORAGE_BUCKET).remove([input.storagePath]);
    return { error: insertError?.message ?? "Could not save file metadata." };
  }

  revalidatePath(`/songs/${input.songId}`);
  revalidatePath("/admin/storage");
  return { success: "File uploaded.", fileId: inserted.id };
}

/** Best-effort cleanup when the client aborts after a storage PUT. */
export async function abortSongFileUpload(input: {
  songId: string;
  storagePath: string;
}): Promise<ActionState> {
  const profile = await requireProfile();
  if (!isOwnedSongStoragePath(input.storagePath, input.songId, profile.id)) {
    return { error: "Invalid storage path." };
  }

  try {
    const admin = createAdminClient();
    await admin.storage.from(STORAGE_BUCKET).remove([input.storagePath]);
  } catch {
    // ignore
  }
  return { success: "Upload cancelled." };
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

  try {
    const admin = createAdminClient();
    await admin.storage.from(STORAGE_BUCKET).remove([row.storage_path]);
  } catch {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([row.storage_path]);
    if (error) {
      // Still delete metadata if storage remove fails (orphan GC later).
    }
  }

  await supabase.from("song_files").delete().eq("id", fileId);

  revalidatePath(`/songs/${songId || row.song_id}`);
  revalidatePath("/admin/storage");
}

export async function getSignedFileUrl(fileId: string): Promise<ActionState> {
  await requireProfile();
  const supabase = await createClient();

  // RLS filters visibility on song_files; signed URL for private bucket object.
  const { data: row, error } = await supabase
    .from("song_files")
    .select("storage_path")
    .eq("id", fileId)
    .maybeSingle();

  if (error || !row) {
    return { error: "File not found or not visible for your instruments." };
  }

  // Prefer admin sign so storage SELECT can stay tightly scoped to metadata.
  try {
    const admin = createAdminClient();
    const { data, error: signError } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(row.storage_path, 60 * 30);

    if (!signError && data?.signedUrl) {
      return { url: data.signedUrl };
    }
  } catch {
    // fall through to user client
  }

  const { data, error: signError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(row.storage_path, 60 * 30);

  if (signError || !data?.signedUrl) {
    return { error: signError?.message ?? "Could not sign URL." };
  }

  return { url: data.signedUrl };
}
