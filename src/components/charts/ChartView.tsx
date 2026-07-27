"use client";

import { useMemo, useState, useTransition } from "react";
import { saveChartViewPrefs } from "@/actions/arrangements";
import { ChartToolbar } from "@/components/charts/ChartToolbar";
import { resolveChartViewInitialState } from "@/components/charts/chart-view-state";
import { buildChartView, type ChartViewMode } from "@/lib/chart";
import type { Arrangement, ChartViewPrefs } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type Props = {
  arrangement: Pick<
    Arrangement,
    "id" | "body" | "default_key" | "chart_source_key" | "capo"
  >;
  prefs?: ChartViewPrefs | null;
  /** Set/stand override concert key for temporary view */
  overrideKey?: string | null;
  overrideCapo?: number | null;
  initialMode?: ChartViewMode;
  showToolbar?: boolean;
  showShapeControls?: boolean;
  persistPrefs?: boolean;
  className?: string;
  large?: boolean;
};

function ViewBlocks({
  view,
  large,
}: {
  view: ReturnType<typeof buildChartView>;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "font-mono leading-relaxed text-[var(--ink)]",
        large ? "text-lg sm:text-xl leading-8" : "text-sm sm:text-base",
      )}
    >
      {view.blocks.length === 0 ? (
        <p className="italic text-[var(--ink-3)]">No chart content yet.</p>
      ) : (
        view.blocks.map((block, bi) => {
          if (block.type === "comment") {
            return (
              <div
                key={bi}
                className="mb-2 text-sm italic text-[var(--ink-3)]"
              >
                {block.text}
              </div>
            );
          }
          if (block.type === "keyChange") {
            return (
              <div
                key={bi}
                className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--brand)]"
              >
                Key → {block.key}
                {block.label ? ` (${block.label})` : ""}
              </div>
            );
          }
          return (
            <div key={bi} className="mb-4">
              {block.type === "section" ? (
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand)]">
                  {block.name}
                </div>
              ) : null}
              {block.lines.map((line, li) => (
                <div key={li} className="mb-1 min-h-[1.4em]">
                  {view.mode === "lyrics" || !line.hasChords ? (
                    <div className="whitespace-pre-wrap">
                      {line.lyrics || "\u00a0"}
                    </div>
                  ) : (
                    <div className="whitespace-pre">
                      {line.slots.map((slot, si) => (
                        <span key={si} className="inline-block align-top">
                          {slot.chord ? (
                            <span className="mr-1 block font-bold text-[var(--brand)]">
                              {slot.chord}
                            </span>
                          ) : (
                            <span className="block h-[1.1em]" />
                          )}
                          <span>{slot.lyric}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

export function ChartView({
  arrangement,
  prefs = null,
  overrideKey = null,
  overrideCapo = null,
  initialMode,
  showToolbar = true,
  showShapeControls = true,
  persistPrefs = false,
  className,
  large = false,
}: Props) {
  const initial = resolveChartViewInitialState({
    arrangement,
    prefs,
    overrideKey,
    overrideCapo,
    initialMode,
  });
  const concertKey = initial.concertKey;
  const sourceKey = initial.sourceKey;

  const [mode, setMode] = useState<ChartViewMode>(initial.mode);
  const [displayKey, setDisplayKey] = useState<string | null>(
    initial.displayKey,
  );
  const [shapeView, setShapeView] = useState(initial.shapeView);
  const [capoFret, setCapoFret] = useState(initial.capoFret);
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const view = useMemo(
    () =>
      buildChartView({
        source: arrangement.body,
        sourceKey,
        displayKey: displayKey ?? concertKey,
        mode,
        shapeView,
        capoFret,
      }),
    [
      arrangement.body,
      sourceKey,
      displayKey,
      concertKey,
      mode,
      shapeView,
      capoFret,
    ],
  );

  function savePrefs() {
    if (!persistPrefs) return;
    setPrefsMsg(null);
    startTransition(async () => {
      const result = await saveChartViewPrefs({
        arrangementId: arrangement.id,
        viewMode: mode,
        displayKey,
        shapeView,
        capoFret,
      });
      setPrefsMsg(result.error ?? result.success ?? null);
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      {showToolbar ? (
        <ChartToolbar
          mode={mode}
          onModeChange={setMode}
          concertKey={concertKey}
          displayKey={displayKey}
          onDisplayKey={setDisplayKey}
          shapeView={shapeView}
          onShapeView={setShapeView}
          capoFret={capoFret}
          onCapoFret={setCapoFret}
          showShapeControls={showShapeControls}
          onSavePrefs={persistPrefs ? savePrefs : undefined}
          savingPrefs={pending}
        />
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ink-3)]">
        {view.concertKey ? <span>Concert {view.concertKey}</span> : null}
        {view.shapeView ? <span>Shape view · Capo {view.capoFret}</span> : null}
        {prefsMsg ? <span className="text-[var(--brand)]">{prefsMsg}</span> : null}
      </div>

      <ViewBlocks view={view} large={large} />
    </div>
  );
}
