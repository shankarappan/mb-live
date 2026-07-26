"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Files,
  Home,
  ListMusic,
  Music2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/songs", label: "Songs", icon: Music2 },
  { href: "/sets", label: "Sets", icon: ListMusic },
  { href: "/files", label: "Files", icon: Files },
  { href: "/band", label: "Band", icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.includes("/stand")) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/90 bg-[color-mix(in_srgb,var(--page)_92%,transparent)] backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-[4.25rem] w-full max-w-lg items-stretch justify-around px-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "relative flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-[0.7rem] transition-colors",
                  active
                    ? "text-violet"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <span
                    className="absolute top-1 h-0.5 w-6 rounded-full bg-violet"
                    aria-hidden
                  />
                )}
                <Icon className="size-5" aria-hidden />
                <span className="font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
