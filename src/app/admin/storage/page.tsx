import { AppShell } from "@/components/layout/app-shell";
import { LinkButton } from "@/components/ui/link-button";
import { requireRole } from "@/lib/auth";
import { LIST_PAGE_SIZE, MAX_FILE_LABEL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { SongFile } from "@/lib/types/database";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export default async function AdminStoragePage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("song_files")
    .select("*, song:songs(title)")
    .order("size_bytes", { ascending: false })
    .limit(LIST_PAGE_SIZE * 2);

  const files = (data as (SongFile & { song?: { title: string } | null })[] | null) ?? [];
  const total = files.reduce((sum, f) => sum + (f.size_bytes || 0), 0);

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">Storage</h1>
            <p className="text-sm text-muted-foreground">
              Total used: <strong>{formatBytes(total)}</strong> across{" "}
              {files.length} files ({MAX_FILE_LABEL} per-file cap).
            </p>
          </div>
          <LinkButton variant="ghost" size="sm" href="/admin/users">Users</LinkButton>
        </div>
        <ul className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card/30">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{file.filename}</p>
                <p className="truncate text-muted-foreground">
                  {(file.song as { title?: string } | null)?.title ?? "Song"} ·{" "}
                  {file.file_type}
                </p>
              </div>
              <span className="shrink-0 text-muted-foreground">
                {formatBytes(file.size_bytes)}
              </span>
            </li>
          ))}
          {files.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground">
              No uploads yet.
            </li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
