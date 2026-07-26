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

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

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

export function preferFlats(key: string | null | undefined): boolean {
  if (!key) return false;
  return FLAT_KEYS.has(key.trim());
}

export function parseKeyToPitch(key: string | null | undefined): PitchClass | null {
  if (!key) return null;
  const trimmed = key.trim();
  const m = trimmed.match(/^([A-G][b#]?)(m)?$/i);
  if (!m) return null;
  const note = m[1][0].toUpperCase() + (m[1].slice(1).toLowerCase() === "b" ? "b" : m[1].slice(1));
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
  toKey: string | null | undefined
): number {
  const a = parseKeyToPitch(fromKey);
  const b = parseKeyToPitch(toKey);
  if (a == null || b == null) return 0;
  return (b - a + 12) % 12;
}

const CHORD_RE =
  /^([A-G][b#]?)([^/]*?)(?:\/([A-G][b#]?))?$/i;

export function parseChordToken(raw: string): ParsedChord {
  const trimmed = raw.trim();
  if (!trimmed || /^(N\.?C\.?|NC|-)$/i.test(trimmed)) {
    return { raw: trimmed, root: null, quality: "", bass: null, literal: true };
  }

  const m = trimmed.match(CHORD_RE);
  if (!m) {
    return { raw: trimmed, root: null, quality: "", bass: null, literal: true };
  }

  const rootName = normalizeNoteName(m[1]!);
  const root = NOTE_TO_PC[rootName] ?? null;
  if (root == null) {
    return { raw: trimmed, root: null, quality: "", bass: null, literal: true };
  }

  const quality = m[2] ?? "";
  const bassName = m[3] ? normalizeNoteName(m[3]) : null;
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

export function transposeChord(
  chord: ParsedChord,
  delta: number,
  useFlats: boolean
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
  useFlats: boolean
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
  key: string | null | undefined
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
  key: string | null | undefined
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
