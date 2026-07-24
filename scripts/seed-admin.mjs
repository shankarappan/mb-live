#!/usr/bin/env node
/**
 * Seed the first admin user (invite-only setup).
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=you@band.com SEED_ADMIN_NAME="MD" \
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/seed-admin.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
const name = process.env.SEED_ADMIN_NAME || "Admin";

if (!url || !key || !email) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SEED_ADMIN_EMAIL"
  );
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listed, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});
if (listError) {
  console.error(listError.message);
  process.exit(1);
}

const existing = listed.users.find((u) => u.email?.toLowerCase() === email);

let userId = existing?.id;
if (!userId) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      display_name: name,
      role: "admin",
      instruments: ["vocals"],
    },
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log("Created auth user", userId);
} else {
  console.log("Auth user already exists", userId);
}

const { error: upsertError } = await admin.from("profiles").upsert({
  id: userId,
  email,
  display_name: name,
  role: "admin",
  instruments: ["vocals"],
});

if (upsertError) {
  console.error(upsertError.message);
  process.exit(1);
}

console.log(`Admin ready: ${email}`);
console.log("Sign in via magic link on /login (disable public signups in Auth settings).");
