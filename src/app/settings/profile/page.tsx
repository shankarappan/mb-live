import { AppShell } from "@/components/layout/app-shell";
import { ProfileForm } from "@/components/settings/profile-form";
import { requireProfile } from "@/lib/auth";

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Your name and instruments for file targeting.
          </p>
        </div>
        <ProfileForm profile={profile} />
      </div>
    </AppShell>
  );
}
