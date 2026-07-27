import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveChartViewInitialState } from "@/components/charts/chart-view-state";
import type { ChartViewPrefs } from "@/lib/types/database";

/** Simulates stand remount: each song gets a fresh resolve (key={arrangement.id}). */
function navigateStand(
  from: Parameters<typeof resolveChartViewInitialState>[0],
  to: Parameters<typeof resolveChartViewInitialState>[0],
) {
  const previous = resolveChartViewInitialState(from);
  // Mutate as if the user changed toolbar state on the previous song.
  const dirtyPrevious = {
    ...previous,
    displayKey: "A",
    mode: "nashville" as const,
    shapeView: true,
    capoFret: 3,
  };
  const next = resolveChartViewInitialState(to);
  return { dirtyPrevious, next };
}

describe("stand ChartView remount / navigation", () => {
  it("resets Concert key when navigating Open Road (G) → Mandram (D)", () => {
    const { dirtyPrevious, next } = navigateStand(
      {
        arrangement: {
          default_key: "G",
          chart_source_key: "G",
          capo: 0,
        },
      },
      {
        arrangement: {
          default_key: "D",
          chart_source_key: "D",
          capo: 0,
        },
      },
    );

    assert.equal(dirtyPrevious.displayKey, "A");
    assert.equal(dirtyPrevious.concertKey, "G");
    assert.equal(next.concertKey, "D");
    assert.equal(next.displayKey, "D");
    assert.equal(next.mode, "standard");
    assert.equal(next.shapeView, false);
    assert.equal(next.capoFret, 0);
  });

  it("does not carry previous song prefs into a song without prefs", () => {
    const openRoadPrefs: ChartViewPrefs = {
      user_id: "u1",
      arrangement_id: "arr-open-road",
      view_mode: "roman",
      display_key: "A",
      shape_view: true,
      capo_fret: 2,
      updated_at: new Date().toISOString(),
    };

    const { next } = navigateStand(
      {
        arrangement: {
          default_key: "G",
          chart_source_key: "G",
          capo: 0,
        },
        prefs: openRoadPrefs,
      },
      {
        arrangement: {
          default_key: "D",
          chart_source_key: "D",
          capo: 0,
        },
        prefs: null,
      },
    );

    assert.equal(next.mode, "standard");
    assert.equal(next.displayKey, "D");
    assert.equal(next.shapeView, false);
    assert.equal(next.capoFret, 0);
  });

  it("applies the destination arrangement prefs after navigation", () => {
    const mandramPrefs: ChartViewPrefs = {
      user_id: "u1",
      arrangement_id: "arr-mandram",
      view_mode: "lyrics",
      display_key: "E",
      shape_view: false,
      capo_fret: 1,
      updated_at: new Date().toISOString(),
    };

    const { next } = navigateStand(
      {
        arrangement: {
          default_key: "G",
          chart_source_key: "G",
          capo: 0,
        },
        prefs: null,
      },
      {
        arrangement: {
          default_key: "D",
          chart_source_key: "D",
          capo: 0,
        },
        prefs: mandramPrefs,
        overrideKey: null,
        overrideCapo: null,
      },
    );

    assert.equal(next.mode, "lyrics");
    assert.equal(next.displayKey, "E");
    assert.equal(next.capoFret, 1);
    assert.equal(next.concertKey, "D");
  });

  it("honors set overrides on the destination item only", () => {
    const { next } = navigateStand(
      {
        arrangement: {
          default_key: "G",
          chart_source_key: "G",
          capo: 0,
        },
        overrideKey: "A",
        overrideCapo: 2,
      },
      {
        arrangement: {
          default_key: "D",
          chart_source_key: "D",
          capo: 0,
        },
        overrideKey: "Eb",
        overrideCapo: 1,
      },
    );

    assert.equal(next.concertKey, "Eb");
    assert.equal(next.displayKey, "Eb");
    assert.equal(next.capoFret, 1);
  });
});
