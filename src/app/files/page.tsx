import Link from "next/link";
import { format, parseISO } from "date-fns";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusPill } from "@/components/layout/status-pill";
import { requireProfile } from "@/lib/auth";
import { LIST_PAGE_SIZE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { SongFile } from "@/lib/types/database";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

export default async function FilesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("song_files")
    .select("*, song:songs(id, title)")
    .order("created_at", { ascending: false })
    .limit(LIST_PAGE_SIZE);

  const files =
    (data as (SongFile & {
      song?: { id: string; title: string } | null;
    })[] | null) ?? [];

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Files</h1>
          <p className="text-sm text-muted-foreground">
            Charts and audio visible for your instruments.
          </p>
        </div>

        {files.length === 0 ? (
          <EmptyState
            title="No files yet"
            description="Upload charts or audio from a song page. Targeted files only appear for matching instruments."
          />
        ) : (
          <ul className="panel divide-y divide-border/70 overflow-hidden">
            {files.map((file) => (
              <li key={file.id}>
                <Link
                  href={file.song?.id ? `/songs/${file.song.id}` : "/songs"}
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.filename}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {file.song?.title || "Song"} · {file.file_type}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusPill tone="cyan">{formatBytes(file.size_bytes)}</StatusPill>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(file.created_at), "d MMM")}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
