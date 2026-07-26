import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusPill } from "@/components/layout/status-pill";
import { LinkButton } from "@/components/ui/link-button";
import { requireProfile } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export default async function BandPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("display_name", { ascending: true })
    .limit(200);

  const members = (data as Profile[] | null) ?? [];

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-wide">Band</h1>
            <p className="text-sm text-muted-foreground">
              Members with access to MB Live.
            </p>
          </div>
          <LinkButton href="/settings/profile" size="sm" variant="secondary">
            Your profile
          </LinkButton>
        </div>

        {members.length === 0 ? (
          <EmptyState
            title="No members found"
            description="Ask an admin to invite the band."
          />
        ) : (
          <ul className="panel divide-y divide-border/70 overflow-hidden">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex min-h-14 items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {member.display_name || member.email}
                    {member.id === profile.id ? " (you)" : ""}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {member.instruments?.length
                      ? member.instruments.join(", ")
                      : "No instruments set"}
                  </p>
                </div>
                <StatusPill
                  tone={
                    member.role === "admin"
                      ? "violet"
                      : member.role === "leader"
                        ? "cyan"
                        : "muted"
                  }
                >
                  {ROLE_LABELS[member.role]}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}

        {profile.role === "admin" && (
          <p className="text-sm text-muted-foreground">
            Manage invites in{" "}
            <Link href="/admin/users" className="text-cyan hover:underline">
              Admin → Users
            </Link>
            .
          </p>
        )}
      </div>
    </AppShell>
  );
}
