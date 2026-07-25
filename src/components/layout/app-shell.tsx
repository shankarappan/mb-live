import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SideNav } from "@/components/layout/side-nav";
import type { Profile } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export function AppShell({
  profile,
  children,
  chromeless = false,
  wide = false,
}: {
  profile: Profile | null;
  children: React.ReactNode;
  chromeless?: boolean;
  /** Wider content lane for home split layout */
  wide?: boolean;
}) {
  if (chromeless) {
    return <div className="min-h-dvh w-full min-w-0 bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-col">
      <AppHeader profile={profile} />
      <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-1">
        <SideNav />
        <main
          className={cn(
            "w-full min-w-0 flex-1 px-4 py-5 pb-tabbar sm:px-5 lg:px-6 lg:pb-8",
            !wide && "max-w-3xl lg:max-w-none"
          )}
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
