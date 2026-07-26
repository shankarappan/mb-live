#!/usr/bin/env node
/**
 * Verify direct browser-style uploads at multiple sizes without committing media.
 *
 * Sizes: ~1 MB, 5 MB, 50 MB (current proven max), and a reject check just over max.
 * Uses service-role signed upload URLs + user-session metadata insert path
 * equivalent to prepare → PUT → finalize, then deletes the test objects.
 *
 * Requires: env from .env.local, PERF_TEST_EMAIL or SEED_ADMIN_EMAIL.
 *
 * Optional: SKIP_LARGE=1 to skip the 50 MB case.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.PERF_TEST_EMAIL || process.env.SEED_ADMIN_EMAIL;
const bucket = "song-files";
/** Must match src/lib/constants.ts MAX_FILE_BYTES (Free-plan proven ceiling). */
const maxBytes = 50 * 1024 * 1024;
const skipLarge = process.env.SKIP_LARGE === "1";

if (!url || !anon || !service || !email) {
  console.error("Missing Supabase env or PERF_TEST_EMAIL/SEED_ADMIN_EMAIL");
  process.exit(1);
}

const sizes = [
  { label: "1MB", bytes: 1 * 1024 * 1024, expect: "ok" },
  { label: "5MB", bytes: 5 * 1024 * 1024, expect: "ok" },
  { label: "50MB", bytes: 50 * 1024 * 1024, expect: "ok" },
  { label: "52MB-reject", bytes: 52 * 1024 * 1024, expect: "reject" },
].filter((s) => !skipLarge || s.bytes <= 5 * 1024 * 1024);

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
});
if (linkError) throw linkError;

const userClient = createClient(url, anon, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: sessionData, error: otpError } = await userClient.auth.verifyOtp({
  type: "email",
  token_hash: linkData.properties.hashed_token,
});
if (otpError || !sessionData.session) {
  throw new Error(otpError?.message || "Could not create test session");
}

const userId = sessionData.user.id;
const authed = createClient(url, anon, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: {
    headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
  },
});

let songId;
let createdTempSong = false;
const { data: songs, error: songError } = await authed
  .from("songs")
  .select("id,title")
  .limit(1);
if (songError) {
  console.error("Could not list songs", songError.message);
  process.exit(1);
}
if (songs?.[0]) {
  songId = songs[0].id;
} else {
  const { data: created, error: createError } = await admin
    .from("songs")
    .insert({
      title: "Upload verify temp song",
      body: "[C]temp",
      status: "active",
      created_by: userId,
    })
    .select("id")
    .maybeSingle();
  if (createError || !created) {
    console.error("Could not create temp song", createError?.message);
    process.exit(1);
  }
  songId = created.id;
  createdTempSong = true;
  console.log("Created temporary song for upload verify:", songId);
}

let failed = 0;

async function runOne({ label, bytes, expect }) {
  const filename = `perf-${label}.pdf`;
  const storagePath = `${songId}/${userId}/${Date.now()}-${filename}`;

  console.log(`\n=== ${label} (${bytes} bytes) expect=${expect}`);

  if (expect === "ok" && bytes > maxBytes) {
    console.error("Test size exceeds advertised max incorrectly");
    failed++;
    return;
  }

  const { data: signed, error: signError } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);
  if (signError || !signed) {
    console.error("prepare/sign failed", signError?.message);
    failed++;
    return;
  }

  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append(
    "",
    new Blob([Buffer.alloc(bytes)], { type: "application/octet-stream" }),
    filename
  );

  const putRes = await fetch(signed.signedUrl, { method: "PUT", body: form });

  if (expect === "reject") {
    if (putRes.ok) {
      console.error("Expected reject over max, but PUT succeeded");
      await admin.storage.from(bucket).remove([storagePath]);
      failed++;
    } else {
      console.log("reject ok", putRes.status);
    }
    return;
  }

  if (!putRes.ok) {
    console.error("direct PUT failed", putRes.status, await putRes.text());
    failed++;
    return;
  }
  console.log("direct PUT ok", putRes.status);

  const { data: inserted, error: insertError } = await authed
    .from("song_files")
    .insert({
      song_id: songId,
      file_type: "other",
      storage_path: storagePath,
      filename,
      mime_type: "application/octet-stream",
      size_bytes: bytes,
      target_instruments: null,
      uploaded_by: userId,
    })
    .select("id")
    .maybeSingle();

  if (insertError || !inserted) {
    console.error("finalize/metadata failed", insertError?.message);
    await admin.storage.from(bucket).remove([storagePath]);
    failed++;
    return;
  }
  console.log("metadata ok", inserted.id);

  await admin.storage.from(bucket).remove([storagePath]);
  await admin.from("song_files").delete().eq("id", inserted.id);
  console.log("cleaned up");
}

for (const size of sizes) {
  try {
    await runOne(size);
  } catch (e) {
    console.error(size.label, e);
    failed++;
  }
}

if (createdTempSong) {
  await admin.from("songs").delete().eq("id", songId);
  console.log("Removed temporary song", songId);
}

if (anon.includes("service_role") || anon.startsWith("sb_secret_")) {
  console.error("ANON key looks like a secret — abort");
  process.exit(1);
}

if (failed) {
  console.error(`\n${failed} upload size check(s) failed`);
  process.exit(1);
}
console.log("\nDirect upload size checks passed (temp media deleted).");
console.log(
  "Note: Supabase Free global Storage limit is 50 MB; 200 MB requires Pro+."
);
