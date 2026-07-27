import {
  isNoChordToken,
  isSectionHeading,
  isValidChordToken,
  parseKeyToPitch,
  preferFlats,
} from "@/lib/chart/chords";
import { parseChordProDocument, serializeChordPro } from "@/lib/chart/parse";
import { transposeDocument } from "@/lib/chart/transpose";
import type { ChartDocument, ParsedChord } from "@/lib/chart/types";

const KEY_OPTIONS = [
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
  "Dbm",
  "Dm",
  "D#m",
  "Ebm",
  "Em",
  "Fm",
  "F#m",
  "Gbm",
  "Gm",
  "G#m",
  "Abm",
  "Am",
  "A#m",
  "Bbm",
  "Bm",
] as const;

export const CONCERT_KEY_OPTIONS: readonly string[] = KEY_OPTIONS;

export function isValidConcertKey(key: string | null | undefined): boolean {
  if (!key?.trim()) return false;
  return parseKeyToPitch(key) != null;
}

function looksLikeChordToken(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (isNoChordToken(t)) return false;
  if (isSectionHeading(t)) return false;
  return /^[A-Za-z]/.test(t);
}

function collectChordTokens(doc: ChartDocument): ParsedChord[] {
  const out: ParsedChord[] = [];
  for (const block of doc.blocks) {
    if (block.type === "comment" || block.type === "keyChange") continue;
    for (const line of block.lines) {
      for (const seg of line.segments) {
        if (seg.type === "chord") out.push(seg.chord);
      }
    }
  }
  return out;
}

/** Scan authored brackets that were not accepted as chords (kept as text). */
function collectUnrecognizedBracketWarnings(
  sourceBody: string,
): TransposeWarning[] {
  const warnings: TransposeWarning[] = [];
  const seen = new Set<string>();
  const re = /\[([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sourceBody)) !== null) {
    const inner = match[1]!.trim();
    if (!inner) continue;
    if (isSectionHeading(inner)) continue;
    if (isNoChordToken(inner)) continue;
    if (isValidChordToken(inner)) continue;
    if (!looksLikeChordToken(inner)) continue;
    if (seen.has(inner)) continue;
    seen.add(inner);
    warnings.push({
      token: inner,
      reason: "Unrecognised chord syntax — left unchanged",
    });
  }
  return warnings;
}

export type TransposeWarning = {
  token: string;
  reason: string;
};

export type ChordPreviewPair = {
  before: string;
  after: string;
  changed: boolean;
  warning?: boolean;
};

export type ChartTransposePlan = {
  sourceKey: string;
  targetKey: string;
  sameKey: boolean;
  body: string;
  chordsDetected: number;
  chordsChanged: number;
  warnings: TransposeWarning[];
  pairs: ChordPreviewPair[];
};

export type ChartTransposeResult =
  | { ok: true; plan: ChartTransposePlan }
  | { ok: false; error: string };

/**
 * Plan (and optionally rewrite) a chart from sourceKey → targetKey using the
 * parser/transpose engine. Never search-replaces chord text.
 * Refuses transposition when no safe chord tokens are detected.
 */
export function planChartTranspose(
  sourceBody: string,
  sourceKeyRaw: string | null | undefined,
  targetKeyRaw: string | null | undefined,
): ChartTransposeResult {
  const sourceKey = String(sourceKeyRaw ?? "").trim();
  const targetKey = String(targetKeyRaw ?? "").trim();

  if (!sourceKey) {
    return {
      ok: false,
      error:
        "Source concert key is missing. Set the chart source key on the original arrangement first.",
    };
  }
  if (!isValidConcertKey(sourceKey)) {
    return {
      ok: false,
      error: `Invalid source key “${sourceKey}”. Use a note like G, Bb, or Am.`,
    };
  }
  if (!targetKey) {
    return { ok: false, error: "Target concert key is required." };
  }
  if (!isValidConcertKey(targetKey)) {
    return {
      ok: false,
      error: `Invalid target key “${targetKey}”. Use a note like G, Bb, or Am.`,
    };
  }

  const parsed = parseChordProDocument(sourceBody);
  const tokens = collectChordTokens(parsed);
  const recognised = tokens.filter((c) => !c.literal);
  const warnings = collectUnrecognizedBracketWarnings(sourceBody);

  for (const chord of tokens) {
    if (chord.literal && looksLikeChordToken(chord.raw)) {
      if (!warnings.some((w) => w.token === chord.raw)) {
        warnings.push({
          token: chord.raw,
          reason: "Unrecognised chord syntax — left unchanged",
        });
      }
    }
  }

  const samePitch =
    parseKeyToPitch(sourceKey) === parseKeyToPitch(targetKey);
  const sameMode =
    /m$/i.test(sourceKey.trim()) === /m$/i.test(targetKey.trim());
  const sameKey = samePitch && sameMode;

  if (sameKey) {
    const pairs: ChordPreviewPair[] = recognised.map((c) => ({
      before: c.raw,
      after: c.raw,
      changed: false,
    }));
    for (const w of warnings) {
      pairs.push({
        before: w.token,
        after: w.token,
        changed: false,
        warning: true,
      });
    }
    return {
      ok: true,
      plan: {
        sourceKey,
        targetKey,
        sameKey: true,
        body: sourceBody,
        chordsDetected: recognised.length,
        chordsChanged: 0,
        warnings,
        pairs,
      },
    };
  }

  if (recognised.length === 0) {
    return {
      ok: false,
      error:
        "No safe transposable chords detected. Create is blocked so the chart is not saved with a changed key. Fix chord lines (or use the same key for an independent copy).",
    };
  }

  const transposed = transposeDocument(parsed, {
    sourceKey,
    displayKey: targetKey,
    shapeView: false,
    capoFret: 0,
  });
  transposed.meta.key = targetKey;
  const body = serializeChordPro(transposed);
  const afterTokens = collectChordTokens(transposed).filter((c) => !c.literal);

  const pairs: ChordPreviewPair[] = [];
  let chordsChanged = 0;
  const n = Math.min(recognised.length, afterTokens.length);
  for (let i = 0; i < n; i++) {
    const before = recognised[i]!;
    const after = afterTokens[i]!;
    const changed = before.raw !== after.raw;
    if (changed) chordsChanged += 1;
    pairs.push({
      before: before.raw,
      after: after.raw,
      changed,
    });
  }
  for (const w of warnings) {
    pairs.push({
      before: w.token,
      after: w.token,
      changed: false,
      warning: true,
    });
  }

  return {
    ok: true,
    plan: {
      sourceKey,
      targetKey,
      sameKey: false,
      body,
      chordsDetected: recognised.length,
      chordsChanged,
      warnings,
      pairs,
    },
  };
}

/** Permanent rewrite helper used by create/update actions. */
export function rewriteChartToKeySafe(
  source: string,
  sourceKey: string | null | undefined,
  targetKey: string,
): ChartTransposeResult {
  return planChartTranspose(source, sourceKey, targetKey);
}

export function resolveAuthoritativeSourceKey(input: {
  chart_source_key?: string | null;
  default_key?: string | null;
  body?: string | null;
}): string | null {
  const fromDb =
    String(input.chart_source_key ?? "").trim() ||
    String(input.default_key ?? "").trim() ||
    "";
  if (fromDb) return fromDb;
  if (input.body) {
    const meta = parseChordProDocument(input.body).meta.key;
    if (meta?.trim()) return meta.trim();
  }
  return null;
}

export { preferFlats };
