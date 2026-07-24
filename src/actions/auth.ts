"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  success?: string;
};

export async function signInWithMagicLink(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const redirectTo = String(formData.get("redirect") ?? "/");

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?redirect=${encodeURIComponent(safeRedirect)}`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    return {
      error:
        error.message.includes("Signups not allowed") ||
        error.message.toLowerCase().includes("user not found")
          ? "This email is not invited. Ask an admin to add you."
          : error.message,
    };
  }

  return { success: "Check your email for a magic link." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
