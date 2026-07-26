import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "panel flex flex-col items-start gap-3 px-5 py-8",
        className
      )}
    >
      <h2 className="font-display text-xl text-foreground">{title}</h2>
      {description && (
        <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}
