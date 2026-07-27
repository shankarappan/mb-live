import {
  preferFlats,
  semitoneDelta,
  toShapeChord,
  transposeChord,
} from "@/lib/chart/chords";
import type { ChartBlock, ChartDocument, ChartLine, ParsedChord } from "@/lib/chart/types";

export type TransposeOptions = {
  /** Concert key the body was written in */
  sourceKey: string | null | undefined;
  /** Concert key to display / analyze */
  displayKey: string | null | undefined;
  /** When true, convert concert chords to guitar shapes for capoFret */
  shapeView?: boolean;
  capoFret?: number;
};

function mapLine(
  line: ChartLine,
  mapChord: (c: ParsedChord) => ParsedChord
): ChartLine {
  return {
    hasChords: line.hasChords,
    segments: line.segments.map((seg) =>
      seg.type === "chord"
        ? { type: "chord", chord: mapChord(seg.chord) }
        : seg
    ),
  };
}

function mapBlock(
  block: ChartBlock,
  mapChord: (c: ParsedChord) => ParsedChord,
  mapKey: (key: string) => string
): ChartBlock {
  if (block.type === "comment") return block;
  if (block.type === "keyChange") {
    return { ...block, key: mapKey(block.key) };
  }
  if (block.type === "section") {
    return {
      ...block,
      lines: block.lines.map((l) => mapLine(l, mapChord)),
    };
  }
  return {
    ...block,
    lines: block.lines.map((l) => mapLine(l, mapChord)),
  };
}

/**
 * Transpose a chart document in concert pitch, optionally projecting to capo shapes.
 * Does not mutate the original document.
 */
export function transposeDocument(
  doc: ChartDocument,
  options: TransposeOptions
): ChartDocument {
  const sourceKey = options.sourceKey ?? doc.meta.key ?? null;
  const displayKey = options.displayKey ?? sourceKey;
  const delta = semitoneDelta(sourceKey, displayKey);
  const useFlats = preferFlats(displayKey);
  const capo = options.capoFret ?? 0;
  const shape = Boolean(options.shapeView) && capo > 0;

  const mapChord = (chord: ParsedChord): ParsedChord => {
    let next = transposeChord(chord, delta, useFlats);
    if (shape) next = toShapeChord(next, capo, preferFlats(displayKey));
    return next;
  };

  const mapKey = (key: string): string => {
    // Key-change markers also move by the same concert delta
    const from = parseKeyLabel(key);
    if (!from) return key;
    const names = useFlats
      ? ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
      : ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const pc = (from.pc + delta + 12) % 12;
    return names[pc]! + (from.minor ? "m" : "");
  };

  return {
    meta: {
      ...doc.meta,
      key: displayKey ?? doc.meta.key,
    },
    blocks: doc.blocks.map((b) => mapBlock(b, mapChord, mapKey)),
  };
}

function parseKeyLabel(key: string): { pc: number; minor: boolean } | null {
  const m = key.trim().match(/^([A-G][b#]?)(m)?$/i);
  if (!m) return null;
  const map: Record<string, number> = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
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
  };
  const letter = m[1][0].toUpperCase() + m[1].slice(1);
  const note =
    letter.length > 1 && letter[1] === "b"
      ? letter[0] + "b"
      : letter.length > 1 && letter[1] === "#"
        ? letter[0] + "#"
        : letter[0];
  const pc = map[note];
  if (pc == null) return null;
  return { pc, minor: Boolean(m[2]) };
}
