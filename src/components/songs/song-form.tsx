"use client";

import { useActionState } from "react";
import { createSong, updateSong, type ActionState } from "@/actions/songs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Song } from "@/lib/types/database";

const initial: ActionState = {};

export function SongForm({ song }: { song?: Song }) {
  const action = song ? updateSong : createSong;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-5">
      {song && <input type="hidden" name="id" value={song.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={song?.title ?? ""}
            placeholder="Amazing Grace"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="artist">Artist</Label>
          <Input
            id="artist"
            name="artist"
            defaultValue={song?.artist ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="default_key">Default key</Label>
          <Input
            id="default_key"
            name="default_key"
            defaultValue={song?.default_key ?? ""}
            placeholder="G"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="alternate_keys">Alternate keys</Label>
          <Input
            id="alternate_keys"
            name="alternate_keys"
            defaultValue={song?.alternate_keys?.join(", ") ?? ""}
            placeholder="A, Bb"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tempo_bpm">Tempo (BPM)</Label>
          <Input
            id="tempo_bpm"
            name="tempo_bpm"
            type="number"
            min={1}
            defaultValue={song?.tempo_bpm ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time_signature">Time signature</Label>
          <Input
            id="time_signature"
            name="time_signature"
            defaultValue={song?.time_signature ?? "4/4"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capo">Capo</Label>
          <Input
            id="capo"
            name="capo"
            type="number"
            min={0}
            max={12}
            defaultValue={song?.capo ?? 0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration_seconds">Duration (seconds)</Label>
          <Input
            id="duration_seconds"
            name="duration_seconds"
            type="number"
            min={0}
            defaultValue={song?.duration_seconds ?? ""}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={song?.tags?.join(", ") ?? ""}
            placeholder="opener, acoustic, worship"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="arrangement_notes">Arrangement notes</Label>
        <Textarea
          id="arrangement_notes"
          name="arrangement_notes"
          rows={2}
          defaultValue={song?.arrangement_notes ?? ""}
          placeholder="Intro x2, no bridge live"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Lyrics / chords (ChordPro)</Label>
        <Textarea
          id="body"
          name="body"
          rows={14}
          className="font-mono text-sm"
          defaultValue={song?.body ?? ""}
          placeholder={"[G]Amazing [C]grace how [G]sweet the sound"}
        />
        <p className="text-xs text-muted-foreground">
          Put chords in brackets before the syllable they land on.
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : song ? "Save changes" : "Create song"}
      </Button>
    </form>
  );
}
