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

/** Auth Admin calls with sb_secret_ keys must use apikey header only (no Bearer). */
async function authAdmin(path, { method = "GET", body } = {}) {
  const res = await fetch(`${url}/auth/v1${path}`, {
    method,
    headers: {
      apikey: key,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = data?.msg || data?.message || text || res.statusText;
    throw new Error(`Auth Admin ${method} ${path} failed (${res.status}): ${msg}`);
  }
  return data;
}

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: key.startsWith("sb_secret_")
    ? {
        fetch: (input, init = {}) => {
          const headers = new Headers(init.headers);
          headers.set("apikey", key);
          headers.delete("Authorization");
          return fetch(input, { ...init, headers });
        },
      }
    : undefined,
});

let listed;
try {
  listed = await authAdmin("/admin/users?page=1&per_page=200");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const users = listed.users || [];
const existing = users.find((u) => u.email?.toLowerCase() === email);

let userId = existing?.id;
if (!userId) {
  try {
    const created = await authAdmin("/admin/users", {
      method: "POST",
      body: {
        email,
        email_confirm: true,
        user_metadata: {
          display_name: name,
          role: "admin",
          instruments: ["vocals"],
        },
      },
    });
    userId = created.id;
    console.log("Created auth user", userId);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
} else {
  console.log("Auth user already exists", userId);
  try {
    await authAdmin(`/admin/users/${userId}`, {
      method: "PUT",
      body: {
        email_confirm: true,
        user_metadata: {
          ...(existing.user_metadata || {}),
          display_name: name,
          role: "admin",
        },
      },
    });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

const { data: existingProfile } = await db
  .from("profiles")
  .select("instruments")
  .eq("id", userId)
  .maybeSingle();

const instruments =
  Array.isArray(existingProfile?.instruments) && existingProfile.instruments.length > 0
    ? existingProfile.instruments
    : ["vocals"];

const { error: profileError } = await db.from("profiles").upsert({
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
