"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  abortSongFileUpload,
  finalizeSongFileUpload,
  prepareSongFileUpload,
} from "@/actions/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  FILE_TYPES,
  INSTRUMENTS,
  MAX_FILE_BYTES,
  MAX_FILE_LABEL,
} from "@/lib/constants";
import { uploadToSignedUrlWithProgress } from "@/lib/direct-upload";
import type { Arrangement } from "@/lib/types/database";
import { isAllowedUploadFilename, isAllowedUploadMime } from "@/lib/uploads";

const ACCEPT = ALLOWED_UPLOAD_EXTENSIONS.map((ext) => `.${ext}`).join(",");

export function FileUploadForm({
  songId,
  arrangements = [],
}: {
  songId: string;
  arrangements?: Arrangement[];
  canTargetAll?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "authorizing" | "uploading" | "saving">(
    "idle"
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`File exceeds ${MAX_FILE_LABEL} limit.`);
      return;
    }
    if (!isAllowedUploadFilename(file.name)) {
      setError("File extension is not allowed.");
      return;
    }
    if (!isAllowedUploadMime(file.type)) {
      setError("File type is not allowed.");
      return;
    }

    const everyone =
      formData.get("everyone") === "on" || formData.get("everyone") === "true";
    const targetInstruments = formData
      .getAll("target_instruments")
      .map(String);
    const fileType = String(formData.get("file_type") ?? "other");
    const arrangementId =
      String(formData.get("arrangement_id") ?? "").trim() || null;

    const controller = new AbortController();
    abortRef.current = controller;
    let storagePath: string | undefined;

    startTransition(async () => {
      try {
        setPhase("authorizing");
        setProgress(0);

        const prepared = await prepareSongFileUpload({
          songId,
          arrangementId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          fileType,
          everyone,
          targetInstruments,
        });

        if (prepared.error || !prepared.token || !prepared.path || !prepared.signedUrl) {
          setError(prepared.error ?? "Could not authorize upload.");
          setPhase("idle");
          setProgress(null);
          return;
        }

        storagePath = prepared.path;
        setPhase("uploading");

        let attempt = 0;
        let lastError: Error | null = null;
        while (attempt < 2) {
          attempt += 1;
          try {
            await uploadToSignedUrlWithProgress({
              signedUrl: prepared.signedUrl,
              file,
              signal: controller.signal,
              onProgress: (p) => setProgress(p.percent),
            });
            lastError = null;
            break;
          } catch (e) {
            lastError = e instanceof Error ? e : new Error("Upload failed.");
            if (controller.signal.aborted) break;
            if (attempt >= 2) break;
            setProgress(0);
          }
        }

        if (lastError) {
          if (storagePath) {
            await abortSongFileUpload({ songId, storagePath });
          }
          setError(
            lastError.message.includes("cancel")
              ? "Upload cancelled."
              : `${lastError.message} Try again.`
          );
          setPhase("idle");
          setProgress(null);
          return;
        }

        setPhase("saving");
        const finalized = await finalizeSongFileUpload({
          songId,
          arrangementId,
          storagePath: prepared.path,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          fileType,
          everyone,
          targetInstruments,
        });

        if (finalized.error) {
          setError(finalized.error);
          setPhase("idle");
          setProgress(null);
          return;
        }

        setSuccess("File uploaded.");
        setPhase("idle");
        setProgress(null);
        form.reset();
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } catch (e) {
        if (storagePath) {
          await abortSongFileUpload({ songId, storagePath });
        }
        setError(e instanceof Error ? e.message : "Upload failed.");
        setPhase("idle");
        setProgress(null);
      } finally {
        abortRef.current = null;
      }
    });
  }

  function onCancel() {
    abortRef.current?.abort();
  }

  const busy = pending || phase !== "idle";
  const statusLabel =
    phase === "authorizing"
      ? "Authorizing…"
      : phase === "uploading"
        ? `Uploading${progress != null ? ` ${progress}%` : "…"}`
        : phase === "saving"
          ? "Saving…"
          : "Upload";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg border border-border/80 bg-card/40 p-4"
    >
      <h3 className="font-medium">Upload file</h3>
      <p className="text-xs text-muted-foreground">
        Direct to storage (up to {MAX_FILE_LABEL}). Files do not pass through the
        app server.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="file">File</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept={ACCEPT}
            required
            disabled={busy}
            ref={fileRef}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="file_type">Type</Label>
          <select
            id="file_type"
            name="file_type"
            defaultValue="other"
            disabled={busy}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {FILE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {arrangements.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="arrangement_id">Arrangement (optional)</Label>
            <select
              id="arrangement_id"
              name="arrangement_id"
              defaultValue=""
              disabled={busy}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Song-level (shared)</option>
              {arrangements.map((arr) => (
                <option key={arr.id} value={arr.id}>
                  {arr.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Visible to</Label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="everyone"
            value="true"
            defaultChecked
            disabled={busy}
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
                disabled={busy}
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

      {progress != null && (
        <div className="space-y-1" aria-live="polite">
          <div className="h-2 overflow-hidden rounded bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-primary" role="status">
          {success}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy} size="sm">
          {busy ? statusLabel : "Upload"}
        </Button>
        {busy && phase === "uploading" && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
