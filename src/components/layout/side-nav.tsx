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

export function SideNav() {
  const pathname = usePathname();
  if (pathname.includes("/stand")) return null;

  return (
    <nav
      aria-label="Primary"
      className="hidden w-52 shrink-0 border-r border-border/80 bg-surface/40 lg:block"
    >
      <ul className="sticky top-16 flex flex-col gap-1 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-[color-mix(in_srgb,var(--violet)_16%,transparent)] text-violet"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
