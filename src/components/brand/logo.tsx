import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
};

const sizes = {
  sm: { box: "size-9", px: 36 },
  md: { box: "size-11", px: 44 },
  lg: { box: "h-28 w-28 sm:h-36 sm:w-36", px: 144 },
} as const;

export function BrandLogo({ size = "sm", className, priority }: LogoProps) {
  const s = sizes[size];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-[22%]",
        s.box,
        className
      )}
    >
      <Image
        src="/brand/mb-live-logo.png"
        alt="MB Live"
        width={s.px}
        height={s.px}
        priority={priority}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
