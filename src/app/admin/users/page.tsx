import { InviteForm } from "@/components/admin/invite-form";
import { UserRow } from "@/components/admin/user-row";
import { AppShell } from "@/components/layout/app-shell";
import { LinkButton } from "@/components/ui/link-button";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export default async function AdminUsersPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .limit(200)
    .order("created_at", { ascending: true });

  const users = (data as Profile[] | null) ?? [];

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">Users</h1>
            <p className="text-sm text-muted-foreground">
              Invite-only access. No public sign-up.
            </p>
          </div>
          <LinkButton variant="ghost" size="sm" href="/admin/storage">Storage</LinkButton>
        </div>
        <InviteForm />
        <ul className="space-y-3">
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
