use std::collections::BTreeMap;
use std::fs;
use std::fs::File;
use std::path::Path;
use serde::{Deserialize, Serialize};
use zip::ZipArchive;

use crate::utils::sorting::{is_image_entry, is_image_file, natural_compare};
use crate::utils::paths::find_zip_boundary;
use crate::utils::encoding::decode_zip_path;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_zip: bool,
    pub is_image: bool,
    /// manga:// URL (is_image = true のときのみ Some)
    pub thumbnail_url: Option<String>,
    /// Windows: FILE_ATTRIBUTE_HIDDEN, Unix: ドット始まり
    pub is_hidden: bool,
    /// 更新日時（Unix タイムスタンプ秒）。取得不可なら None
    pub modified_at: Option<u64>,
}


fn is_zip_like(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| matches!(ext.to_lowercase().as_str(), "zip" | "cbz"))
        .unwrap_or(false)
}

/// エントリがディレクトリかどうかを判定（ジャンクションポイント・シンボリックリンクも追跡）
fn detect_is_dir(entry: &std::fs::DirEntry, entry_path: &Path) -> bool {
    // file_type() はシンボリックリンクを追跡しないが高速
    // is_dir() はリンクを追跡して真のディレクトリかを返す
    entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) || entry_path.is_dir()
}

/// Windows 隠しファイル属性の検出
#[cfg(target_os = "windows")]
fn detect_is_hidden(entry_path: &Path, name: &str) -> bool {
    use std::os::windows::fs::MetadataExt;
    const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
    // メタデータ取得に失敗した場合はドット始まりで判定
    entry_path
        .metadata()
        .map(|m| m.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0)
        .unwrap_or_else(|_| name.starts_with('.'))
}

#[cfg(not(target_os = "windows"))]
fn detect_is_hidden(_entry_path: &Path, name: &str) -> bool {
    name.starts_with('.')
}

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

            if !(is_dir || is_zip || is_image) {
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

/// ZIPファイル内のエントリをリスト表示する。
///
/// `zip_path` はZIPファイル自体のパス（`D:/manga.zip`）でも、
/// ZIP内サブディレクトリのパス（`D:/manga.zip/chapter1`）でも受け付ける。
/// 指定した階層の直下にある「サブフォルダ」と「画像」だけを返す（再帰しない）。
#[tauri::command]
pub async fn browse_zip(zip_path: String) -> Result<Vec<FileEntry>, String> {
    let normalized = zip_path.replace('\\', "/");

    // ZIPファイルパスとZIP内の現在ディレクトリを分離
    let (zip_file, current_dir) = match find_zip_boundary(&normalized) {
        Some((zp, inner)) => (zp, inner.unwrap_or_default()),
        None => return Err(format!("ZIPファイルが見つかりません: {}", zip_path)),
    };

    let zip_file_path = Path::new(&zip_file);
    if !zip_file_path.is_file() {
        return Err(format!("ZIPファイルが存在しません: {}", zip_file));
    }

    // ZIPを開いて内容を走査
    let file = File::open(zip_file_path)
        .map_err(|e| format!("ZIPファイルを開けません: {}", e))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("ZIPファイルの読み取りに失敗: {}", e))?;

    // 現在ディレクトリのプレフィックス（末尾スラッシュあり）
    let prefix = if current_dir.is_empty() {
        String::new()
    } else {
        format!("{}/", current_dir.trim_end_matches('/'))
    };

    // subdirs: デコード済みディレクトリ名 → 表示名（同一）
    let mut subdirs: BTreeMap<String, String> = BTreeMap::new();
    // images: (ZIP内デコード済みフルパス, 表示名)
    let mut images: Vec<(String, String)> = Vec::new();

    let len = archive.len();
    for i in 0..len {
        // by_index_raw で生バイト列を取得し、decode_zip_path でデコードする
        let decoded_path: String = match archive.by_index_raw(i) {
            Ok(entry) => decode_zip_path(entry.name_raw()),
            Err(_) => continue,
        };

        // デコード済みパスでプレフィックスマッチ
        if !decoded_path.starts_with(&prefix) {
            continue;
        }
        let rest = &decoded_path[prefix.len()..];

        // 空 or ディレクトリエントリ自体（末尾 "/"）は無視
        if rest.is_empty() || rest == "/" {
            continue;
        }

        // 表示名はデコード済み rest の最初のセグメント
        let display_segment = rest.split('/').next().unwrap_or(rest).to_string();

        if let Some(slash_pos) = rest.find('/') {
            // スラッシュがある → このレベルのサブディレクトリ
            let dir_key = &rest[..slash_pos];
            if !dir_key.is_empty() {
                subdirs.entry(dir_key.to_string()).or_insert(display_segment);
            }
        } else {
            // スラッシュがない → 直下のファイル
            if is_image_entry(&decoded_path) {
                images.push((decoded_path, display_segment));
            }
        }
    }

    let mut entries: Vec<FileEntry> = Vec::new();

    // サブディレクトリ（is_zip = true にすることでダイアログが内部として扱う）
    for (dir_key, dir_display) in &subdirs {
        // dir_key はデコード済みなので、そのままパスに使用
        let dir_path = format!("{}/{}{}", zip_file, prefix, dir_key);
        entries.push(FileEntry {
            name: dir_display.clone(),
            path: dir_path,
            is_dir: false,
            is_zip: true,
            is_image: false,
            thumbnail_url: None,
            is_hidden: false,
            modified_at: None,
        });
    }

    // 画像をフルパスで自然順ソートして追加
    images.sort_by(|(a, _), (b, _)| natural_compare(a, b));
    for (entry_name, display_name) in images {
        // entry_name はデコード済み ZIP 内フルパス（例: "日本語フォルダ/001.jpg"）
        let entry_path = format!("{}/{}", zip_file, entry_name);
        entries.push(FileEntry {
            name: display_name,
            path: entry_path,
            is_dir: false,
            is_zip: false,
            is_image: true,
            thumbnail_url: None,
            is_hidden: false,
            modified_at: None,
        });
    }

    Ok(entries)
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
