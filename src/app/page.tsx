import Image from "next/image";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  AudioLines,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileAudio,
  ListOrdered,
  MapPin,
  Music2,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/layout/empty-state";
import { Panel } from "@/components/layout/panel";
import { StatusPill } from "@/components/layout/status-pill";
import { LinkButton } from "@/components/ui/link-button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Setlist,
  SetlistItemWithSong,
  Song,
} from "@/lib/types/database";

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: upcoming },
    { data: recentSongs },
    { data: memberRows },
    { count: songCount },
    { count: fileCount },
  ] = await Promise.all([
    supabase
      .from("setlists")
      .select("*")
      .neq("status", "archived")
      .or(`event_date.gte.${today},event_date.is.null`)
      .order("event_date", { ascending: true, nullsFirst: false })
      .limit(3),
    supabase
      .from("songs")
      .select("*")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase.from("profiles").select("id, display_name, email, role").limit(50),
    supabase
      .from("songs")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("song_files").select("*", { count: "exact", head: true }),
  ]);

  const nextSet = (upcoming as Setlist[] | null)?.[0] ?? null;
  const members = (memberRows as Pick<
    Profile,
    "id" | "display_name" | "email" | "role"
  >[] | null) ?? [];

  let setItems: SetlistItemWithSong[] = [];
  if (nextSet) {
    const { data: items } = await supabase
      .from("setlist_items")
      .select("*, song:songs(*)")
      .eq("setlist_id", nextSet.id)
      .order("position", { ascending: true })
      .limit(40);
    setItems = (items as SetlistItemWithSong[] | null) ?? [];
  }

  const songSlots = setItems.filter((i) => i.item_type === "song");
  const songsReady = songSlots.filter((i) => i.song).length;

  const pulse: {
    id: string;
    title: string;
    detail: string;
    when: string;
    tone: "cyan" | "violet" | "coral" | "success";
    icon: "clock" | "list" | "file" | "alert" | "music";
  }[] = [];

  if (nextSet) {
    pulse.push({
      id: `set-${nextSet.id}`,
      title: nextSet.name,
      detail: [
        nextSet.event_type,
        nextSet.venue,
        nextSet.status === "draft" ? "Draft — needs final review" : nextSet.status,
      ]
        .filter(Boolean)
        .join(" · "),
      when: nextSet.event_date
        ? format(parseISO(nextSet.event_date), "EEE d MMM")
        : "Date TBD",
      tone: nextSet.status === "draft" ? "coral" : "violet",
      icon: nextSet.status === "draft" ? "alert" : "clock",
    });
  }

  for (const song of ((recentSongs as Song[] | null) ?? []).slice(0, 4)) {
    pulse.push({
      id: `song-${song.id}`,
      title: song.title,
      detail: song.arrangement_notes
        ? "Arrangement notes updated"
        : song.artist || "Song updated",
      when: format(parseISO(song.updated_at), "d MMM · HH:mm"),
      tone: song.arrangement_notes ? "coral" : "cyan",
      icon: song.arrangement_notes ? "alert" : "music",
    });
  }

  const IconMap = {
    clock: Clock3,
    list: ListOrdered,
    file: FileAudio,
    alert: AlertTriangle,
    music: Music2,
  };

  return (
    <AppShell profile={profile} wide>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.65fr)_minmax(15rem,1fr)] md:items-start">
        <div className="min-w-0 space-y-5">
          {nextSet ? (
            <Panel className="overflow-hidden p-0">
              <div className="relative min-h-[16rem] sm:min-h-[18rem]">
                <Image
                  src="/brand/stage-hero.png"
                  alt="Empty stage with drums under violet and cyan lights"
                  fill
                  priority
                  className="object-cover object-[60%_40%]"
                  sizes="(max-width: 1024px) 100vw, 720px"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--page)_92%,transparent)] via-[color-mix(in_srgb,var(--page)_55%,transparent)] to-[color-mix(in_srgb,var(--page)_25%,transparent)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--page)_85%,transparent)] via-transparent to-transparent" />
                <div className="relative z-10 flex h-full min-h-[16rem] flex-col justify-end gap-3 p-5 sm:min-h-[18rem] sm:p-6">
                  <StatusPill tone="violet">
                    {nextSet.event_date
                      ? format(parseISO(nextSet.event_date), "EEEE").toUpperCase()
                      : "UP NEXT"}
                  </StatusPill>
                  <div className="space-y-1">
                    <h1 className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
                      {nextSet.name}
                    </h1>
                    <p className="font-display text-3xl text-violet sm:text-4xl">
                      {nextSet.event_date
                        ? format(parseISO(nextSet.event_date), "d MMM yyyy")
                        : "Date TBD"}
                    </p>
                    <p className="text-sm text-cyan">
                      {[nextSet.event_type, nextSet.status]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {nextSet.venue && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      {nextSet.venue}
                    </p>
                  )}
                  {nextSet.notes && (
                    <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">
                      {nextSet.notes}
                    </p>
                  )}
                </div>
              </div>
              <div className="border-t border-border p-4 sm:p-5">
                <Link
                  href={`/sets/${nextSet.id}/stand`}
                  className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--violet)_55%,transparent)] bg-[color-mix(in_srgb,var(--violet)_16%,transparent)] px-4 py-3 text-left transition hover:bg-[color-mix(in_srgb,var(--violet)_24%,transparent)] focus-visible:outline-none"
                >
                  <span className="flex items-center gap-3">
                    <AudioLines className="size-5 text-violet" aria-hidden />
                    <span className="font-display text-lg tracking-wide">
                      Enter Stage Mode
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-violet transition group-hover:translate-x-0.5" />
                </Link>
              </div>
            </Panel>
          ) : (
            <EmptyState
              title="No upcoming set"
              description="Leaders can create a set list under Sets. Home will spotlight the next performance here."
              action={
                <LinkButton href="/sets" size="sm">
                  Browse sets
                </LinkButton>
              }
            />
          )}

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Panel className="px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2 text-violet">
                <CheckCircle2 className="size-4" aria-hidden />
                <p className="font-display text-xs tracking-[0.14em] uppercase">
                  Set
                </p>
              </div>
              <p className="mt-2 font-display text-2xl tabular-nums">
                {nextSet ? `${songsReady}/${songSlots.length || 0}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">songs ready</p>
            </Panel>
            <Panel className="px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2 text-cyan">
                <FileAudio className="size-4" aria-hidden />
                <p className="font-display text-xs tracking-[0.14em] uppercase">
                  Files
                </p>
              </div>
              <p className="mt-2 font-display text-2xl tabular-nums">
                {fileCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">in library</p>
            </Panel>
            <Panel className="px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2 text-cyan">
                <Users className="size-4" aria-hidden />
                <p className="font-display text-xs tracking-[0.14em] uppercase">
                  Band
                </p>
              </div>
              <p className="mt-2 font-display text-2xl tabular-nums">
                {members.length}
              </p>
              <p className="text-xs text-muted-foreground">members</p>
            </Panel>
          </div>

          <Panel className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-xl tracking-wide">Set queue</h2>
              {nextSet && (
                <Link
                  href={`/sets/${nextSet.id}`}
                  className="text-sm text-cyan hover:underline"
                >
                  Open set
                </Link>
              )}
            </div>
            {songSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {nextSet
                  ? "This set has no songs yet."
                  : "Queue appears when an upcoming set exists."}
              </p>
            ) : (
              <ol className="divide-y divide-border/70">
                {songSlots.slice(0, 8).map((item, index) => {
                  const song = item.song as Song | null;
                  const active = index === 0;
                  return (
                    <li
                      key={item.id}
                      className={
                        active
                          ? "signal-row-active -mx-2 rounded-xl px-2"
                          : undefined
                      }
                    >
                      <div className="flex min-h-14 items-center gap-3 py-2.5">
                        <span className="w-6 font-display text-sm tabular-nums text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {active ? (
                          <AudioLines className="size-4 text-violet" aria-hidden />
                        ) : (
                          <Music2 className="size-4 text-muted-foreground" aria-hidden />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {song?.title || item.label || "Untitled"}
                          </p>
                          <p className="truncate text-xs text-cyan">
                            {[
                              item.override_key || song?.default_key,
                              (item.override_tempo || song?.tempo_bpm)
                                ? `${item.override_tempo || song?.tempo_bpm} BPM`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "Key / tempo TBD"}
                          </p>
                        </div>
                        <div className="hidden text-right text-xs text-muted-foreground sm:block">
                          <p className="font-display tabular-nums text-foreground">
                            {formatDuration(song?.duration_seconds)}
                          </p>
                          <p>
                            {song?.arrangement_notes ? "notes" : "v1"}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            {songSlots.length > 8 && (
              <p className="text-sm text-cyan">
                + {songSlots.length - 8} more songs
              </p>
            )}
          </Panel>
        </div>

        <aside className="min-w-0 space-y-3 md:sticky md:top-20">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl tracking-wide">Band pulse</h2>
            <StatusPill tone="cyan">{songCount ?? 0} songs</StatusPill>
          </div>
          <Panel elevated className="space-y-0 p-0">
            {pulse.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                Recent updates will show here as the library grows.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {pulse.map((item) => {
                  const Icon = IconMap[item.icon];
                  return (
                    <li key={item.id} className="flex gap-3 px-4 py-3.5">
                      <span
                        className={
                          item.tone === "coral"
                            ? "text-coral"
                            : item.tone === "violet"
                              ? "text-violet"
                              : "text-cyan"
                        }
                      >
                        <Icon className="mt-0.5 size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.title}</p>
                        <p
                          className={
                            item.tone === "coral"
                              ? "text-sm text-coral"
                              : "text-sm text-muted-foreground"
                          }
                        >
                          {item.detail}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.when}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </AppShell>
  );
}
