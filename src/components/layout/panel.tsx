import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  elevated = false,
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag
      className={cn(
        elevated ? "panel-elevated" : "panel",
        "p-4 sm:p-5",
        className
      )}
    >
      {children}
    </Tag>
  );
}
