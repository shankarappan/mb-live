import { cn } from "@/lib/utils";

export function StatusPill({
  tone = "muted",
  children,
  className,
}: {
  tone?: "muted" | "violet" | "cyan" | "success" | "coral";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        tone === "muted" && "border-border bg-secondary text-muted-foreground",
        tone === "violet" &&
          "border-[color-mix(in_srgb,var(--violet)_45%,transparent)] bg-[color-mix(in_srgb,var(--violet)_16%,transparent)] text-violet",
        tone === "cyan" &&
          "border-[color-mix(in_srgb,var(--cyan)_40%,transparent)] bg-[color-mix(in_srgb,var(--cyan)_12%,transparent)] text-cyan",
        tone === "success" &&
          "border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-success",
        tone === "coral" &&
          "border-[color-mix(in_srgb,var(--coral)_40%,transparent)] bg-[color-mix(in_srgb,var(--coral)_12%,transparent)] text-coral",
        className
      )}
    >
      {children}
    </span>
  );
}
