import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Setup / deploy health check.
 * Reports whether env vars are configured and whether the DB schema is reachable.
 * Never returns secret values.
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

  const envOk = Object.values(env).every(Boolean);
  let database: "ok" | "error" | "skipped" = "skipped";
  let databaseError: string | undefined;

  // Prefer service role so RLS does not block the unauthenticated health probe.
  const keyForProbe = env.SUPABASE_SERVICE_ROLE_KEY
    ? service
    : env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? anon
      : "";

  if (env.NEXT_PUBLIC_SUPABASE_URL && keyForProbe) {
    try {
      const supabase = createClient(url, keyForProbe, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await supabase.from("profiles").select("id").limit(1);
      if (!error) {
        database = "ok";
      } else if (
        // Anon + RLS: table exists but select denied → schema is present
        /permission|row-level security|not authorized|42501|PGRST301/i.test(
          error.message
        )
      ) {
        database = "ok";
      } else {
        database = "error";
        databaseError = error.message;
      }
    } catch (e) {
      database = "error";
      databaseError = e instanceof Error ? e.message : "Unknown error";
    }
  }

  const ok = envOk && database !== "error";
  return NextResponse.json(
    {
      ok,
      service: "mb-live",
      env,
      database,
      ...(databaseError ? { databaseError } : {}),
      hints: ok
        ? []
        : [
            !envOk ? "Fill .env.local from .env.example (see README Quick Start)." : null,
            database === "error"
              ? "Run supabase/migrations/001_schema.sql in the Supabase SQL Editor."
              : null,
          ].filter(Boolean),
    },
    { status: ok ? 200 : 503 }
  );
}
