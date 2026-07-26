"use client";

import { useActionState, useState } from "react";
import {
  updateArrangement,
  type ActionState,
} from "@/actions/arrangements";
import { ChartView } from "@/components/charts/ChartView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Arrangement } from "@/lib/types/database";

const initial: ActionState = {};

type Props = {
  arrangement: Arrangement;
  canEdit: boolean;
};

export function ChartEditor({ arrangement, canEdit }: Props) {
  const [body, setBody] = useState(arrangement.body);
  const [defaultKey, setDefaultKey] = useState(arrangement.default_key ?? "");
  const [showPreview, setShowPreview] = useState(true);
  const [state, formAction, pending] = useActionState(updateArrangement, initial);

  if (!canEdit) {
    return <ChartView arrangement={arrangement} persistPrefs />;
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={arrangement.id} />
        <input type="hidden" name="song_id" value={arrangement.song_id} />
        <input
          type="hidden"
          name="chart_source_key"
          value={arrangement.chart_source_key ?? arrangement.default_key ?? ""}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="arr-name">Arrangement name</Label>
            <Input
              id="arr-name"
              name="name"
              defaultValue={arrangement.name}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="arr-key">Concert key</Label>
            <Input
              id="arr-key"
              name="default_key"
              value={defaultKey}
              onChange={(e) => setDefaultKey(e.target.value)}
              placeholder="G"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="arr-tempo">Tempo</Label>
            <Input
              id="arr-tempo"
              name="tempo_bpm"
              type="number"
              defaultValue={arrangement.tempo_bpm ?? ""}
              placeholder="72"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="arr-ts">Time</Label>
            <Input
              id="arr-ts"
              name="time_signature"
              defaultValue={arrangement.time_signature || "4/4"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="arr-capo">Default capo</Label>
            <Input
              id="arr-capo"
              name="capo"
              type="number"
              min={0}
              max={12}
              defaultValue={arrangement.capo ?? 0}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="arr-alt">Alternate keys</Label>
            <Input
              id="arr-alt"
              name="alternate_keys"
              defaultValue={arrangement.alternate_keys?.join(", ") ?? ""}
              placeholder="A, Bb"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="arr-notes">Arrangement notes</Label>
          <Textarea
            id="arr-notes"
            name="notes"
            rows={2}
            defaultValue={arrangement.notes ?? ""}
            placeholder="Intro x2, drop bridge live"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="arr-body">ChordPro master chart</Label>
            <button
              type="button"
              className="text-xs text-[var(--ink-3)] underline-offset-2 hover:underline"
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
          </div>
          <Textarea
            id="arr-body"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            className="font-mono text-sm"
            placeholder={
              "{title: Song}\n{key: G}\n[G]Amazing [D]grace how [Em]sweet the [C]sound"
            }
          />
          <p className="text-xs text-[var(--ink-3)]">
            Master source is ChordPro text. Nashville / Roman / lyrics views are
            derived — they are not stored separately.
          </p>
        </div>

        <details className="rounded-md border border-[var(--line)] p-3 text-sm">
          <summary className="cursor-pointer text-[var(--ink-2)]">
            Permanently rewrite chart to a new concert key
          </summary>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="display_key">New concert key</Label>
              <Input
                id="display_key"
                name="display_key"
                placeholder="A"
                className="w-24"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--ink-2)]">
              <input type="checkbox" name="rewrite_to_display" value="1" />
              Rewrite chords in saved body
            </label>
          </div>
        </details>

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-[var(--brand)]">{state.success}</p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save arrangement"}
        </Button>
      </form>

      {showPreview ? (
        <div className="border-t border-[var(--line)] pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-3)]">
            Live preview
          </p>
          <ChartView
            arrangement={{
              ...arrangement,
              body,
              default_key: defaultKey || null,
            }}
            showToolbar
          />
        </div>
      ) : null}
    </div>
  );
}
