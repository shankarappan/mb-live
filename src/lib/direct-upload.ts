/**
 * Browser helper: PUT a file to a Supabase signed upload URL with progress.
 * Bytes go browser → Supabase Storage only (not through Next.js).
 */

export type DirectUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export function uploadToSignedUrlWithProgress(options: {
  signedUrl: string;
  file: File;
  onProgress?: (p: DirectUploadProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const { signedUrl, file, onProgress, signal } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.responseType = "json";

    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", file);

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      const total = event.lengthComputable ? event.total : file.size;
      const loaded = event.loaded;
      const percent =
        total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
      onProgress({ loaded, total, percent });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
        resolve();
        return;
      }
      const message =
        (xhr.response &&
          typeof xhr.response === "object" &&
          "message" in xhr.response &&
          String((xhr.response as { message?: string }).message)) ||
        `Upload failed (${xhr.status})`;
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(form);
  });
}
