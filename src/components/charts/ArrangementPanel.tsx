"use client";

import { useActionState, useState } from "react";
import {
  createArrangement,
  setDefaultArrangement,
  type ActionState,
} from "@/actions/arrangements";
import { ChartEditor } from "@/components/charts/ChartEditor";
import { ChartView } from "@/components/charts/ChartView";
import { CreateArrangementPanel } from "@/components/charts/CreateArrangementPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
            {createState.error ? (
              <p className="w-full text-sm text-destructive">
                {createState.error}
              </p>
            ) : null}
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
              {arr.default_key ? ` · ${arr.default_key}` : ""}
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
          key={active.id}
          arrangement={active}
          prefs={prefsByArrangement[active.id] ?? null}
          persistPrefs
        />
      )}

      {canEdit ? (
        <CreateArrangementPanel
          key={active.id}
          songId={songId}
          source={active}
        />
      ) : null}
    </div>
  );
}
