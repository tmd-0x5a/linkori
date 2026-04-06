use std::path::Path;
use serde::Serialize;

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
