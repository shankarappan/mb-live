#!/usr/bin/env node
/**
 * Seed the first admin user (invite-only setup).
 *
 * Loads .env.local / .env automatically.
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=you@band.com SEED_ADMIN_NAME="MD" npm run seed:admin
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
const name = (process.env.SEED_ADMIN_NAME || "Admin").trim() || "Admin";

if (!url || !key || !email) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (in .env.local), and SEED_ADMIN_EMAIL"
  );
  console.error(
    'Example: SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_NAME="Your Name" npm run seed:admin'
  );
  process.exit(1);
}

if (url.includes("your-project") || key === "your-service-role-key") {
  console.error("Refusing to run with placeholder Supabase credentials. Fill .env.local first.");
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
  const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
    user_metadata: {
      ...(existing.user_metadata || {}),
      display_name: name,
      role: "admin",
    },
  });
  if (metaError) {
    console.error(metaError.message);
    process.exit(1);
  }
}

const { data: existingProfile } = await admin
  .from("profiles")
  .select("instruments")
  .eq("id", userId)
  .maybeSingle();

const instruments =
  Array.isArray(existingProfile?.instruments) && existingProfile.instruments.length > 0
    ? existingProfile.instruments
    : ["vocals"];

const { error: profileError } = await admin.from("profiles").upsert({
  id: userId,
  email,
  display_name: name,
  role: "admin",
  instruments,
});

if (profileError) {
  console.error(profileError.message);
  console.error("Did you run supabase/migrations/001_schema.sql?");
  process.exit(1);
}

console.log(`Admin ready: ${email}`);
console.log("Next: npm run dev → open /login → request a magic link for this email.");
console.log("Ensure public sign-ups are disabled in Supabase Auth settings.");
