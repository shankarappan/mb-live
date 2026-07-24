import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SongForm } from "@/components/songs/song-form";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Song } from "@/lib/types/database";

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole(["admin", "leader"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("songs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl">Edit song</h1>
          <p className="text-sm text-muted-foreground">{(data as Song).title}</p>
        </div>
        <SongForm song={data as Song} />
      </div>
    </AppShell>
  );
}
