import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"
import { LinkButton } from "@/components/ui/link-button";
import { Input } from "@/components/ui/input";
import { isLeaderOrAdmin, requireProfile } from "@/lib/auth";
import { LIST_PAGE_SIZE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Song } from "@/lib/types/database";

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tag?: string;
    key?: string;
    tempo_min?: string;
    tempo_max?: string;
    archived?: string;
    page?: string;
  }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * LIST_PAGE_SIZE;
  const to = from + LIST_PAGE_SIZE - 1;

  // Escape PostgREST filter wildcards / commas in free-text search.
  const q = (params.q ?? "").trim().replace(/[%_,]/g, " ").slice(0, 80);

  let query = supabase
    .from("songs")
    .select("*", { count: "exact" })
    .order("title")
    .range(from, to);

  if (params.archived === "1") {
    query = query.eq("status", "archived");
  } else {
    query = query.eq("status", "active");
  }

  if (q) {
    query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%,body.ilike.%${q}%`);
  }
  if (params.tag) {
    query = query.contains("tags", [params.tag]);
  }
  if (params.key) {
    query = query.eq("default_key", params.key);
  }
  if (params.tempo_min) {
    query = query.gte("tempo_bpm", Number(params.tempo_min));
  }
  if (params.tempo_max) {
    query = query.lte("tempo_bpm", Number(params.tempo_max));
  }

  const { data, count } = await query;
  const songs = (data as Song[] | null) ?? [];
  const total = count ?? songs.length;
  const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-wide">Songs</h1>
            <p className="text-sm text-muted-foreground">
              Canonical library for the band.
            </p>
          </div>
          {isLeaderOrAdmin(profile.role) && (
            <LinkButton href="/songs/new">Add song</LinkButton>
          )}
        </div>

        <form className="panel grid gap-2 p-3 sm:grid-cols-5">
          <Input
            name="q"
            placeholder="Search title, artist…"
            defaultValue={params.q ?? ""}
            className="sm:col-span-2"
          />
          <Input name="tag" placeholder="Tag" defaultValue={params.tag ?? ""} />
          <Input name="key" placeholder="Key" defaultValue={params.key ?? ""} />
          <div className="flex gap-2 sm:col-span-5">
            <Input
              name="tempo_min"
              type="number"
              placeholder="BPM min"
              defaultValue={params.tempo_min ?? ""}
            />
            <Input
              name="tempo_max"
              type="number"
              placeholder="BPM max"
              defaultValue={params.tempo_max ?? ""}
            />
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </div>
        </form>

        <ul className="panel divide-y divide-border/70 overflow-hidden p-0">
          {songs.map((song) => (
            <li key={song.id}>
              <Link
                href={`/songs/${song.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{song.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[song.artist, song.tempo_bpm ? `${song.tempo_bpm} BPM` : null]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {song.default_key && (
                    <Badge variant="outline">{song.default_key}</Badge>
                  )}
                  {song.tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Link>
            </li>
          ))}
          {songs.length === 0 && (
            <li className="px-4 py-8 text-sm text-muted-foreground">
              No songs match these filters.
            </li>
          )}
        </ul>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              Page {page} of {totalPages} ({total} songs)
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <LinkButton
                  href={`/songs?${new URLSearchParams({
                    ...Object.fromEntries(
                      Object.entries(params).filter(
                        ([k, v]) => k !== "page" && Boolean(v)
                      )
                    ),
                    page: String(page - 1),
                  }).toString()}`}
                  variant="secondary"
                  size="sm"
                >
                  Previous
                </LinkButton>
              )}
              {page < totalPages && (
                <LinkButton
                  href={`/songs?${new URLSearchParams({
                    ...Object.fromEntries(
                      Object.entries(params).filter(
                        ([k, v]) => k !== "page" && Boolean(v)
                      )
                    ),
                    page: String(page + 1),
                  }).toString()}`}
                  variant="secondary"
                  size="sm"
                >
                  Next
                </LinkButton>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
