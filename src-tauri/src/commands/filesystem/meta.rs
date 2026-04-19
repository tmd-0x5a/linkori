use std::fs;
use std::path::Path;

use crate::utils::sorting::natural_compare;
use super::helpers::detect_is_hidden;
use super::{PathMeta, SplitCandidate};

/// パスのファイルシステムメタデータ（更新日時・作成日時）を返す。
/// チャンクの並び替えに使用する。ZIP内部パスや存在しないパスは None を返す。
#[tauri::command]
pub async fn get_path_meta(path: String) -> Result<PathMeta, String> {
    let p = Path::new(&path);
    let meta = p.metadata().map_err(|e| format!("メタデータ取得失敗: {e}"))?;
    let modified_at = meta.modified().ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs());
    let created_at = meta.created().ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs());
    Ok(PathMeta { modified_at, created_at })
}

/// 指定フォルダの直下にある非隠しサブフォルダを自然順で返す。
/// 再帰的な展開はせず、ユーザーが必要に応じて各チャンクを再分割する。
#[tauri::command]
pub async fn list_split_candidates(path: String) -> Result<Vec<SplitCandidate>, String> {
    let normalized = path.replace('\\', "/");
    let dir = std::path::Path::new(&normalized);
    if !dir.is_dir() {
        return Err(format!("ディレクトリが存在しません: {path}"));
    }

    let mut subdirs: Vec<std::path::PathBuf> = fs::read_dir(dir)
        .map_err(|e| format!("読み取り失敗: {e}"))?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            if !p.is_dir() { return false; }
            let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
            !detect_is_hidden(p, name)
        })
        .collect();

    subdirs.sort_by(|a, b| {
        let a_name = a.file_name().and_then(|n| n.to_str()).unwrap_or("");
        let b_name = b.file_name().and_then(|n| n.to_str()).unwrap_or("");
        natural_compare(a_name, b_name)
    });

    Ok(subdirs.iter().map(|p| SplitCandidate {
        name: p.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string(),
        path: p.to_string_lossy().replace('\\', "/"),
    }).collect())
}

/// ファイルをバイト列として読み込み、Base64 文字列で返す。
/// pdf.js など、フロントエンド側でバイト列が必要なファイル（PDF等）に使用する。
#[tauri::command]
pub async fn read_file_as_base64(path: String) -> Result<String, String> {
    use base64::Engine;
    let bytes = fs::read(&path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::PermissionDenied {
            "ファイルへのアクセス権限がありません".to_string()
        } else if e.kind() == std::io::ErrorKind::NotFound {
            "ファイルが見つかりません".to_string()
        } else {
            format!("ファイル読み込みエラー: {e}")
        }
    })?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}
