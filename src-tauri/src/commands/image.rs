use std::io::Cursor;
use std::path::Path;

use serde::Serialize;

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

// ---------------------------------------------------------------------------
// 画像ファイル検証
// ---------------------------------------------------------------------------

/// フロントエンドに返す画像ファイル情報
#[derive(Debug, Serialize)]
pub struct ImageFileInfo {
    /// ファイルの絶対パス
    pub path: String,
    /// ファイル名のみ（拡張子含む）
    pub filename: String,
    /// 画像フォーマット識別子
    pub format: String,
    /// ファイルサイズ（バイト）
    pub size: u64,
    /// 画像の幅（ピクセル）— 取得できない場合は None
    pub width: Option<u32>,
    /// 画像の高さ（ピクセル）— 取得できない場合は None
    pub height: Option<u32>,
}

/// 拡張子からフォーマット識別子を返す。
/// 非対応の場合は None。
fn detect_format(path: &Path) -> Option<&'static str> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "jpg" | "jpeg" => Some("jpeg"),
        "png"          => Some("png"),
        "gif"          => Some("gif"),
        "webp"         => Some("webp"),
        "bmp"          => Some("bmp"),
        _              => None,
    }
}

/// 画像ファイルの存在・形式・サイズ・寸法を検証し、情報を返す。
///
/// エラー時は日本語メッセージの文字列を返す。
#[tauri::command]
pub async fn validate_image_file(path: String) -> Result<ImageFileInfo, String> {
    let file_path = Path::new(&path);

    // ── 存在確認 ──────────────────────────────────────────────
    if !file_path.exists() {
        return Err("ファイルが見つかりません".to_string());
    }
    if !file_path.is_file() {
        return Err("指定したパスはファイルではありません".to_string());
    }

    // ── フォーマット判定 ───────────────────────────────────────
    let format = detect_format(file_path)
        .ok_or_else(|| "サポートされていない画像形式です（JPEG / PNG / GIF / WebP / BMP のみ対応）".to_string())?;

    // ── ファイル名取得 ─────────────────────────────────────────
    let filename = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    // ── ファイルサイズ取得 ─────────────────────────────────────
    let size = file_path
        .metadata()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::PermissionDenied {
                "ファイルへのアクセス権限がありません".to_string()
            } else {
                format!("ファイルの読み込みに失敗しました: {}", e)
            }
        })?
        .len();

    // ── 画像寸法取得（ヘッダーのみ読み込み・軽量） ──────────────
    let (width, height) = match imagesize::size(&path) {
        Ok(dim) => (Some(dim.width as u32), Some(dim.height as u32)),
        // 取得できなくてもエラーにしない（オプション項目）
        Err(_) => (None, None),
    };

    Ok(ImageFileInfo {
        path,
        filename,
        format: format.to_string(),
        size,
        width,
        height,
    })
}
