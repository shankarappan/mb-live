import { parseChordToken } from "@/lib/chart/chords";
import type { ChartDocument, ChartLine, ChartSegment } from "@/lib/chart/types";

function parseLine(line: string): ChartLine {
  const segments: ChartSegment[] = [];
  const re = /\[([^\]]+)\]|([^\[]+)/g;
  let match: RegExpExecArray | null;
  let hasChords = false;

  while ((match = re.exec(line)) !== null) {
    if (match[1] !== undefined) {
      segments.push({ type: "chord", chord: parseChordToken(match[1]) });
      hasChords = true;
    } else if (match[2]) {
      segments.push({ type: "lyric", text: match[2] });
    }
  }

  if (segments.length === 0) {
    segments.push({ type: "lyric", text: "" });
  }

  return { segments, hasChords };
}

function parseDirective(line: string): { name: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  const inner = trimmed.slice(1, -1).trim();
  const colon = inner.indexOf(":");
  if (colon === -1) {
    return { name: inner.toLowerCase(), value: "" };
  }
  return {
    name: inner.slice(0, colon).trim().toLowerCase(),
    value: inner.slice(colon + 1).trim(),
  };
}

/**
 * Parse ChordPro-compatible text into a ChartDocument.
 * Unknown directives become comments. Concert-pitch chords expected in body.
 */
export function parseChordProDocument(source: string): ChartDocument {
  const doc: ChartDocument = { meta: {}, blocks: [] };
  if (!source.trim()) return doc;

  let currentSection: { name: string; lines: ChartLine[] } | null = null;
  let paragraph: ChartLine[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    doc.blocks.push({ type: "paragraph", lines: paragraph });
    paragraph = [];
  };

  const flushSection = () => {
    flushParagraph();
    if (currentSection) {
      doc.blocks.push({
        type: "section",
        name: currentSection.name,
        lines: currentSection.lines,
      });
      currentSection = null;
    }
  };

  const pushLine = (line: ChartLine) => {
    if (currentSection) currentSection.lines.push(line);
    else paragraph.push(line);
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const directive = parseDirective(rawLine);
    if (directive) {
      const { name, value } = directive;

      if (name === "title" || name === "t") {
        doc.meta.title = value;
        continue;
      }
      if (name === "key" || name === "k") {
        flushParagraph();
        if (doc.meta.key == null) {
          doc.meta.key = value;
        } else if (value && value !== doc.meta.key) {
          // Mid-song modulation marker; keep meta.key as the chart's opening key
          flushSection();
          doc.blocks.push({ type: "keyChange", key: value });
        }
        continue;
      }
      if (name === "capo") {
        const n = Number(value);
        if (Number.isFinite(n)) doc.meta.capo = n;
        continue;
      }
      if (name === "tempo" || name === "bpm") {
        const n = Number(value);
        if (Number.isFinite(n)) doc.meta.tempo = n;
        continue;
      }
      if (name === "time" || name === "time_signature") {
        doc.meta.time = value;
        continue;
      }
      if (name === "comment" || name === "c" || name === "comment_italic") {
        flushParagraph();
        doc.blocks.push({ type: "comment", text: value || rawLine });
        continue;
      }
      if (name.startsWith("start_of_") || name === "soc" || name === "sov" || name === "sob") {
        flushSection();
        const label =
          value ||
          (name === "soc"
            ? "Chorus"
            : name === "sov"
              ? "Verse"
              : name === "sob"
                ? "Bridge"
                : name.replace(/^start_of_/, "").replace(/_/g, " "));
        currentSection = { name: label, lines: [] };
        continue;
      }
      if (name.startsWith("end_of_") || name === "eoc" || name === "eov" || name === "eob") {
        flushSection();
        continue;
      }

      flushParagraph();
      doc.blocks.push({
        type: "comment",
        text: value ? `${name}: ${value}` : name,
      });
      continue;
    }

    pushLine(parseLine(rawLine));
  }

  flushSection();
  flushParagraph();
  return doc;
}

/** Rebuild ChordPro text from a document (best-effort; used after rewrite-to-key). */
export function serializeChordPro(doc: ChartDocument): string {
  const lines: string[] = [];
  if (doc.meta.title) lines.push(`{title: ${doc.meta.title}}`);
  if (doc.meta.key) lines.push(`{key: ${doc.meta.key}}`);
  if (doc.meta.tempo != null) lines.push(`{tempo: ${doc.meta.tempo}}`);
  if (doc.meta.time) lines.push(`{time: ${doc.meta.time}}`);
  if (doc.meta.capo != null && doc.meta.capo > 0) {
    lines.push(`{capo: ${doc.meta.capo}}`);
  }
  if (lines.length) lines.push("");

  for (const block of doc.blocks) {
    if (block.type === "comment") {
      lines.push(`{comment: ${block.text}}`);
      continue;
    }
    if (block.type === "keyChange") {
      lines.push(`{key: ${block.key}}`);
      continue;
    }
    if (block.type === "section") {
      lines.push(`{start_of_section: ${block.name}}`);
      for (const line of block.lines) lines.push(serializeLine(line));
      lines.push(`{end_of_section}`);
      lines.push("");
      continue;
    }
    for (const line of block.lines) lines.push(serializeLine(line));
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function serializeLine(line: ChartLine): string {
  return line.segments
    .map((s) => (s.type === "chord" ? `[${s.chord.raw}]` : s.text))
    .join("");
}

export function extractPlainLyrics(source: string): string {
  return source
    .split(/\r?\n/)
    .map((line) => {
      if (line.trim().startsWith("{") && line.trim().endsWith("}")) return "";
      return line.replace(/\[[^\]]+\]/g, "");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
