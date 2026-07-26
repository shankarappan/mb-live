/**
 * Legacy helpers — prefer `@/lib/chart` for new code.
 */
import { parseChordProDocument } from "@/lib/chart/parse";

export type ChordLinePart =
  | { type: "text"; value: string }
  | { type: "chord"; value: string };

export type ChordLine = {
  parts: ChordLinePart[];
  hasChords: boolean;
};

/** @deprecated Use parseChordProDocument / buildChartView from @/lib/chart */
export function parseChordPro(body: string): ChordLine[] {
  const doc = parseChordProDocument(body);
  const lines: ChordLine[] = [];
  for (const block of doc.blocks) {
    if (block.type !== "section" && block.type !== "paragraph") continue;
    for (const line of block.lines) {
      lines.push({
        hasChords: line.hasChords,
        parts: line.segments.map((s) =>
          s.type === "chord"
            ? { type: "chord", value: s.chord.raw }
            : { type: "text", value: s.text }
        ),
      });
    }
  }
  return lines;
}

export function plainTextFromChordPro(body: string): string {
  return body.replace(/\[[^\]]+\]/g, "");
}
