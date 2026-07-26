#!/usr/bin/env node
/**
 * Authenticated concurrency smoke for ~20 simultaneous band members.
 *
 * Requires .env.local (or env) with Supabase keys + PERF_TEST_EMAIL (invited user).
 * Optional: BASE_URL (default https://mb-live.vercel.app), CONCURRENCY (default 20).
 *
 * Flow per worker (mixed read + light write probe):
 *  1. Home /
 *  2. /songs
 *  3. a set list page
 *  4. stand mode for that set
 *  5. POST-style read of /api/setlists/:id/updated-at (authenticated cookie)
 *
 * Reports error rate, p50/p95, and separates first-wave (cold-ish) vs warm.
 *
 * Does not print tokens. Does not weaken role checks.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();

const BASE_URL = (process.env.BASE_URL || "https://mb-live.vercel.app").replace(
  /\/$/,
  ""
);
const CONCURRENCY = Number(process.env.CONCURRENCY || 20);
const email = process.env.PERF_TEST_EMAIL || process.env.SEED_ADMIN_EMAIL;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !url || !anon || !service) {
  console.error(
    "Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and PERF_TEST_EMAIL (or SEED_ADMIN_EMAIL)."
  );
  process.exit(1);
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function projectRefFromUrl(supabaseUrl) {
  try {
    const host = new URL(supabaseUrl).hostname;
    return host.split(".")[0];
  } catch {
    return null;
  }
}

async function createSessionCookie() {
  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    throw new Error(linkError?.message || "generateLink failed");
  }

  const userClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await userClient.auth.verifyOtp({
    type: "email",
    token_hash: linkData.properties.hashed_token,
  });
  if (error || !data.session) {
    throw new Error(error?.message || "verifyOtp failed");
  }

  const ref = projectRefFromUrl(url);
  if (!ref) throw new Error("Could not parse project ref from Supabase URL");

  const sessionJson = JSON.stringify(data.session);
  const cookieName = `sb-${ref}-auth-token`;
  return {
    cookieHeader: `${cookieName}=${encodeURIComponent(sessionJson)}`,
    accessToken: data.session.access_token,
    userId: data.session.user.id,
  };
}

async function pickSetId(accessToken) {
  const res = await fetch(`${url}/rest/v1/setlists?select=id&limit=1&order=updated_at.desc`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.id ?? null;
}

async function timedFetch(path, cookieHeader) {
  const started = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Cookie: cookieHeader,
        Accept: "text/html,application/json",
      },
      redirect: "manual",
    });
    const ms = performance.now() - started;
    const ok = res.status >= 200 && res.status < 400;
    return { path, status: res.status, ms, ok, region: res.headers.get("x-vercel-id") };
  } catch (e) {
    return {
      path,
      status: 0,
      ms: performance.now() - started,
      ok: false,
      error: e instanceof Error ? e.message : "fetch failed",
    };
  }
}

async function worker(id, cookieHeader, setId) {
  const paths = ["/", "/songs", setId ? `/sets/${setId}` : "/sets"];
  if (setId) paths.push(`/sets/${setId}/stand`);
  if (setId) paths.push(`/api/setlists/${setId}/updated-at`);

  const results = [];
  for (const path of paths) {
    results.push(await timedFetch(path, cookieHeader));
  }
  return { id, results };
}

function summarize(label, samples) {
  const times = samples.map((s) => s.ms).sort((a, b) => a - b);
  const errors = samples.filter((s) => !s.ok).length;
  return {
    label,
    n: samples.length,
    errors,
    errorRate: samples.length ? errors / samples.length : 0,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    max: times[times.length - 1] ?? null,
  };
}

const { cookieHeader, accessToken } = await createSessionCookie();
const setId = await pickSetId(accessToken);
if (!setId) {
  console.warn("No set list found — stand/set detail paths will fall back to /sets.");
}

console.log(
  JSON.stringify(
    {
      baseUrl: BASE_URL,
      concurrency: CONCURRENCY,
      email,
      setId,
    },
    null,
    2
  )
);

// Cold-ish wave
const coldStarted = performance.now();
const coldWorkers = await Promise.all(
  Array.from({ length: CONCURRENCY }, (_, i) => worker(i, cookieHeader, setId))
);
const coldMs = performance.now() - coldStarted;

// Warm wave
const warmStarted = performance.now();
const warmWorkers = await Promise.all(
  Array.from({ length: CONCURRENCY }, (_, i) =>
    worker(i + CONCURRENCY, cookieHeader, setId)
  )
);
const warmMs = performance.now() - warmStarted;

const coldSamples = coldWorkers.flatMap((w) => w.results);
const warmSamples = warmWorkers.flatMap((w) => w.results);

const report = {
  cold: { ...summarize("cold", coldSamples), wallMs: coldMs },
  warm: { ...summarize("warm", warmSamples), wallMs: warmMs },
  sampleRegions: [...new Set(warmSamples.map((s) => s.region).filter(Boolean))].slice(
    0,
    5
  ),
  failures: [...coldSamples, ...warmSamples]
    .filter((s) => !s.ok)
    .slice(0, 10)
    .map((s) => ({ path: s.path, status: s.status, error: s.error })),
};

console.log(JSON.stringify(report, null, 2));

const warmErrorRate = report.warm.errorRate;
if (warmErrorRate > 0) {
  console.error(`Warm error rate ${(warmErrorRate * 100).toFixed(1)}% — failing`);
  process.exit(1);
}
console.log("Authenticated concurrency check passed (warm error rate 0%).");
