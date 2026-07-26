import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const preferredRegion = "syd1";

const READY_TIMEOUT_MS = 2500;

/**
 * Protected readiness probe — verifies Supabase DB reachability with a timeout.
 * Requires Authorization: Bearer <READY_CHECK_TOKEN>.
 * Never returns secret values or raw internal stack traces.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.READY_CHECK_TOKEN?.trim() || "";
  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        service: "mb-live",
        check: "readiness",
        error: "not_configured",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== expected) {
    return NextResponse.json(
      { ok: false, service: "mb-live", check: "readiness", error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  const keyForProbe = service || anon;

  if (!url || !keyForProbe) {
    return NextResponse.json(
      {
        ok: false,
        service: "mb-live",
        check: "readiness",
        database: "error",
        dependency: "supabase_env",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), READY_TIMEOUT_MS);

  try {
    const supabase = createClient(url, keyForProbe, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init = {}) =>
          fetch(input, { ...init, signal: controller.signal }),
      },
    });

    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (!error) {
      return NextResponse.json(
        {
          ok: true,
          service: "mb-live",
          check: "readiness",
          database: "ok",
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (
      /permission|row-level security|not authorized|42501|PGRST301/i.test(
        error.message
      )
    ) {
      // Schema reachable; RLS denied anon — still ready.
      return NextResponse.json(
        {
          ok: true,
          service: "mb-live",
          check: "readiness",
          database: "ok",
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        service: "mb-live",
        check: "readiness",
        database: "error",
        dependency: "supabase_database",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const aborted =
      (e instanceof Error && e.name === "AbortError") || controller.signal.aborted;
    return NextResponse.json(
      {
        ok: false,
        service: "mb-live",
        check: "readiness",
        database: "error",
        dependency: aborted ? "supabase_timeout" : "supabase_unreachable",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    clearTimeout(timer);
  }
}
