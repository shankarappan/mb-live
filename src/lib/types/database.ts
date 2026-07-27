export type UserRole = "admin" | "leader" | "member";
export type SongStatus = "active" | "archived";
export type ArrangementStatus = "active" | "archived";
export type ChartViewMode = "standard" | "lyrics" | "nashville" | "roman";
export type FileType =
  | "lyric_sheet"
  | "chord_chart"
  | "lead_sheet"
  | "mp3"
  | "stem"
  | "click"
  | "guide"
  | "other";
export type EventType = "rehearsal" | "gig" | "other";
export type SetlistStatus = "draft" | "final" | "archived";
export type SetlistItemType = "song" | "break" | "note" | "medley_marker";

export type Profile = {
  id: string;
  display_name: string;
  email: string;
  role: UserRole;
  instruments: string[];
  created_at: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string | null;
  /** @deprecated Prefer default arrangement concert key */
  default_key: string | null;
  alternate_keys: string[];
  tempo_bpm: number | null;
  time_signature: string;
  capo: number;
  duration_seconds: number | null;
  /** @deprecated Prefer arrangements.body */
  body: string;
  /** @deprecated Prefer arrangements.notes */
  arrangement_notes: string | null;
  tags: string[];
  status: SongStatus;
  default_arrangement_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Arrangement = {
  id: string;
  song_id: string;
  name: string;
  body: string;
  /** Concert (sounding) key — canonical */
  default_key: string | null;
  alternate_keys: string[];
  chart_source_key: string | null;
  capo: number;
  tempo_bpm: number | null;
  time_signature: string;
  notes: string | null;
  position: number;
  status: ArrangementStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ChartViewPrefs = {
  user_id: string;
  arrangement_id: string;
  view_mode: ChartViewMode;
  display_key: string | null;
  shape_view: boolean;
  capo_fret: number | null;
  updated_at: string;
};

export type SongFile = {
  id: string;
  song_id: string;
  arrangement_id: string | null;
  file_type: FileType;
  storage_path: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number;
  target_instruments: string[] | null;
  uploaded_by: string | null;
  created_at: string;
};

export type Setlist = {
  id: string;
  name: string;
  event_date: string | null;
  event_type: EventType;
  venue: string | null;
  notes: string | null;
  status: SetlistStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SetlistItem = {
  id: string;
  setlist_id: string;
  song_id: string | null;
  arrangement_id: string | null;
  item_type: SetlistItemType;
  position: number;
  override_key: string | null;
  override_tempo: number | null;
  override_capo: number | null;
  item_note: string | null;
  label: string | null;
  created_at: string;
  song?: Song | null;
  arrangement?: Arrangement | null;
};

export type SetlistItemWithSong = SetlistItem & {
  song: Song | null;
  arrangement?: Arrangement | null;
  /** Visible song files for stand PDF switch (optional hydrate) */
  files?: SongFile[];
};
