import Link from "next/link";
import { format, parseISO } from "date-fns";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Setlist, Song } from "@/lib/types/database";

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: upcoming }, { data: recentSongs }] = await Promise.all([
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
      .limit(6),
  ]);

  const nextSet = (upcoming as Setlist[] | null)?.[0] ?? null;

  return (
    <AppShell profile={profile}>
      <div className="space-y-8">
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Hey {profile.display_name || "there"}
          </p>
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
            Ready when you are
          </h1>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-xl">Next set</h2>
            <LinkButton variant="ghost" size="sm" href="/sets">All sets</LinkButton>
          </div>
          {nextSet ? (
            <div className="rounded-xl border border-border/70 bg-card/50 p-5">
              <Link href={`/sets/${nextSet.id}`} className="block">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-2xl">{nextSet.name}</p>
                  <Badge variant="secondary" className="capitalize">
                    {nextSet.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {[
                    nextSet.event_date
                      ? format(parseISO(nextSet.event_date), "EEE d MMM")
                      : null,
                    nextSet.event_type,
                    nextSet.venue,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Link>
              <div className="mt-4">
                <LinkButton size="sm" href={`/sets/${nextSet.id}/stand`}>
                  Open reading mode
                </LinkButton>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No upcoming sets. Leaders can create one under Sets.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-xl">Recent songs</h2>
            <LinkButton variant="ghost" size="sm" href="/songs">Library</LinkButton>
          </div>
          <ul className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card/30">
            {((recentSongs as Song[] | null) ?? []).map((song) => (
              <li key={song.id}>
                <Link
                  href={`/songs/${song.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{song.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {song.artist || "—"}
                    </p>
                  </div>
                  {song.default_key && (
                    <Badge variant="outline">{song.default_key}</Badge>
                  )}
                </Link>
              </li>
            ))}
            {(recentSongs?.length ?? 0) === 0 && (
              <li className="px-4 py-6 text-sm text-muted-foreground">
                No songs yet. Leaders can add the first chart.
              </li>
            )}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
