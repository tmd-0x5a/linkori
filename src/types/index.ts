/** チャンク: 開始パスから終了パスまでの区間 */
export interface Chunk {
  id: string;
  /** 任意の表示名。未設定の場合はインデックス番号で表示 */
  name?: string;
  startPath: string;
  endPath: string;
}

/** プレイリスト: 複数チャンクの集合 */
export interface Playlist {
  id: string;
  name: string;
  chunks: Chunk[];
  createdAt: number;
  updatedAt: number;
  /** お気に入り */
  isFavorite?: boolean;
  /** カスタムタグ */
  tags?: string[];
  /** 背表紙色（パレットキー）。ビューアーのアクセントに継承される */
  accent?: AccentKey;
}

/** タグ色パレット（Clay 命名を流用） */
export type AccentKey =
  | "blueberry" | "ocean" | "slushie" | "sky" | "turquoise"
  | "forest" | "matcha" | "mint"
  | "lemon" | "apricot" | "coral" | "pomegranate" | "rose"
  | "grape" | "ube" | "cocoa" | "charcoal";

/** タグ色の表示用定義（HSL 順に並ぶと選びやすい） */
export const ACCENT_PALETTE: Record<AccentKey, { label: string; hex: string; darkText: boolean }> = {
  // 青系
  blueberry:   { label: "ブルーベリー",   hex: "#01418d", darkText: false },
  ocean:       { label: "オーシャン",     hex: "#2f8fd1", darkText: false },
  slushie:     { label: "スラッシー",     hex: "#0089ad", darkText: false },
  sky:         { label: "スカイ",         hex: "#9fd8e8", darkText: true  },
  turquoise:   { label: "ターコイズ",     hex: "#4dc8d9", darkText: true  },
  // 緑系
  forest:      { label: "フォレスト",     hex: "#078a52", darkText: false },
  matcha:      { label: "マッチャ",       hex: "#84e7a5", darkText: true  },
  mint:        { label: "ミント",         hex: "#3bd3fd", darkText: true  },
  // 黄・オレンジ・赤系
  lemon:       { label: "レモン",         hex: "#fbbd41", darkText: true  },
  apricot:     { label: "アプリコット",   hex: "#f8cc65", darkText: true  },
  coral:       { label: "コーラル",       hex: "#f0673f", darkText: false },
  pomegranate: { label: "ポメグラネート", hex: "#fc7981", darkText: true  },
  rose:        { label: "ローズ",         hex: "#d94f7a", darkText: false },
  // 紫系
  grape:       { label: "グレープ",       hex: "#c1b0ff", darkText: true  },
  ube:         { label: "ウベ",           hex: "#43089f", darkText: false },
  // 無彩・中間
  cocoa:       { label: "ココア",         hex: "#6b4c32", darkText: false },
  charcoal:    { label: "チャコール",     hex: "#2a3440", darkText: false },
};

/** ビューア設定 */
export interface ViewerSettings {
  spreadMode: boolean;
  rightToLeft: boolean;
  pageTransition: boolean;
}

/** 選択した画像ファイルの情報 */
export interface ImageFileInfo {
  path: string;
  filename: string;
  format: "jpeg" | "png" | "gif" | "webp" | "bmp";
  size: number;
  width?: number;
  height?: number;
}

/** validate_chunk の戻り値 */
export interface ChunkValidationResult {
  is_valid: boolean;
  image_count: number;
  error_message: string | null;
  image_paths: string[];
}

/** ファイルエントリ（browse_directory / browse_zip の戻り値） */
export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_zip: boolean;
  is_image: boolean;
  /** PDF ファイルかどうか */
  is_pdf: boolean;
  thumbnail_url: string | null;
  is_hidden: boolean;
  /** ファイル更新日時（Unixタイムスタンプ秒）。取得不可の場合は null */
  modified_at: number | null;
}
