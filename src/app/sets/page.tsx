import Link from "next/link";
import { format, parseISO } from "date-fns";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { isLeaderOrAdmin, requireProfile } from "@/lib/auth";
import { LIST_PAGE_SIZE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Setlist } from "@/lib/types/database";

export default async function SetsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  // Bound list growth; a working band set library stays well under this.
  const { data } = await supabase
    .from("setlists")
    .select("*")
    .order("event_date", { ascending: false, nullsFirst: false })
    .limit(LIST_PAGE_SIZE);

  const sets = (data as Setlist[] | null) ?? [];
  const upcoming = sets.filter((s) => s.status !== "archived");
  const archived = sets.filter((s) => s.status === "archived");

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-wide">Set lists</h1>
            <p className="text-sm text-muted-foreground">
              Rehearsals and gigs in one place.
            </p>
          </div>
          {isLeaderOrAdmin(profile.role) && (
            <LinkButton href="/sets/new">New set</LinkButton>
          )}
        </div>

        <SetGroup title="Active" sets={upcoming} />
        {archived.length > 0 && <SetGroup title="Archived" sets={archived} />}
      </div>
    </AppShell>
  );
}

function SetGroup({ title, sets }: { title: string; sets: Setlist[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl">{title}</h2>
      <ul className="panel divide-y divide-border/70 overflow-hidden p-0">
        {sets.map((set) => (
          <li key={set.id}>
            <Link
              href={`/sets/${set.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{set.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[
                    set.event_date
                      ? format(parseISO(set.event_date), "d MMM yyyy")
                      : null,
                    set.event_type,
                    set.venue,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {set.status}
              </Badge>
            </Link>
          </li>
        ))}
        {sets.length === 0 && (
          <li className="px-4 py-6 text-sm text-muted-foreground">
            No sets here yet.
          </li>
        )}
      </ul>
    </section>
  );
}
