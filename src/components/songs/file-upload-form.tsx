"use client";

import { useActionState } from "react";
import { uploadSongFile, type ActionState } from "@/actions/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FILE_TYPES, INSTRUMENTS } from "@/lib/constants";

const initial: ActionState = {};

export function FileUploadForm({
  songId,
}: {
  songId: string;
  canTargetAll?: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadSongFile, initial);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-border/80 bg-card/40 p-4"
    >
      <input type="hidden" name="song_id" value={songId} />
      <h3 className="font-medium">Upload file</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="file">File</Label>
          <Input id="file" name="file" type="file" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="file_type">Type</Label>
          <select
            id="file_type"
            name="file_type"
            defaultValue="other"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {FILE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Visible to</Label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="everyone"
            value="true"
            defaultChecked
            className="size-4 accent-primary"
          />
          Everyone
        </label>
        <div className="flex flex-wrap gap-3 pt-1">
          {INSTRUMENTS.map((inst) => (
            <label
              key={inst}
              className="flex items-center gap-2 text-sm capitalize"
            >
              <input
                type="checkbox"
                name="target_instruments"
                value={inst}
                className="size-4 accent-primary"
              />
              {inst}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Keep Everyone checked for band-wide files, or pick instruments only.
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-primary" role="status">
          {state.success}
        </p>
      )}

      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}
