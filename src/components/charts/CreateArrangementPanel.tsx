"use client";

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import {
  createArrangement,
  type ActionState,
} from "@/actions/arrangements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CONCERT_KEY_OPTIONS,
  planChartTranspose,
  resolveAuthoritativeSourceKey,
} from "@/lib/chart";
import type { Arrangement } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const initial: ActionState = {};

type Props = {
  songId: string;
  source: Arrangement;
};

export function CreateArrangementPanel({ songId, source }: Props) {
  const router = useRouter();
  const fromKey =
    resolveAuthoritativeSourceKey({
      chart_source_key: source.chart_source_key,
      default_key: source.default_key,
      body: source.body,
    }) ?? "";

  const [name, setName] = useState(`${source.name} (transpose)`);
  const [toKey, setToKey] = useState(fromKey || "G");
  const [capo, setCapo] = useState(String(source.capo ?? 0));
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await createArrangement(prev, formData);
      if (result.success) {
        setOpen(false);
        setName(`${source.name} (transpose)`);
        router.refresh();
      }
      return result;
    },
    initial,
  );

  const planResult = useMemo(
    () => planChartTranspose(source.body, fromKey || null, toKey),
    [source.body, fromKey, toKey],
  );

  const plan = planResult.ok ? planResult.plan : null;
  const sameKey = plan?.sameKey ?? fromKey === toKey;
  const previewPairs = (plan?.pairs ?? []).filter(
    (p) => p.changed || p.warning,
  );
  const previewSample = (plan?.pairs ?? []).slice(0, 24);

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        Create arrangement
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_0_0_1px_rgba(66,217,242,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg tracking-wide text-[var(--ink)]">
            Create arrangement
          </h3>
          <p className="text-xs text-[var(--ink-3)]">
            Duplicate from <span className="text-[var(--brand)]">{source.name}</span>{" "}
            and transpose the ChordPro master with the chart engine.
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-[var(--ink-3)] underline-offset-2 hover:underline"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>

      <form action={formAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="song_id" value={songId} />
        <input type="hidden" name="source_arrangement_id" value={source.id} />

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="create-arr-name">Arrangement name</Label>
          <Input
            id="create-arr-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Acoustic — A"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="create-from-key">From key</Label>
          <Input
            id="create-from-key"
            value={fromKey || "—"}
            readOnly
            className="bg-[var(--surface-2)] text-[var(--ink-2)]"
          />
          {!fromKey ? (
            <p className="text-xs text-destructive">
              Source chart has no concert key. Set it on the original before
              transposing.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="create-to-key">To concert key</Label>
          <select
            id="create-to-key"
            name="default_key"
            value={toKey}
            onChange={(e) => setToKey(e.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-[var(--ink)]"
          >
            {CONCERT_KEY_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="create-capo">Optional capo</Label>
          <Input
            id="create-capo"
            name="capo"
            type="number"
            min={0}
            max={12}
            value={capo}
            onChange={(e) => setCapo(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink-2)]">
          {planResult.ok && plan ? (
            <p>
              <span className="font-medium text-[var(--ink)]">
                {plan.chordsDetected} chords detected
              </span>
              {" · "}
              <span className="text-[var(--brand)]">
                {plan.chordsChanged} will change
              </span>
              {" · "}
              <span
                className={
                  plan.warnings.length
                    ? "text-[var(--coral,#FF727A)]"
                    : "text-[var(--ink-3)]"
                }
              >
                {plan.warnings.length} warning
                {plan.warnings.length === 1 ? "" : "s"}
              </span>
              {sameKey ? (
                <span className="mt-1 block text-xs text-[var(--ink-3)]">
                  Same key — creates an independent editable copy with no chord
                  rewrite.
                </span>
              ) : (
                <span className="mt-1 block text-xs text-[var(--ink-3)]">
                  Transposing {fromKey} → {toKey} via the chart engine. Source
                  arrangement stays unchanged.
                </span>
              )}
            </p>
          ) : (
            <p className="text-destructive">
              {!planResult.ok ? planResult.error : "Unable to preview."}
            </p>
          )}
        </div>

        {plan && previewSample.length > 0 ? (
          <div className="sm:col-span-2 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-3)]">
              Live preview
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--line)] bg-[#090D1C] p-3">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                  Before · {fromKey || "?"}
                </p>
                <div className="flex flex-wrap gap-1.5 font-mono text-sm">
                  {previewSample.map((p, i) => (
                    <span
                      key={`b-${i}`}
                      className={cn(
                        "rounded px-1.5 py-0.5",
                        p.changed
                          ? "bg-[#FF727A]/15 text-[#FF727A]"
                          : p.warning
                            ? "bg-amber-500/15 text-amber-300"
                            : "text-[var(--ink-2)]",
                      )}
                    >
                      {p.before}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[#090D1C] p-3">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                  After · {toKey}
                </p>
                <div className="flex flex-wrap gap-1.5 font-mono text-sm">
                  {previewSample.map((p, i) => (
                    <span
                      key={`a-${i}`}
                      className={cn(
                        "rounded px-1.5 py-0.5",
                        p.changed
                          ? "bg-[var(--brand)]/20 font-semibold text-[var(--brand)]"
                          : p.warning
                            ? "bg-amber-500/15 text-amber-300"
                            : "text-[var(--ink-2)]",
                      )}
                    >
                      {p.after}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {previewPairs.some((p) => p.warning) ? (
              <ul className="text-xs text-amber-300/90">
                {plan.warnings.slice(0, 5).map((w, i) => (
                  <li key={i}>
                    [{w.token}] — {w.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {state.error ? (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-[var(--brand)] sm:col-span-2">
            {state.success}
          </p>
        ) : null}

        <Button
          type="submit"
          className="sm:col-span-2"
          disabled={pending || !planResult.ok || !fromKey}
        >
          {pending
            ? "Creating…"
            : sameKey
              ? "Create independent copy"
              : "Create transposed arrangement"}
        </Button>
      </form>
    </div>
  );
}
