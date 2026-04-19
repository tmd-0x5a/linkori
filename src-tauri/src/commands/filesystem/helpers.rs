use std::path::Path;

/// ZIP ライクな拡張子（.zip / .cbz）かどうか
pub(super) fn is_zip_like(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| matches!(ext.to_lowercase().as_str(), "zip" | "cbz"))
        .unwrap_or(false)
}

/// エントリがディレクトリかどうかを判定（ジャンクションポイント・シンボリックリンクも追跡）
pub(super) fn detect_is_dir(entry: &std::fs::DirEntry, entry_path: &Path) -> bool {
    // file_type() はシンボリックリンクを追跡しないが高速
    // is_dir() はリンクを追跡して真のディレクトリかを返す
    entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) || entry_path.is_dir()
}

/// Windows 隠しファイル属性の検出
#[cfg(target_os = "windows")]
pub(super) fn detect_is_hidden(entry_path: &Path, name: &str) -> bool {
    use std::os::windows::fs::MetadataExt;
    const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
    // メタデータ取得に失敗した場合はドット始まりで判定
    entry_path
        .metadata()
        .map(|m| m.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0)
        .unwrap_or_else(|_| name.starts_with('.'))
}

#[cfg(not(target_os = "windows"))]
pub(super) fn detect_is_hidden(_entry_path: &Path, name: &str) -> bool {
    name.starts_with('.')
}
