"use client";

import { useMemo, useState } from "react";
import { addNonSongItem, addSongToSetlist } from "@/actions/setlists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Arrangement, Song } from "@/lib/types/database";

export function AddSongPanel({
  setlistId,
  songs,
  arrangementsBySong = {},
}: {
  setlistId: string;
  songs: Song[];
  arrangementsBySong?: Record<string, Arrangement[]>;
}) {
  const [songId, setSongId] = useState("");
  const arrangements = useMemo(
    () => (songId ? arrangementsBySong[songId] ?? [] : []),
    [arrangementsBySong, songId],
  );

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card/30 p-4">
      <h3 className="font-medium">Add to set</h3>
      <form action={addSongToSetlist} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input type="hidden" name="setlist_id" value={setlistId} />
        <select
          name="song_id"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm sm:min-w-[14rem] sm:flex-1"
          value={songId}
          onChange={(e) => setSongId(e.target.value)}
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
        {arrangements.length > 0 ? (
          <select
            name="arrangement_id"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm sm:w-48"
            defaultValue={
              songs.find((s) => s.id === songId)?.default_arrangement_id ??
              arrangements[0]?.id ??
              ""
            }
            key={songId}
          >
            {arrangements.map((arr) => (
              <option key={arr.id} value={arr.id}>
                {arr.name}
                {arr.default_key ? ` · ${arr.default_key}` : ""}
              </option>
            ))}
          </select>
        ) : null}
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
