/**
 * Canonical public origin for auth redirects (magic link + invites).
 * Must match a URL allowlisted in Supabase Auth settings.
 */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  // Vercel provides VERCEL_URL without protocol (e.g. mb-live.vercel.app)
  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is required in production (set it to your Vercel URL, no trailing slash)."
    );
  }

  return "http://localhost:3000";
}
