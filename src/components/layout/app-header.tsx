import Link from "next/link";
import { ChevronDown, Search, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { StatusPill } from "@/components/layout/status-pill";
import { LinkButton } from "@/components/ui/link-button";
import type { Profile } from "@/lib/types/database";

export function AppHeader({ profile }: { profile: Profile | null }) {
  const initials =
    profile?.display_name?.trim()?.slice(0, 1)?.toUpperCase() ||
    profile?.email?.slice(0, 1)?.toUpperCase() ||
    "?";

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-[color-mix(in_srgb,var(--page)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center gap-3 px-4 py-2.5 sm:gap-4">
        <Link
          href="/"
          className="touch-target shrink-0 rounded-lg focus-visible:outline-none"
          aria-label="MB Live home"
        >
          <BrandLogo size="sm" priority />
        </Link>

        <div className="hidden min-w-0 items-center gap-1.5 sm:flex">
          <span className="truncate font-display text-sm uppercase tracking-[0.14em] text-muted-foreground">
            MB Live Band
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        <form
          action="/songs"
          method="get"
          className="relative mx-auto hidden min-w-0 flex-1 max-w-md min-[700px]:block"
          role="search"
        >
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            name="q"
            type="search"
            placeholder="Search songs, sets, files…"
            className="h-11 w-full rounded-xl border border-border bg-secondary/80 pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-violet focus-visible:ring-2 focus-visible:ring-violet/40 focus-visible:outline-none"
            aria-label="Search songs"
          />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <StatusPill tone="success" className="hidden lg:inline-flex">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            Online
          </StatusPill>
          {profile?.role === "admin" && (
            <LinkButton
              variant="ghost"
              size="sm"
              href="/admin/users"
              className="hidden min-h-11 sm:inline-flex"
            >
              Admin
            </LinkButton>
          )}
          <Link
            href="/settings/profile"
            className="touch-target gap-1.5 rounded-full border border-border bg-secondary px-1.5 text-sm hover:border-violet/50"
            aria-label="Open profile settings"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--violet)_25%,transparent)] font-display text-sm text-violet">
              {profile ? initials : <UserRound className="size-4" />}
            </span>
            <ChevronDown className="mr-1 hidden size-3.5 text-muted-foreground sm:block" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
