use std::io::Cursor;
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

/// 縮小サムネイルを返す（シークバーホバー用）。
/// max_size の長辺に収まるよう縮小して返す。
/// すでに小さい画像はリサイズせずにそのまま返す（高速化）。
/// 速度優先のため品質は低め。
#[tauri::command]
pub async fn read_image_thumbnail(path: String, max_size: u32) -> Result<String, String> {
    let normalized = path.replace('\\', "/");

    let (bytes, mime_path) = if normalized.starts_with("zip://") {
        let rest = &normalized[6..];
        let sep = rest
            .find("///")
            .ok_or_else(|| "無効なZIPパス形式です".to_string())?;
        let zip_path = &rest[..sep];
        let entry = &rest[sep + 3..];
        let bytes = zip_reader::read_image_from_zip(Path::new(zip_path), entry)?;
        (bytes, entry.to_string())
    } else if let Some((zip_path, Some(entry))) = find_zip_boundary(&normalized) {
        let bytes = zip_reader::read_image_from_zip(Path::new(&zip_path), &entry)?;
        (bytes, entry)
    } else {
        let bytes = directory::read_image_from_directory(Path::new(&normalized))?;
        (bytes, normalized.clone())
    };

    // imagesize でサイズを先にチェック（デコード不要）
    let threshold = max_size * 3;
    if let Ok(size) = imagesize::blob_size(&bytes) {
        let max_dim = size.width.max(size.height) as u32;
        if max_dim <= threshold {
            // すでに十分小さい → リサイズ不要、そのまま返す
            let mime = mime_guess::from_path(&mime_path)
                .first_or_octet_stream()
                .to_string();
            use base64::Engine;
            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
            return Ok(format!("data:{};base64,{}", mime, b64));
        }
    }

    // 大きい画像 → デコード & リサイズ
    let img = image::load_from_memory(&bytes)
        .map_err(|e| format!("画像デコードエラー: {e}"))?;

    let (w, h) = (img.width(), img.height());
    let scale = (max_size as f32 / w.max(h) as f32).min(1.0);
    let nw = ((w as f32 * scale).round() as u32).max(1);
    let nh = ((h as f32 * scale).round() as u32).max(1);
    let thumb = img.resize_exact(nw, nh, image::imageops::FilterType::Nearest);

    // JPEG として超低品質エンコード（速度優先）
    let mut out: Vec<u8> = Vec::new();
    {
        use image::codecs::jpeg::JpegEncoder;
        let mut enc = JpegEncoder::new_with_quality(Cursor::new(&mut out), 25);
        enc.encode_image(&thumb)
            .map_err(|e| format!("サムネイル生成エラー: {e}"))?;
    }

    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&out);
    Ok(format!("data:image/jpeg;base64,{}", b64))
}
