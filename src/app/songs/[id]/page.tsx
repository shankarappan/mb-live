import { notFound } from "next/navigation";
import { archiveSong, restoreSong } from "@/actions/songs";
import { AppShell } from "@/components/layout/app-shell";
import { ChordBody } from "@/components/songs/chord-body";
import { FileList } from "@/components/songs/file-list";
import { FileUploadForm } from "@/components/songs/file-upload-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { isLeaderOrAdmin, requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Song, SongFile } from "@/lib/types/database";

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: song } = await supabase
    .from("songs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!song) notFound();

  const { data: visibleFiles } = await supabase
    .from("song_files")
    .select("*")
    .eq("song_id", id)
    .order("created_at", { ascending: false });

  let hiddenCount = 0;
  if (!isLeaderOrAdmin(profile.role)) {
    try {
      const admin = createAdminClient();
      const { count } = await admin
        .from("song_files")
        .select("*", { count: "exact", head: true })
        .eq("song_id", id);
      hiddenCount = Math.max((count ?? 0) - (visibleFiles?.length ?? 0), 0);
    } catch {
      hiddenCount = 0;
    }
  }

  const s = song as Song;
  const files = (visibleFiles as SongFile[] | null) ?? [];

  return (
    <AppShell profile={profile}>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl">{s.title}</h1>
              <p className="text-muted-foreground">{s.artist || "Unknown artist"}</p>
            </div>
            {isLeaderOrAdmin(profile.role) && (
              <div className="flex gap-2">
                <LinkButton variant="secondary" size="sm" href={`/songs/${s.id}/edit`}>Edit</LinkButton>
                {s.status === "active" ? (
                  <form action={archiveSong}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Archive
                    </Button>
                  </form>
                ) : (
                  <form action={restoreSong}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Restore
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {s.default_key && <Badge>Key {s.default_key}</Badge>}
            {s.tempo_bpm && <Badge variant="secondary">{s.tempo_bpm} BPM</Badge>}
            {s.time_signature && (
              <Badge variant="outline">{s.time_signature}</Badge>
            )}
            {s.capo > 0 && <Badge variant="outline">Capo {s.capo}</Badge>}
            {s.tags?.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          {s.arrangement_notes && (
            <p className="rounded-lg border border-border/60 bg-accent/30 px-3 py-2 text-sm">
              {s.arrangement_notes}
            </p>
          )}
        </div>

        <section className="space-y-3">
          <h2 className="font-display text-xl">Lyrics & chords</h2>
          <div className="rounded-xl border border-border/70 bg-card/40 p-4">
            <ChordBody body={s.body} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">Files</h2>
          <FileList
            files={files}
            songId={s.id}
            profile={profile}
            hiddenCount={hiddenCount}
          />
          <FileUploadForm
            songId={s.id}
            canTargetAll={isLeaderOrAdmin(profile.role)}
          />
        </section>
      </div>
    </AppShell>
  );
}
