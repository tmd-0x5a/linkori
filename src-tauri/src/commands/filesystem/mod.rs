use serde::{Deserialize, Serialize};

mod helpers;
mod directory;
mod archive;
mod meta;

// 各サブモジュールから Tauri コマンドを再エクスポート
// lib.rs の `use commands::filesystem::{...}` パスを変えずに済む
pub use directory::{browse_directory, list_drives};
pub use archive::browse_zip;
pub use meta::{get_path_meta, list_split_candidates, read_file_as_base64};

/// ファイルブラウザのエントリ
#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_zip: bool,
    pub is_image: bool,
    /// PDF ファイルかどうか
    pub is_pdf: bool,
    /// manga:// URL (is_image = true のときのみ Some)
    pub thumbnail_url: Option<String>,
    /// Windows: FILE_ATTRIBUTE_HIDDEN, Unix: ドット始まり
    pub is_hidden: bool,
    /// 更新日時（Unix タイムスタンプ秒）。取得不可なら None
    pub modified_at: Option<u64>,
}

/// パスのファイルシステムメタデータ
#[derive(Debug, Serialize)]
pub struct PathMeta {
    /// 更新日時（Unix タイムスタンプ秒）
    pub modified_at: Option<u64>,
    /// 作成日時（Unix タイムスタンプ秒）。Linux など未対応環境では None
    pub created_at: Option<u64>,
}

/// チャンク分割候補（サブフォルダ）
#[derive(Debug, Serialize)]
pub struct SplitCandidate {
    pub name: String,
    pub path: String,
}
