import type { ParsedChord, PitchClass } from "@/lib/chart/types";

const NOTE_TO_PC: Record<string, PitchClass> = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

const SHARP_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
const FLAT_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const FLAT_KEYS = new Set([
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Db",
  "Gb",
  "Cb",
  "Dm",
  "Gm",
  "Cm",
  "Fm",
  "Bbm",
  "Ebm",
]);

/** Bracket-only labels that are song sections, never chords. */
const SECTION_HEADING_RE =
  /^(intro|verse(\s*\d+)?|pre[-\s]?chorus|chorus|bridge|instrumental|interlude|outro|end|ending|tag|turnaround|solo|coda|breakdown|vamp)(\s*\d+)?$/i;

/**
 * Consume known chord-quality atoms only. Rejects ordinary words
 * like "nd" (from End), "mazing", "and", "ridge".
 */
const QUALITY_ATOM_RE =
  /^(maj7|maj9|maj11|maj13|maj|min7|min9|min11|min13|min|mmaj7|mMaj7|mM7|m7b5|m7|m9|m11|m13|m|dim7|dim|aug|sus2|sus4|sus|add\d+|11|13|[2345679]|[#b](?:5|9|11|13)|[+\-°ºøΔ△]|no[35]|alt|\([^)]*\))/i;

export function preferFlats(key: string | null | undefined): boolean {
  if (!key) return false;
  return FLAT_KEYS.has(key.trim());
}

export function parseKeyToPitch(
  key: string | null | undefined,
): PitchClass | null {
  if (!key) return null;
  const trimmed = key.trim();
  const m = trimmed.match(/^([A-G][b#]?)(m)?$/i);
  if (!m) return null;
  const note =
    m[1][0].toUpperCase() +
    (m[1].slice(1).toLowerCase() === "b" ? "b" : m[1].slice(1));
  const normalized =
    note.length > 1 && note[1] === "#"
      ? note[0] + "#"
      : note.length > 1 && note[1] === "b"
        ? note[0] + "b"
        : note[0];
  return NOTE_TO_PC[normalized] ?? null;
}

export function pitchToName(pc: PitchClass, useFlats: boolean): string {
  const n = ((pc % 12) + 12) % 12;
  return useFlats ? FLAT_NAMES[n]! : SHARP_NAMES[n]!;
}

export function semitoneDelta(
  fromKey: string | null | undefined,
  toKey: string | null | undefined,
): number {
  const a = parseKeyToPitch(fromKey);
  const b = parseKeyToPitch(toKey);
  if (a == null || b == null) return 0;
  return (b - a + 12) % 12;
}

export function isNoChordToken(raw: string): boolean {
  return /^(N\.?C\.?|NC|-)$/i.test(raw.trim());
}

export function isSectionHeading(raw: string): boolean {
  return SECTION_HEADING_RE.test(raw.trim());
}

export function isValidChordQuality(quality: string): boolean {
  if (!quality) return true;
  let rest = quality;
  while (rest.length > 0) {
    const m = rest.match(QUALITY_ATOM_RE);
    if (!m) return false;
    rest = rest.slice(m[0].length);
  }
  return true;
}

/**
 * Strict chord-token check. Ordinary words beginning with A–G
 * (End, Amazing, Band, Bridge, Gnd) must return false.
 */
export function isValidChordToken(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (isNoChordToken(trimmed)) return false;
  if (isSectionHeading(trimmed)) return false;

  const m = trimmed.match(/^([A-G])([#b]?)(.*?)(?:\/([A-G])([#b]?))?$/i);
  if (!m) return false;

  const rootName = normalizeNoteName(m[1]! + (m[2] || ""));
  if (NOTE_TO_PC[rootName] == null) return false;

  const quality = m[3] ?? "";
  if (!isValidChordQuality(quality)) return false;

  if (m[4]) {
    const bassName = normalizeNoteName(m[4] + (m[5] || ""));
    if (NOTE_TO_PC[bassName] == null) return false;
  }

  return true;
}

export function parseChordToken(raw: string): ParsedChord {
  const trimmed = raw.trim();
  if (!trimmed || isNoChordToken(trimmed)) {
    return { raw: trimmed, root: null, quality: "", bass: null, literal: true };
  }

  if (isSectionHeading(trimmed) || !isValidChordToken(trimmed)) {
    return { raw: trimmed, root: null, quality: "", bass: null, literal: true };
  }

  const m = trimmed.match(/^([A-G])([#b]?)(.*?)(?:\/([A-G])([#b]?))?$/i);
  if (!m) {
    return { raw: trimmed, root: null, quality: "", bass: null, literal: true };
  }

  const rootName = normalizeNoteName(m[1]! + (m[2] || ""));
  const root = NOTE_TO_PC[rootName] ?? null;
  const quality = m[3] ?? "";
  const bassName = m[4] ? normalizeNoteName(m[4] + (m[5] || "")) : null;
  const bass = bassName ? (NOTE_TO_PC[bassName] ?? null) : null;

  return { raw: trimmed, root, quality, bass, literal: false };
}

function normalizeNoteName(input: string): string {
  const letter = input[0]!.toUpperCase();
  const acc = input.slice(1);
  if (acc === "#" || acc.toLowerCase() === "sharp") return `${letter}#`;
  if (acc === "b" || acc.toLowerCase() === "flat") return `${letter}b`;
  return letter;
}

export function formatChordRaw(chord: ParsedChord): string {
  if (chord.literal || chord.root == null) return chord.raw;
  // Prefer rebuilt spelling when transposed; fall back to raw.
  return chord.raw;
}

export function transposeChord(
  chord: ParsedChord,
  delta: number,
  useFlats: boolean,
): ParsedChord {
  if (chord.literal || chord.root == null || delta === 0) return chord;
  const root = ((((chord.root + delta) % 12) + 12) % 12) as PitchClass;
  const bass =
    chord.bass == null
      ? null
      : ((((chord.bass + delta) % 12) + 12) % 12) as PitchClass;
  const raw =
    pitchToName(root, useFlats) +
    chord.quality +
    (bass != null ? `/${pitchToName(bass, useFlats)}` : "");
  return { raw, root, quality: chord.quality, bass, literal: false };
}

/** Concert chord → guitar shape for capo fret (sounding − capo). */
export function toShapeChord(
  chord: ParsedChord,
  capoFret: number,
  useFlats: boolean,
): ParsedChord {
  if (capoFret <= 0) return chord;
  return transposeChord(chord, -capoFret, useFlats);
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const DEGREE_NUM = ["1", "2", "3", "4", "5", "6", "7"];
const DEGREE_ROMAN_MAJ = ["I", "II", "III", "IV", "V", "VI", "VII"];
const DEGREE_ROMAN_MIN = ["i", "ii", "iii", "iv", "v", "vi", "vii"];

function scaleDegree(root: PitchClass, keyRoot: PitchClass): number | null {
  const interval = (root - keyRoot + 12) % 12;
  const idx = MAJOR_SCALE.indexOf(interval);
  return idx >= 0 ? idx : null;
}

function qualityIsMinor(quality: string): boolean {
  return /^(m|min|minor)(?![aj])/i.test(quality) || quality.startsWith("m");
}

export function chordToNashville(
  chord: ParsedChord,
  key: string | null | undefined,
): string {
  if (chord.literal || chord.root == null) return chord.raw;
  const keyRoot = parseKeyToPitch(key);
  if (keyRoot == null) return chord.raw;
  const deg = scaleDegree(chord.root, keyRoot);
  const base =
    deg != null ? DEGREE_NUM[deg]! : pitchToName(chord.root, preferFlats(key));
  let out = base + chord.quality;
  if (chord.bass != null) {
    const bdeg = scaleDegree(chord.bass, keyRoot);
    out +=
      "/" +
      (bdeg != null
        ? DEGREE_NUM[bdeg]!
        : pitchToName(chord.bass, preferFlats(key)));
  }
  return out;
}

export function chordToRoman(
  chord: ParsedChord,
  key: string | null | undefined,
): string {
  if (chord.literal || chord.root == null) return chord.raw;
  const keyRoot = parseKeyToPitch(key);
  if (keyRoot == null) return chord.raw;
  const deg = scaleDegree(chord.root, keyRoot);
  if (deg == null) return chord.raw;

  const minor = qualityIsMinor(chord.quality);
  let numeral = minor ? DEGREE_ROMAN_MIN[deg]! : DEGREE_ROMAN_MAJ[deg]!;
  let q = chord.quality.replace(/^m(?!aj)/i, "");
  if (/^dim|^o/i.test(q)) {
    numeral = DEGREE_ROMAN_MIN[deg]! + "°";
    q = q.replace(/^(dim|o)/i, "");
  } else if (/^aug|^\+/i.test(q)) {
    numeral = DEGREE_ROMAN_MAJ[deg]! + "+";
    q = q.replace(/^(aug|\+)/i, "");
  }
  numeral += q;
  if (chord.bass != null) {
    const bdeg = scaleDegree(chord.bass, keyRoot);
    if (bdeg != null) {
      numeral += "/" + DEGREE_ROMAN_MAJ[bdeg]!;
    }
  }
  return numeral;
}

/** True when every whitespace-separated token is a valid chord or N.C. */
export function isStandaloneChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("{")) return false;
  // Pure bracket section heading handled elsewhere
  if (/^\[[^\]]+\]$/.test(trimmed)) return false;
  // ChordPro inline brackets → not a traditional standalone line
  if (trimmed.includes("[")) return false;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0) return false;
  return tokens.every((t) => isValidChordToken(t) || isNoChordToken(t));
}
