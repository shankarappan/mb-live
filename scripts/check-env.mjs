#!/usr/bin/env node
/**
 * Validate that required env vars are present and not placeholders.
 * Does not print secret values. Optional live ping with --live.
 *
 *   npm run check:env
 *   npm run check:env -- --live
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const placeholders = new Set([
  "",
  "your-anon-key",
  "your-service-role-key",
  "https://your-project.supabase.co",
]);

let failed = 0;

for (const key of required) {
  const value = (process.env[key] || "").trim();
  if (!value || placeholders.has(value) || value.includes("your-project")) {
    console.error(`MISSING/PLACEHOLDER  ${key}`);
    failed++;
  } else {
    console.log(`ok  ${key}`);
  }
}

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
if (url && !url.startsWith("https://")) {
  console.error("INVALID  NEXT_PUBLIC_SUPABASE_URL (expected https://…)");
  failed++;
}

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
if (appUrl && !/^https?:\/\//.test(appUrl)) {
  console.error("INVALID  NEXT_PUBLIC_APP_URL (expected http(s)://…)");
  failed++;
}

if (failed) {
  console.error(`\n${failed} env check(s) failed. Copy .env.example → .env.local and fill real values.`);
  console.error("See SETUP_CHECKLIST.md / README Quick Start.");
  process.exit(1);
}

console.log("\nEnv file checks passed.");

const live = process.argv.includes("--live");
if (!live) {
  console.log("Tip: run `npm run check:env -- --live` after applying 001_schema.sql to ping Supabase.");
  process.exit(0);
}

const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error: tableError } = await admin.from("profiles").select("id").limit(1);
if (tableError) {
  console.error("\nLIVE FAIL  Cannot query public.profiles:");
  console.error(" ", tableError.message);
  console.error("Did you run supabase/migrations/001_schema.sql in the SQL Editor?");
  process.exit(1);
}
console.log("ok  live query public.profiles");

const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
if (bucketError) {
  console.error("\nLIVE FAIL  Cannot list storage buckets:");
  console.error(" ", bucketError.message);
  process.exit(1);
}
const hasBucket = (buckets || []).some((b) => b.id === "song-files" || b.name === "song-files");
if (!hasBucket) {
  console.error("\nLIVE FAIL  Storage bucket `song-files` not found.");
  console.error("Re-run 001_schema.sql (it creates the private bucket).");
  process.exit(1);
}
console.log("ok  live storage bucket song-files");

console.log("\nLive Supabase checks passed.");
