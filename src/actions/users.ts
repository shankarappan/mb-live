"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, requireRole } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";
import { INSTRUMENTS } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

export type ActionState = {
  error?: string;
  success?: string;
};

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const instruments = formData
    .getAll("instruments")
    .map(String)
    .filter((i) => (INSTRUMENTS as readonly string[]).includes(i));

  if (!displayName) return { error: "Display name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, instruments })
    .eq("id", profile.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/profile");
  revalidatePath("/");
  return { success: "Profile saved." };
}

export async function inviteUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole(["admin"]);

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "member") as UserRole;
  const displayName = String(formData.get("display_name") ?? "").trim();
  const instruments = formData
    .getAll("instruments")
    .map(String)
    .filter((i) => (INSTRUMENTS as readonly string[]).includes(i));

  if (!email.includes("@")) return { error: "Enter a valid email." };
  if (!["admin", "leader", "member"].includes(role)) {
    return { error: "Invalid role." };
  }

  try {
    const admin = createAdminClient();
    const appUrl = getAppUrl();

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/auth/callback?redirect=/settings/profile`,
      data: {
        display_name: displayName || email.split("@")[0],
        role,
        instruments,
      },
    });

    if (error) return { error: error.message };

    if (data.user) {
      await admin
        .from("profiles")
        .update({
          role,
          instruments,
          display_name: displayName || email.split("@")[0],
        })
        .eq("id", data.user.id);
    }

    revalidatePath("/admin/users");
    return { success: `Invite sent to ${email}.` };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to invite user.",
    };
  }
}

export async function updateUserRole(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole(["admin"]);

  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  const instruments = formData
    .getAll("instruments")
    .map(String)
    .filter((i) => (INSTRUMENTS as readonly string[]).includes(i));

  if (!userId || !["admin", "leader", "member"].includes(role)) {
    return { error: "Invalid user or role." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, instruments })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { success: "User updated." };
}

export async function removeUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const adminProfile = await requireRole(["admin"]);
  const userId = String(formData.get("user_id") ?? "");

  if (!userId) return { error: "Missing user." };
  if (userId === adminProfile.id) {
    return { error: "You cannot remove yourself." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { error: error.message };
    revalidatePath("/admin/users");
    return { success: "User removed." };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to remove user.",
    };
  }
}
