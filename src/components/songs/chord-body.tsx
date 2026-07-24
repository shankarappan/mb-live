import { parseChordPro } from "@/lib/chordpro";
import { cn } from "@/lib/utils";

export function ChordBody({
  body,
  className,
  large = false,
}: {
  body: string;
  className?: string;
  large?: boolean;
}) {
  const lines = parseChordPro(body);

  if (!body.trim()) {
    return (
      <p className="text-muted-foreground italic">No lyrics or chords yet.</p>
    );
  }

  return (
    <div
      className={cn(
        "font-mono leading-relaxed whitespace-pre-wrap",
        large ? "text-lg sm:text-xl leading-8" : "text-sm sm:text-base",
        className
      )}
    >
      {lines.map((line, i) => (
        <div key={i} className="min-h-[1.4em]">
          {line.parts.map((part, j) =>
            part.type === "chord" ? (
              <span
                key={j}
                className="mx-0.5 inline-block rounded bg-primary/15 px-1 font-semibold text-primary"
              >
                {part.value}
              </span>
            ) : (
              <span key={j}>{part.value}</span>
            )
          )}
        </div>
      ))}
    </div>
  );
}
