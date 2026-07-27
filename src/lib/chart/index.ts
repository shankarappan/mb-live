import { parseChordProDocument, serializeChordPro } from "@/lib/chart/parse";
import { toViewModel } from "@/lib/chart/render";
import { transposeDocument } from "@/lib/chart/transpose";
import type { ChartViewMode, ChartViewModel } from "@/lib/chart/types";
import {
  planChartTranspose,
  resolveAuthoritativeSourceKey,
} from "@/lib/chart/create-from-source";

export type {
  ChartViewMode,
  ChartViewModel,
  ChartDocument,
} from "@/lib/chart/types";
export {
  parseChordProDocument,
  serializeChordPro,
  extractPlainLyrics,
} from "@/lib/chart/parse";
export { transposeDocument } from "@/lib/chart/transpose";
export {
  parseChordToken,
  transposeChord,
  chordToNashville,
  chordToRoman,
  semitoneDelta,
  preferFlats,
  parseKeyToPitch,
  isValidChordToken,
  isSectionHeading,
  isStandaloneChordLine,
} from "@/lib/chart/chords";
export {
  planChartTranspose,
  resolveAuthoritativeSourceKey,
  isValidConcertKey,
  CONCERT_KEY_OPTIONS,
  type ChartTransposePlan,
  type ChartTransposeResult,
} from "@/lib/chart/create-from-source";

export type BuildChartViewInput = {
  source: string;
  /** Key the master body is written in (concert) */
  sourceKey?: string | null;
  /** Concert key to view */
  displayKey?: string | null;
  mode?: ChartViewMode;
  shapeView?: boolean;
  capoFret?: number;
};

/**
 * Full pipeline: parse master ChordPro → concert transpose → optional shape view → mode render.
 */
export function buildChartView(input: BuildChartViewInput): ChartViewModel {
  const parsed = parseChordProDocument(input.source);
  const sourceKey = input.sourceKey ?? parsed.meta.key ?? null;
  const displayKey = input.displayKey ?? sourceKey;
  const capoFret = input.capoFret ?? parsed.meta.capo ?? 0;
  const shapeView = Boolean(input.shapeView);
  const mode = input.mode ?? "standard";

  const transposed = transposeDocument(parsed, {
    sourceKey,
    displayKey,
    shapeView,
    capoFret,
  });

  return toViewModel(transposed, {
    mode,
    concertKey: displayKey,
    shapeView,
    capoFret,
  });
}

/** Permanently rewrite master body to a new concert key (leader action). */
export function rewriteChartToKey(
  source: string,
  sourceKey: string | null | undefined,
  targetKey: string,
): { body: string; key: string } {
  const planned = planChartTranspose(source, sourceKey, targetKey);
  if (!planned.ok) {
    const parsed = parseChordProDocument(source);
    const from =
      sourceKey ??
      resolveAuthoritativeSourceKey({ body: source }) ??
      parsed.meta.key ??
      null;
    const transposed = transposeDocument(parsed, {
      sourceKey: from,
      displayKey: targetKey,
      shapeView: false,
      capoFret: 0,
    });
    transposed.meta.key = targetKey;
    return { body: serializeChordPro(transposed), key: targetKey };
  }
  return { body: planned.plan.body, key: planned.plan.targetKey };
}
