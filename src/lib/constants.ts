export const INSTRUMENTS = [
  "vocals",
  "guitar",
  "keys",
  "bass",
  "drums",
  "other",
] as const;

export type Instrument = (typeof INSTRUMENTS)[number];

export const FILE_TYPES = [
  { value: "lyric_sheet", label: "Lyric sheet" },
  { value: "chord_chart", label: "Chord chart" },
  { value: "lead_sheet", label: "Lead sheet" },
  { value: "mp3", label: "MP3 demo" },
  { value: "stem", label: "Stem" },
  { value: "click", label: "Click track" },
  { value: "guide", label: "Guide track" },
  { value: "other", label: "Other" },
] as const;

export const KEYS = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
  "Cm",
  "C#m",
  "Dm",
  "D#m",
  "Ebm",
  "Em",
  "Fm",
  "F#m",
  "Gm",
  "G#m",
  "Am",
  "A#m",
  "Bbm",
  "Bm",
] as const;

/**
 * Proven upload ceiling on the current Supabase project (Free plan global
 * Storage limit = 50 MB). Bucket file_size_limit matches this.
 * To restore a 200 MB app target: upgrade Supabase, raise Storage → Global
 * file size limit, then set this (and the bucket limit) to 200 * 1024 * 1024.
 */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_FILE_LABEL = "50 MB";

/** Soft bound for unbounded list pages (keeps UX usable as library grows). */
export const LIST_PAGE_SIZE = 100;

export const STORAGE_BUCKET = "song-files";

/**
 * Browser + server MIME allowlist for uploads.
 * application/octet-stream is allowed as a last resort for odd chart exports.
 */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/chordpro",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  "pdf",
  "txt",
  "cho",
  "chordpro",
  "pro",
  "mp3",
  "wav",
  "m4a",
  "aac",
  "ogg",
  "flac",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "zip",
] as const;

export const ROLE_LABELS = {
  admin: "Admin",
  leader: "Band Leader",
  member: "Member",
} as const;
