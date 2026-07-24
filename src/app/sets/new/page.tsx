import { AppShell } from "@/components/layout/app-shell";
import { NewSetForm } from "@/components/sets/new-set-form";
import { requireRole } from "@/lib/auth";

export default async function NewSetPage() {
  const profile = await requireRole(["admin", "leader"]);

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl">New set list</h1>
          <p className="text-sm text-muted-foreground">
            Name it, set the date, then add songs.
          </p>
        </div>
        <NewSetForm />
      </div>
    </AppShell>
  );
}
