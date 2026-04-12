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
}

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
  thumbnail_url: string | null;
  is_hidden: boolean;
  /** ファイル更新日時（Unixタイムスタンプ秒）。取得不可の場合は null */
  modified_at: number | null;
}
