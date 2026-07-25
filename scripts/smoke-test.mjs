#!/usr/bin/env node
/**
 * Lightweight smoke checks (no browser).
 * Verifies critical modules load and schema file exists.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "SPEC.md",
  "SETUP_CHECKLIST.md",
  "README.md",
  ".env.example",
  "supabase/migrations/001_schema.sql",
  "supabase/migrations/002_perf_storage_indexes.sql",
  "src/proxy.ts",
  "src/app/api/health/route.ts",
  "src/app/api/ready/route.ts",
  "src/app/sets/[id]/stand/page.tsx",
  "src/app/files/page.tsx",
  "src/app/band/page.tsx",
  "public/brand/mb-live-logo.png",
  "public/brand/stage-hero.png",
  "design-qa.md",
  "src/actions/setlists.ts",
  "src/actions/songs.ts",
  "src/actions/files.ts",
  "src/lib/direct-upload.ts",
  "scripts/seed-admin.mjs",
  "scripts/check-env.mjs",
  "scripts/perf-concurrency.mjs",
  "scripts/verify-direct-upload.mjs",
  "vercel.json",
];

let failed = 0;
for (const rel of required) {
  const path = resolve(root, rel);
  if (!existsSync(path)) {
    console.error("MISSING", rel);
    failed++;
  } else {
    console.log("ok", rel);
  }
}

const schema = readFileSync(resolve(root, "supabase/migrations/001_schema.sql"), "utf8");
for (const needle of [
  "create table if not exists public.songs",
  "create table if not exists public.setlist_items",
  "song_files_select_targeted",
  "song-files",
]) {
  if (!schema.includes(needle)) {
    console.error("SCHEMA missing", needle);
    failed++;
  } else {
    console.log("schema ok", needle);
  }
}

const schema2 = readFileSync(
  resolve(root, "supabase/migrations/002_perf_storage_indexes.sql"),
  "utf8"
);
for (const needle of [
  "songs_status_updated_at_idx",
  "song_files_storage_path_uidx",
  "song_files_storage_select",
]) {
  if (!schema2.includes(needle)) {
    console.error("SCHEMA2 missing", needle);
    failed++;
  } else {
    console.log("schema2 ok", needle);
  }
}

const vercel = readFileSync(resolve(root, "vercel.json"), "utf8");
if (!vercel.includes('"syd1"')) {
  console.error("vercel.json missing syd1 region pin");
  failed++;
} else {
  console.log("ok vercel regions syd1");
}

if (failed) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nSmoke checks passed");
