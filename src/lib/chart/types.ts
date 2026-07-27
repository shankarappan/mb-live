export type ChartViewMode = "standard" | "lyrics" | "nashville" | "roman";

export type PitchClass = number; // 0=C … 11=B

export type ParsedChord = {
  raw: string;
  root: PitchClass | null;
  quality: string;
  bass: PitchClass | null;
  /** true when raw is not a transposable chord (N.C., /, etc.) */
  literal: boolean;
};

export type ChartSegment =
  | { type: "lyric"; text: string }
  | {
      type: "chord";
      chord: ParsedChord;
      /** false = standalone/traditional line */
      bracketed?: boolean;
    };

export type ChartLine = {
  segments: ChartSegment[];
  hasChords: boolean;
  /** Serialization style for this line */
  style?: "chordpro" | "standalone" | "lyrics";
};

export type ChartBlock =
  | {
      type: "section";
      name: string;
      lines: ChartLine[];
      /** How the section label was authored */
      labelStyle?: "bracket" | "directive";
    }
  | { type: "comment"; text: string }
  | { type: "keyChange"; key: string; label?: string }
  | { type: "paragraph"; lines: ChartLine[] };

export type ChartDocument = {
  meta: {
    title?: string;
    key?: string;
    capo?: number;
    tempo?: number;
    time?: string;
  };
  blocks: ChartBlock[];
};

export type ViewChord = {
  display: string;
  raw: string;
};

export type ViewLine = {
  chords: Array<ViewChord | null>;
  lyrics: string;
  hasChords: boolean;
  /** For standard mode chord-above layout */
  slots: Array<{ chord: string | null; lyric: string }>;
};

export type ViewBlock =
  | { type: "section"; name: string; lines: ViewLine[] }
  | { type: "comment"; text: string }
  | { type: "keyChange"; key: string; label?: string }
  | { type: "paragraph"; lines: ViewLine[] };

export type ChartViewModel = {
  meta: ChartDocument["meta"];
  blocks: ViewBlock[];
  concertKey: string | null;
  shapeView: boolean;
  capoFret: number;
  mode: ChartViewMode;
};
