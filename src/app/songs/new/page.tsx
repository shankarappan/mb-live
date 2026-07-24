import { AppShell } from "@/components/layout/app-shell";
import { SongForm } from "@/components/songs/song-form";
import { requireRole } from "@/lib/auth";

export default async function NewSongPage() {
  const profile = await requireRole(["admin", "leader"]);

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl">New song</h1>
          <p className="text-sm text-muted-foreground">
            Add metadata and ChordPro lyrics for the library.
          </p>
        </div>
        <SongForm />
      </div>
    </AppShell>
  );
}
