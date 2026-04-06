use std::path::Path;

use crate::reader::{directory, zip as zip_reader};
use crate::utils::paths::find_zip_boundary;

/// 画像パスを base64 data URL に変換して返す。
///
/// 対応パス形式:
/// - 通常ファイル:          `D:\manga\001.jpg`
/// - ZIP内エントリ(内部形式): `zip://D:/manga.zip///ch01/001.jpg`
/// - ZIP内エントリ(パス形式): `D:/manga.zip/ch01/001.jpg`
#[tauri::command]
pub async fn read_image_as_data_url(path: String) -> Result<String, String> {
    let normalized = path.replace('\\', "/");

    // パス形式に応じてバイト列とMIME判定用パスを取得
    let (bytes, mime_path) = if normalized.starts_with("zip://") {
        // validate_chunk が生成する zip:// 形式
        let rest = &normalized[6..];
        let sep = rest
            .find("///")
            .ok_or_else(|| "無効なZIPパス形式です".to_string())?;
        let zip_path = &rest[..sep];
        let entry = &rest[sep + 3..];
        let bytes = zip_reader::read_image_from_zip(Path::new(zip_path), entry)?;
        (bytes, entry.to_string())
    } else if let Some((zip_path, Some(entry))) = find_zip_boundary(&normalized) {
        // browse_zip が生成するパス形式: D:/manga.zip/ch01/001.jpg
        let bytes = zip_reader::read_image_from_zip(Path::new(&zip_path), &entry)?;
        (bytes, entry)
    } else {
        // 通常ファイル
        let bytes = directory::read_image_from_directory(Path::new(&normalized))?;
        (bytes, normalized.clone())
    };

    let mime = mime_guess::from_path(&mime_path)
        .first_or_octet_stream()
        .to_string();

    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}
