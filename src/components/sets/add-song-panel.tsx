import { addNonSongItem, addSongToSetlist } from "@/actions/setlists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Song } from "@/lib/types/database";

export function AddSongPanel({
  setlistId,
  songs,
}: {
  setlistId: string;
  songs: Song[];
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card/30 p-4">
      <h3 className="font-medium">Add to set</h3>
      <form action={addSongToSetlist} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="setlist_id" value={setlistId} />
        <select
          name="song_id"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Choose a song…
          </option>
          {songs.map((song) => (
            <option key={song.id} value={song.id}>
              {song.title}
              {song.default_key ? ` (${song.default_key})` : ""}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Add song
        </Button>
      </form>

      <form action={addNonSongItem} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="setlist_id" value={setlistId} />
        <select
          name="item_type"
          className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue="break"
        >
          <option value="break">Break</option>
          <option value="note">Note</option>
          <option value="medley_marker">Medley marker</option>
        </select>
        <Input name="label" placeholder="Label (e.g. Break — 10 min)" />
        <Button type="submit" size="sm" variant="secondary">
          Add item
        </Button>
      </form>
    </div>
  );
}
