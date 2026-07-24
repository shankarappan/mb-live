export type ChordLinePart =
  | { type: "text"; value: string }
  | { type: "chord"; value: string };

export type ChordLine = {
  parts: ChordLinePart[];
  hasChords: boolean;
};

/** Parse ChordPro-ish `[G]Amazing [C]grace` lines into structured parts. */
export function parseChordPro(body: string): ChordLine[] {
  if (!body.trim()) return [];

  return body.split(/\r?\n/).map((line) => {
    const parts: ChordLinePart[] = [];
    const re = /\[([^\]]+)\]|([^\[]+)/g;
    let match: RegExpExecArray | null;
    let hasChords = false;

    while ((match = re.exec(line)) !== null) {
      if (match[1] !== undefined) {
        parts.push({ type: "chord", value: match[1] });
        hasChords = true;
      } else if (match[2]) {
        parts.push({ type: "text", value: match[2] });
      }
    }

    if (parts.length === 0) {
      parts.push({ type: "text", value: "" });
    }

    return { parts, hasChords };
  });
}

export function plainTextFromChordPro(body: string): string {
  return body.replace(/\[[^\]]+\]/g, "");
}
