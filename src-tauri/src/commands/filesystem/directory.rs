use std::fs;
use std::path::Path;

use crate::utils::sorting::{is_image_file, natural_compare};
use super::FileEntry;
use super::helpers::{detect_is_dir, detect_is_hidden, is_zip_like};

/// 指定ディレクトリの内容をリスト表示する
#[tauri::command]
pub async fn browse_directory(path: String) -> Result<Vec<FileEntry>, String> {
    // Windows: "D:" のようなドライブレターのみのパスは "D:/" として扱う
    // そうしないと fs::read_dir がドライブのカレントディレクトリを返してしまう
    let path = if path.len() == 2 && path.ends_with(':') {
        format!("{}/", path)
    } else {
        path
    };
    let dir_path = Path::new(&path);

    if !dir_path.is_dir() {
        return Err(format!("ディレクトリが存在しません: {}", path));
    }

    let mut entries: Vec<FileEntry> = fs::read_dir(dir_path)
        .map_err(|e| format!("ディレクトリの読み取りに失敗: {}", e))?
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            let is_dir = detect_is_dir(&entry, &entry_path);
            let is_zip = !is_dir && is_zip_like(&entry_path);
            let is_image = !is_dir && !is_zip && is_image_file(&entry_path);
            let is_pdf = !is_dir && !is_zip && !is_image && entry_path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase() == "pdf")
                .unwrap_or(false);

            if !(is_dir || is_zip || is_image || is_pdf) {
                return None;
            }

            let path_str = entry_path.to_string_lossy().to_string();
            let is_hidden = detect_is_hidden(&entry_path, &name);
            let modified_at = entry_path
                .metadata()
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs());

            Some(FileEntry {
                name,
                path: path_str,
                is_dir,
                is_zip,
                is_image,
                is_pdf,
                thumbnail_url: None, // TypeScript側で readImageAsDataUrl を使って遅延読み込み
                is_hidden,
                modified_at,
            })
        })
        .collect();

    // ディレクトリ優先、その後自然順ソート
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => natural_compare(&a.name, &b.name),
    });

    Ok(entries)
}

/// 利用可能なドライブ一覧を返す（Windows: A-Z を検索、その他: ルートのみ）
#[tauri::command]
pub async fn list_drives() -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        let drives: Vec<String> = (b'A'..=b'Z')
            .filter_map(|letter| {
                let drive = format!("{}:/", letter as char);
                if std::path::Path::new(&drive).exists() {
                    Some(drive)
                } else {
                    None
                }
            })
            .collect();
        return Ok(drives);
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(vec!["/".to_string()])
    }
}
