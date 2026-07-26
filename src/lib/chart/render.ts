import { chordToNashville, chordToRoman } from "@/lib/chart/chords";
import type {
  ChartBlock,
  ChartDocument,
  ChartLine,
  ChartViewMode,
  ChartViewModel,
  ViewBlock,
  ViewLine,
} from "@/lib/chart/types";

function lineToView(
  line: ChartLine,
  mode: ChartViewMode,
  concertKey: string | null
): ViewLine {
  if (mode === "lyrics") {
    const lyrics = line.segments
      .filter((s) => s.type === "lyric")
      .map((s) => (s.type === "lyric" ? s.text : ""))
      .join("");
    return { chords: [], lyrics, hasChords: false, slots: [{ chord: null, lyric: lyrics }] };
  }

  const slots: ViewLine["slots"] = [];
  const chords: ViewLine["chords"] = [];
  let lyrics = "";

  for (const seg of line.segments) {
    if (seg.type === "chord") {
      let display = seg.chord.raw;
      if (mode === "nashville") display = chordToNashville(seg.chord, concertKey);
      if (mode === "roman") display = chordToRoman(seg.chord, concertKey);
      chords.push({ display, raw: seg.chord.raw });
      slots.push({ chord: display, lyric: "" });
    } else {
      lyrics += seg.text;
      if (slots.length === 0) slots.push({ chord: null, lyric: seg.text });
      else {
        const last = slots[slots.length - 1]!;
        last.lyric += seg.text;
      }
    }
  }

  if (slots.length === 0) slots.push({ chord: null, lyric: "" });

  return {
    chords,
    lyrics,
    hasChords: line.hasChords,
    slots,
  };
}

function blockToView(
  block: ChartBlock,
  mode: ChartViewMode,
  concertKey: string | null
): ViewBlock {
  if (block.type === "comment") return block;
  if (block.type === "keyChange") return block;
  if (block.type === "section") {
    return {
      type: "section",
      name: block.name,
      lines: block.lines.map((l) => lineToView(l, mode, concertKey)),
    };
  }
  return {
    type: "paragraph",
    lines: block.lines.map((l) => lineToView(l, mode, concertKey)),
  };
}

export function toViewModel(
  doc: ChartDocument,
  options: {
    mode: ChartViewMode;
    concertKey: string | null;
    shapeView: boolean;
    capoFret: number;
  }
): ChartViewModel {
  return {
    meta: doc.meta,
    blocks: doc.blocks.map((b) =>
      blockToView(b, options.mode, options.concertKey)
    ),
    concertKey: options.concertKey,
    shapeView: options.shapeView,
    capoFret: options.capoFret,
    mode: options.mode,
  };
}
