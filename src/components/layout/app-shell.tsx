import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import type { Profile } from "@/lib/types/database";

export function AppShell({
  profile,
  children,
  chromeless = false,
}: {
  profile: Profile | null;
  children: React.ReactNode;
  chromeless?: boolean;
}) {
  if (chromeless) {
    return <div className="min-h-dvh bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-tabbar">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
