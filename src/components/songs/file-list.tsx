"use client";

import { useState, useTransition } from "react";
import { deleteSongFile, getSignedFileUrl } from "@/actions/files";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FILE_TYPES } from "@/lib/constants";
import type { Profile, SongFile } from "@/lib/types/database";
import { isLeaderOrAdmin } from "@/lib/auth-client";

function fileTypeLabel(value: string) {
  return FILE_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function FileList({
  files,
  songId,
  profile,
  hiddenCount = 0,
}: {
  files: SongFile[];
  songId: string;
  profile: Profile;
  hiddenCount?: number;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function openFile(file: SongFile) {
    startTransition(async () => {
      const result = await getSignedFileUrl(file.id);
      if (result.error || !result.url) {
        setErrors((e) => ({
          ...e,
          [file.id]: result.error ?? "Could not open file",
        }));
        return;
      }
      setUrls((u) => ({ ...u, [file.id]: result.url! }));
    });
  }

  if (files.length === 0) {
    return (
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>No files visible for your instruments.</p>
        {hiddenCount > 0 && (
          <p>{hiddenCount} file{hiddenCount === 1 ? "" : "s"} hidden for other instruments.</p>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {files.map((file) => {
        const url = urls[file.id];
        const isAudio =
          file.mime_type?.startsWith("audio/") ||
          ["mp3", "stem", "click", "guide"].includes(file.file_type);
        const isPdf =
          file.mime_type === "application/pdf" ||
          file.filename.toLowerCase().endsWith(".pdf");
        const canDelete =
          file.uploaded_by === profile.id || isLeaderOrAdmin(profile.role);

        return (
          <li
            key={file.id}
            className="rounded-lg border border-border/70 bg-card/30 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{file.filename}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{fileTypeLabel(file.file_type)}</Badge>
                  {isLeaderOrAdmin(profile.role) && (
                    <Badge variant="outline">
                      {file.target_instruments?.length
                        ? file.target_instruments.join(", ")
                        : "everyone"}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!url && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => openFile(file)}
                  >
                    Open
                  </Button>
                )}
                {canDelete && (
                  <form action={deleteSongFile}>
                    <input type="hidden" name="file_id" value={file.id} />
                    <input type="hidden" name="song_id" value={songId} />
                    <Button size="sm" variant="ghost" type="submit">
                      Delete
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {errors[file.id] && (
              <p className="mt-2 text-sm text-destructive">{errors[file.id]}</p>
            )}

            {url && isAudio && (
              <audio className="mt-3 w-full" controls src={url} preload="metadata" />
            )}
            {url && isPdf && (
              <iframe
                title={file.filename}
                src={url}
                className="mt-3 h-[70vh] w-full rounded border border-border"
              />
            )}
            {url && !isAudio && !isPdf && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-primary underline"
              >
                Download / open
              </a>
            )}
          </li>
        );
      })}
      {hiddenCount > 0 && (
        <li className="text-sm text-muted-foreground">
          {hiddenCount} file{hiddenCount === 1 ? "" : "s"} hidden for other instruments.
        </li>
      )}
    </ul>
  );
}
