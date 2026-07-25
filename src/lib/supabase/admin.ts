import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role / secret-key client for admin invites and server-only ops.
 * Never expose to the browser.
 *
 * Supabase's newer `sb_secret_…` keys break some Auth Admin routes when sent as
 * `Authorization: Bearer …` (JWT parse error). For those keys we send `apikey`
 * only. Legacy JWT `service_role` keys keep the default header behavior.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const isNewSecretKey = key.startsWith("sb_secret_");

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: isNewSecretKey
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
}
