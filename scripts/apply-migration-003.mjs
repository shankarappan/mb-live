#!/usr/bin/env node
/**
 * Helper for supabase/migrations/003_arrangements_and_charts.sql
 *
 * Service Role / PostgREST cannot run DDL. Apply in Supabase SQL Editor,
 * or set DATABASE_URL / SUPABASE_DB_URL and use `psql` locally.
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(
  __dirname,
  "../supabase/migrations/003_arrangements_and_charts.sql",
);

if (!existsSync(sqlPath)) {
  console.error("Missing migration file:", sqlPath);
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.log(`Migration 003 — apply manually

1. Open Supabase → SQL Editor
2. Paste and run: supabase/migrations/003_arrangements_and_charts.sql
3. Verify:
     select count(*) from public.arrangements;
     select id, default_arrangement_id from public.songs limit 5;

Optional: set DATABASE_URL (Postgres connection string) and re-run this script
to apply via psql.
`);
  process.exit(0);
}

const result = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
  stdio: "inherit",
});
if (result.error) {
  console.error(
    "psql not available. Run the SQL file in Supabase SQL Editor instead.",
  );
  process.exit(1);
}
process.exit(result.status ?? 1);
