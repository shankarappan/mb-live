"use client";

import type { ChartViewMode } from "@/lib/chart/types";
import { cn } from "@/lib/utils";

const MODES: { id: ChartViewMode; label: string }[] = [
  { id: "standard", label: "Chords" },
  { id: "nashville", label: "Nashville" },
  { id: "roman", label: "Roman" },
  { id: "lyrics", label: "Lyrics" },
];

const KEYS = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

type Props = {
  mode: ChartViewMode;
  onModeChange: (mode: ChartViewMode) => void;
  concertKey: string | null;
  displayKey: string | null;
  onDisplayKey: (key: string | null) => void;
  shapeView: boolean;
  onShapeView: (on: boolean) => void;
  capoFret: number;
  onCapoFret: (n: number) => void;
  showShapeControls?: boolean;
  onSavePrefs?: () => void;
  savingPrefs?: boolean;
  className?: string;
};

export function ChartToolbar({
  mode,
  onModeChange,
  concertKey,
  displayKey,
  onDisplayKey,
  shapeView,
  onShapeView,
  capoFret,
  onCapoFret,
  showShapeControls = true,
  onSavePrefs,
  savingPrefs,
  className,
}: Props) {
  const effectiveDisplay = displayKey ?? concertKey ?? "";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Chart view">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onModeChange(m.id)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              mode === m.id
                ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)]",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "standard" || mode === "nashville" || mode === "roman" ? (
        <label className="flex items-center gap-1.5 text-xs text-[var(--ink-2)]">
          View key
          <select
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--ink)]"
            value={effectiveDisplay}
            onChange={(e) => onDisplayKey(e.target.value || null)}
          >
            {!concertKey ? <option value="">—</option> : null}
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
                {concertKey && k === concertKey ? " (concert)" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {displayKey && concertKey && displayKey !== concertKey ? (
        <button
          type="button"
          className="text-xs text-[var(--ink-3)] underline-offset-2 hover:underline"
          onClick={() => onDisplayKey(concertKey)}
        >
          Reset to concert
        </button>
      ) : null}

      {showShapeControls && mode === "standard" ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[var(--ink-2)]">
            <input
              type="checkbox"
              checked={shapeView}
              onChange={(e) => onShapeView(e.target.checked)}
              className="rounded border-[var(--line)]"
            />
            Shape view
          </label>
          {shapeView ? (
            <label className="flex items-center gap-1.5 text-xs text-[var(--ink-2)]">
              Capo
              <input
                type="number"
                min={0}
                max={11}
                className="w-14 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--ink)]"
                value={capoFret}
                onChange={(e) => onCapoFret(Number(e.target.value) || 0)}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {onSavePrefs ? (
        <button
          type="button"
          onClick={onSavePrefs}
          disabled={savingPrefs}
          className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--ink-2)] hover:text-[var(--ink)]"
        >
          {savingPrefs ? "Saving…" : "Save view prefs"}
        </button>
      ) : null}
    </div>
  );
}
