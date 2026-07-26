"use client";

import { useActionState, useState } from "react";
import {
  createArrangement,
  setDefaultArrangement,
  type ActionState,
} from "@/actions/arrangements";
import { ChartEditor } from "@/components/charts/ChartEditor";
import { ChartView } from "@/components/charts/ChartView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Arrangement, ChartViewPrefs } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const initial: ActionState = {};

type Props = {
  songId: string;
  arrangements: Arrangement[];
  defaultArrangementId: string | null;
  prefsByArrangement: Record<string, ChartViewPrefs | null>;
  canEdit: boolean;
};

export function ArrangementPanel({
  songId,
  arrangements,
  defaultArrangementId,
  prefsByArrangement,
  canEdit,
}: Props) {
  const [activeId, setActiveId] = useState(
    defaultArrangementId || arrangements[0]?.id || "",
  );
  const [editing, setEditing] = useState(false);
  const [createState, createAction, creating] = useActionState(
    createArrangement,
    initial,
  );

  const active =
    arrangements.find((a) => a.id === activeId) || arrangements[0] || null;

  if (!active) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--ink-3)]">
          No arrangements yet. Create one to store the ChordPro master chart.
        </p>
        {canEdit ? (
          <form action={createAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="song_id" value={songId} />
            <Input name="name" placeholder="Original" defaultValue="Original" />
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? "Creating…" : "Create arrangement"}
            </Button>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {arrangements.map((arr) => {
          const isDefault = arr.id === defaultArrangementId;
          const isActive = arr.id === active.id;
          return (
            <button
              key={arr.id}
              type="button"
              onClick={() => {
                setActiveId(arr.id);
                setEditing(false);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                  : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)]",
              )}
            >
              {arr.name}
              {isDefault ? " · default" : ""}
            </button>
          );
        })}
        {canEdit ? (
          <button
            type="button"
            className="text-xs text-[var(--ink-3)] underline-offset-2 hover:underline"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Done editing" : "Edit chart"}
          </button>
        ) : null}
      </div>

      {canEdit && active.id !== defaultArrangementId ? (
        <form action={setDefaultArrangement}>
          <input type="hidden" name="song_id" value={songId} />
          <input type="hidden" name="arrangement_id" value={active.id} />
          <Button type="submit" size="sm" variant="secondary">
            Make default arrangement
          </Button>
        </form>
      ) : null}

      {editing && canEdit ? (
        <ChartEditor arrangement={active} canEdit />
      ) : (
        <ChartView
          arrangement={active}
          prefs={prefsByArrangement[active.id] ?? null}
          persistPrefs
        />
      )}

      {canEdit ? (
        <details className="rounded-md border border-[var(--line)] p-3">
          <summary className="cursor-pointer text-sm text-[var(--ink-2)]">
            Add arrangement
          </summary>
          <form action={createAction} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="song_id" value={songId} />
            <div className="space-y-1">
              <Label htmlFor="new-arr-name">Name</Label>
              <Input
                id="new-arr-name"
                name="name"
                placeholder="Acoustic"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-arr-key">Concert key</Label>
              <Input
                id="new-arr-key"
                name="default_key"
                defaultValue={active.default_key ?? ""}
                placeholder="G"
              />
            </div>
            <input type="hidden" name="body" value={active.body} />
            <input type="hidden" name="capo" value={String(active.capo ?? 0)} />
            <input
              type="hidden"
              name="tempo_bpm"
              value={active.tempo_bpm ?? ""}
            />
            <input
              type="hidden"
              name="time_signature"
              value={active.time_signature || "4/4"}
            />
            <Button
              type="submit"
              size="sm"
              className="sm:col-span-2"
              disabled={creating}
            >
              {creating ? "Creating…" : "Duplicate chart into new arrangement"}
            </Button>
            {createState.error ? (
              <p className="text-sm text-destructive sm:col-span-2">
                {createState.error}
              </p>
            ) : null}
          </form>
        </details>
      ) : null}
    </div>
  );
}
