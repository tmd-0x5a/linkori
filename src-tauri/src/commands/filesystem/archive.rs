use std::collections::BTreeMap;
use std::fs::File;
use std::path::Path;
use zip::ZipArchive;

use crate::utils::encoding::decode_zip_path;
use crate::utils::paths::find_zip_boundary;
use crate::utils::sorting::{is_image_entry, natural_compare};
use super::FileEntry;

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
        } else if is_image_entry(&decoded_path) {
            // スラッシュがない → 直下のファイル
            images.push((decoded_path, display_segment));
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
            is_pdf: false,
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
            is_pdf: false,
            thumbnail_url: None,
            is_hidden: false,
            modified_at: None,
        });
    }

    Ok(entries)
}
