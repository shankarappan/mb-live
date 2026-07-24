import Link from "next/link";
import { Settings } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import type { Profile } from "@/lib/types/database";

export function AppHeader({ profile }: { profile: Profile | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-xl tracking-tight text-foreground transition-colors group-hover:text-primary">
            MB Live
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            band library
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {profile?.role === "admin" && (
            <LinkButton variant="ghost" size="sm" href="/admin/users">Admin</LinkButton>
          )}
          <LinkButton variant="ghost" size="icon" aria-label="Profile settings" href="/settings/profile">
              <Settings className="size-4" />
            </LinkButton>
        </div>
      </div>
    </header>
  );
}
