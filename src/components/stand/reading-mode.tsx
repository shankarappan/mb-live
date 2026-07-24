"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ChordBody } from "@/components/songs/chord-body";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import type { Setlist, SetlistItemWithSong } from "@/lib/types/database";

export function ReadingMode({
  setlist,
  items,
  initialUpdatedAt,
}: {
  setlist: Setlist;
  items: SetlistItemWithSong[];
  initialUpdatedAt: string;
}) {
  const [index, setIndex] = useState(0);
  const [stale, setStale] = useState(false);

  const item = items[index];
  const total = items.length;

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0)));
    },
    [total]
  );

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Unsupported or denied — document iOS Safari caveat in README
      }
    }

    requestWakeLock();

    function onVisibility() {
      if (document.visibilityState === "visible") {
        requestWakeLock();
        void checkUpdated();
      }
    }

    async function checkUpdated() {
      try {
        const res = await fetch(`/api/setlists/${setlist.id}/updated-at`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { updated_at?: string };
        if (data.updated_at && data.updated_at !== initialUpdatedAt) {
          setStale(true);
        }
      } catch {
        // ignore
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      void wakeLock?.release();
    };
  }, [go, initialUpdatedAt, setlist.id]);

  // Touch swipe
  useEffect(() => {
    let startX = 0;
    const el = document.getElementById("stand-stage");
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      startX = e.changedTouches[0]?.clientX ?? 0;
    };
    const onEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0]?.clientX ?? 0;
      const dx = endX - startX;
      if (Math.abs(dx) < 50) return;
      go(dx < 0 ? 1 : -1);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [go]);

  if (total === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p>This set has no items yet.</p>
        <LinkButton variant="secondary" href={`/sets/${setlist.id}`}>Back to set</LinkButton>
      </div>
    );
  }

  const title =
    item.item_type === "song"
      ? item.song?.title ?? "Song"
      : item.label || item.item_type;
  const key =
    item.override_key ?? item.song?.default_key ?? null;
  const tempo = item.override_tempo ?? item.song?.tempo_bpm ?? null;
  const capo = item.override_capo ?? item.song?.capo ?? null;

  return (
    <div className="dark min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg">{setlist.name}</p>
            <p className="text-xs text-muted-foreground">
              {index + 1} / {total}
            </p>
          </div>
          <LinkButton size="icon" variant="ghost" aria-label="Exit reading mode" href={`/sets/${setlist.id}`}>
              <X className="size-5" />
            </LinkButton>
        </header>

        {stale && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mx-4 rounded-md bg-primary/20 px-3 py-2 text-left text-sm text-primary"
          >
            Set updated — tap to refresh
          </button>
        )}

        <div id="stand-stage" className="flex flex-1 flex-col px-4 pb-6 pt-2">
          <div className="mb-4 space-y-1">
            <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {key && <span>Key {key}</span>}
              {tempo != null && <span>{tempo} BPM</span>}
              {capo != null && capo > 0 && <span>Capo {capo}</span>}
              {item.song?.artist && <span>{item.song.artist}</span>}
            </div>
            {item.item_note && (
              <p className="text-sm text-primary">{item.item_note}</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto rounded-lg bg-card/40 p-4">
            {item.item_type === "song" && item.song ? (
              <ChordBody body={item.song.body} large />
            ) : (
              <p className="font-display text-2xl capitalize text-muted-foreground">
                {item.label || item.item_type.replace("_", " ")}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              size="lg"
              variant="secondary"
              disabled={index === 0}
              onClick={() => go(-1)}
              className="min-w-28"
            >
              <ChevronLeft className="size-5" />
              Prev
            </Button>
            <Button
              size="lg"
              disabled={index >= total - 1}
              onClick={() => go(1)}
              className="min-w-28"
            >
              Next
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
