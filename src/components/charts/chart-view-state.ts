import type { ChartViewMode } from "@/lib/chart";
import type { Arrangement, ChartViewPrefs } from "@/lib/types/database";

export type ChartViewInitialState = {
  mode: ChartViewMode;
  displayKey: string | null;
  shapeView: boolean;
  capoFret: number;
  concertKey: string | null;
  sourceKey: string | null;
};

type ArrangementKeys = Pick<
  Arrangement,
  "default_key" | "chart_source_key" | "capo"
>;

/**
 * Pure initial toolbar/view state for a chart.
 * Call once per mount — remount ChartView when arrangement.id changes
 * (e.g. stand Next/Previous) so previous song state cannot leak.
 */
export function resolveChartViewInitialState(input: {
  arrangement: ArrangementKeys;
  prefs?: ChartViewPrefs | null;
  overrideKey?: string | null;
  overrideCapo?: number | null;
  initialMode?: ChartViewMode;
}): ChartViewInitialState {
  const concertKey =
    input.overrideKey ||
    input.arrangement.default_key ||
    input.arrangement.chart_source_key ||
    null;
  const sourceKey =
    input.arrangement.chart_source_key || input.arrangement.default_key || null;
  const prefs = input.prefs ?? null;

  return {
    concertKey,
    sourceKey,
    mode: input.initialMode ?? prefs?.view_mode ?? "standard",
    displayKey: prefs?.display_key ?? concertKey,
    shapeView: prefs?.shape_view ?? false,
    capoFret:
      input.overrideCapo ?? prefs?.capo_fret ?? input.arrangement.capo ?? 0,
  };
}
