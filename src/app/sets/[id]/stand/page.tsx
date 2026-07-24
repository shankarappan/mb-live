import { notFound } from "next/navigation";
import { ReadingMode } from "@/components/stand/reading-mode";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Setlist, SetlistItemWithSong } from "@/lib/types/database";

export default async function StandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const { data: setlist } = await supabase
    .from("setlists")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!setlist) notFound();

  const { data: items } = await supabase
    .from("setlist_items")
    .select("*, song:songs(*)")
    .eq("setlist_id", id)
    .order("position", { ascending: true });

  return (
    <ReadingMode
      setlist={setlist as Setlist}
      items={(items as SetlistItemWithSong[] | null) ?? []}
      initialUpdatedAt={(setlist as Setlist).updated_at}
    />
  );
}
