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
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

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

/**
 * Supabase newer `sb_secret_…` keys break Auth Admin when sent as
 * `Authorization: Bearer <secret>` (JWT parse errors / intermittent 403s).
 * Always send secret keys as `apikey` only and force Connection: close to
 * avoid keep-alive oddities observed with GoTrue.
 */
function createSecretClient() {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (input, init = {}) => {
        const headers = new Headers(init.headers);
        headers.set("apikey", key);
        headers.delete("Authorization");
        headers.set("Connection", "close");
        return fetch(input, { ...init, headers });
      },
    },
  });
}

async function authAdminFetch(path, { method = "GET", body } = {}) {
  const headers = new Headers({
    apikey: key,
    Connection: "close",
  });
  if (body) headers.set("Content-Type", "application/json");

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${url}/auth/v1${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (res.ok) return data;

    const msg = data?.msg || data?.message || text || res.statusText;
    lastErr = new Error(`Auth Admin ${method} ${path} failed (${res.status}): ${msg}`);
    // Retry transient JWT/secret-key failures
    if (res.status === 403 && /jwt|kid|signature/i.test(msg) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 250 * attempt));
      continue;
    }
    throw lastErr;
  }
  throw lastErr;
}

const admin = createSecretClient();

let userId;
let existing = null;

// Prefer SDK admin API with stripped Authorization headers
{
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    console.warn("SDK listUsers failed, falling back to raw fetch:", error.message);
    try {
      const listed = await authAdminFetch("/admin/users?page=1&per_page=200");
      existing =
        (listed.users || []).find((u) => u.email?.toLowerCase() === email) || null;
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  } else {
    existing = (data.users || []).find((u) => u.email?.toLowerCase() === email) || null;
  }
}

if (!existing) {
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
    // Fallback raw create
    try {
      const created = await authAdminFetch("/admin/users", {
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
      console.error(error.message);
      console.error(e.message);
      process.exit(1);
    }
  } else {
    userId = data.user.id;
    console.log("Created auth user", userId);
  }
} else {
  userId = existing.id;
  console.log("Auth user already exists", userId);
  // Metadata update is best-effort; app roles live in public.profiles
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
    user_metadata: {
      ...(existing.user_metadata || {}),
      display_name: name,
      role: "admin",
    },
  });
  if (updateError) {
    console.warn("Warning: auth metadata update skipped (non-fatal):", updateError.message);
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

console.log(`Admin ready: ${email} (profiles.role=admin)`);

// Help when email OTP is rate-limited during local setup
try {
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${appUrl}/auth/callback` },
  });
  const actionLink = linkData?.properties?.action_link;
  if (linkError) {
    // raw fallback
    const link = await authAdminFetch("/admin/generate_link", {
      method: "POST",
      body: {
        type: "magiclink",
        email,
        options: { redirect_to: `${appUrl}/auth/callback` },
      },
    });
    if (link?.action_link) {
      console.log("\nOne-time magic link (use if email OTP is rate-limited):");
      console.log(link.action_link);
    }
  } else if (actionLink) {
    console.log("\nOne-time magic link (use if email OTP is rate-limited):");
    console.log(actionLink);
  }
} catch (e) {
  console.warn("Could not generate magic link:", e.message);
}

console.log("\nNext: npm run dev → open /login → request a magic link for this email");
console.log("(or paste the one-time link above). Ensure public sign-ups stay disabled.");
