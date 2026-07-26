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
        // Unsupported or denied
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
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#050712] p-6 text-center text-[#F6F7FB]">
        <p>This set has no items yet.</p>
        <LinkButton variant="secondary" href={`/sets/${setlist.id}`}>
          Back to set
        </LinkButton>
      </div>
    );
  }

  const song = item.song;
  const title =
    item.item_type === "song"
      ? song?.title || "Untitled song"
      : item.label || item.item_type;
  const key = item.override_key || song?.default_key;
  const tempo = item.override_tempo || song?.tempo_bpm;
  const capo = item.override_capo ?? song?.capo;
  const note = item.item_note || song?.arrangement_notes;

  return (
    <div
      id="stand-stage"
      className="flex min-h-dvh flex-col bg-[#050712] text-[#F6F7FB]"
      role="region"
      aria-label={`Stage mode: ${setlist.name}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[#222B47] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-display text-xs uppercase tracking-[0.16em] text-[#98A4BE]">
            {setlist.name}
          </p>
          <p className="font-display text-sm text-[#42D9F2]" aria-live="polite">
            {index + 1} / {total}
          </p>
        </div>
        <LinkButton
          variant="ghost"
          size="icon"
          href={`/sets/${setlist.id}`}
          aria-label="Exit stage mode"
          className="text-[#F6F7FB]"
        >
          <X className="size-5" />
        </LinkButton>
      </header>

      {stale && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b border-[#FF727A]/50 bg-[#FF727A]/15 px-4 py-3 text-sm"
          role="status"
        >
          <span>
            <strong className="text-[#FF727A]">Set updated.</strong> Reload for
            the latest order and notes.
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            Reload set
          </Button>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-4xl min-w-0 flex-1 flex-col gap-4 px-4 py-5 sm:px-6 landscape:max-w-5xl">
        <div className="space-y-2">
          <h1 className="font-display text-4xl tracking-wide sm:text-5xl landscape:text-4xl">
            {title}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-display text-xl text-[#42D9F2] sm:text-2xl">
            {key && (
              <span>
                <span className="sr-only">Key </span>
                {key}
              </span>
            )}
            {tempo != null && (
              <span>
                <span className="sr-only">Tempo </span>
                {tempo} BPM
              </span>
            )}
            {capo != null && capo > 0 && (
              <span>
                <span className="sr-only">Capo </span>
                Capo {capo}
              </span>
            )}
          </div>
          {note && (
            <p className="rounded-xl border border-[#9A5CFF]/35 bg-[#9A5CFF]/10 px-3 py-2 text-base text-[#F6F7FB]">
              <span className="font-display text-xs uppercase tracking-wider text-[#9A5CFF]">
                Arrangement
              </span>
              <br />
              {note}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[#222B47] bg-[#090D1C] p-4 sm:p-6">
          {item.item_type === "song" && song?.body ? (
            <ChordBody body={song.body} large />
          ) : (
            <p className="text-lg text-[#98A4BE]">
              {item.item_type === "song"
                ? "No lyrics/chords body for this song."
                : item.item_note || "Break / note"}
            </p>
          )}
        </div>
      </main>

      <footer
        className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-[#222B47] bg-[#050712]/95 px-4 py-3 backdrop-blur-md"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <Button
          type="button"
          variant="secondary"
          className="min-h-12"
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Previous item"
        >
          <ChevronLeft className="size-5" aria-hidden />
          Previous
        </Button>
        <Button
          type="button"
          className="min-h-12"
          onClick={() => go(1)}
          disabled={index >= total - 1}
          aria-label="Next item"
        >
          Next
          <ChevronRight className="size-5" aria-hidden />
        </Button>
      </footer>
    </div>
  );
}
