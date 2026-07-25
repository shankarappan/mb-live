import { NextResponse } from "next/server";

export const preferredRegion = "syd1";

/**
 * Public liveness probe — cheap and safe for load balancers / uptime checks.
 * Does not call Supabase or use the service-role key.
 * For dependency readiness, use /api/ready with READY_CHECK_TOKEN.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(url) && !url.includes("your-project"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(anon) && anon !== "your-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: Boolean(service) && service !== "your-service-role-key",
    NEXT_PUBLIC_APP_URL: Boolean(appUrl) && /^https?:\/\//.test(appUrl),
  };

  const ok = Object.values(env).every(Boolean);

  return NextResponse.json(
    {
      ok,
      service: "mb-live",
      check: "liveness",
      env,
      hints: ok
        ? []
        : ["Fill env vars from .env.example (see README Quick Start)."],
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
