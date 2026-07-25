import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  INSTRUMENTS,
  MAX_FILE_BYTES,
  MAX_FILE_LABEL,
} from "@/lib/constants";
import type { FileType } from "@/lib/types/database";

export const FILE_TYPE_VALUES: FileType[] = [
  "lyric_sheet",
  "chord_chart",
  "lead_sheet",
  "mp3",
  "stem",
  "click",
  "guide",
  "other",
];

export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || "file";
  return base.replace(/[^\w.\-]+/g, "_").slice(0, 180) || "file";
}

export function fileExtension(name: string): string {
  const parts = sanitizeFilename(name).split(".");
  return parts.length > 1 ? (parts.pop() || "").toLowerCase() : "";
}

export function isAllowedUploadMime(mime: string | null | undefined): boolean {
  if (!mime) return true; // some browsers omit type; extension check still applies
  const normalized = mime.toLowerCase().split(";")[0]?.trim() || "";
  if ((ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(normalized)) {
    return true;
  }
  return (
    normalized.startsWith("audio/") ||
    normalized.startsWith("image/") ||
    normalized.startsWith("text/")
  );
}

export function isAllowedUploadFilename(name: string): boolean {
  const ext = fileExtension(name);
  if (!ext) return false;
  return (ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext);
}

export function buildSongStoragePath(
  songId: string,
  userId: string,
  filename: string
): string {
  const safeName = sanitizeFilename(filename);
  return `${songId}/${userId}/${Date.now()}-${safeName}`;
}

export function isOwnedSongStoragePath(
  path: string,
  songId: string,
  userId: string
): boolean {
  const prefix = `${songId}/${userId}/`;
  if (!path.startsWith(prefix)) return false;
  if (path.includes("..") || path.includes("//")) return false;
  return path.length > prefix.length && path.length < 512;
}

export function parseTargetInstruments(
  everyone: boolean,
  instruments: string[]
): string[] | null {
  const filtered = instruments.filter((i) =>
    (INSTRUMENTS as readonly string[]).includes(i)
  );
  if (everyone || filtered.length === 0) return null;
  return filtered;
}

export function validateUploadMeta(input: {
  songId: string;
  filename: string;
  mimeType: string | null | undefined;
  sizeBytes: number;
  fileType: string;
}): { error: string } | { ok: true; fileType: FileType; safeName: string } {
  if (!input.songId) return { error: "Missing song." };
  if (!input.filename?.trim()) return { error: "Missing filename." };
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { error: "Invalid file size." };
  }
  if (input.sizeBytes > MAX_FILE_BYTES) {
    return { error: `File exceeds ${MAX_FILE_LABEL} limit.` };
  }
  if (!isAllowedUploadFilename(input.filename)) {
    return { error: "File extension is not allowed." };
  }
  if (!isAllowedUploadMime(input.mimeType)) {
    return { error: "File type is not allowed." };
  }
  if (!FILE_TYPE_VALUES.includes(input.fileType as FileType)) {
    return { error: "Invalid catalog file type." };
  }
  return {
    ok: true,
    fileType: input.fileType as FileType,
    safeName: sanitizeFilename(input.filename),
  };
}
