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

export const MAX_FILE_BYTES = 200 * 1024 * 1024;

export const STORAGE_BUCKET = "song-files";

export const ROLE_LABELS = {
  admin: "Admin",
  leader: "Band Leader",
  member: "Member",
} as const;
