use std::fs::File;
use std::io::Read;
use std::path::Path;

use zip::ZipArchive;

use crate::utils::sorting::{is_image_entry, natural_compare};
use crate::utils::encoding::decode_zip_path;

/// ZIP内の画像エントリ名（デコード済み）を自然順ソートで列挙する
pub fn list_images_in_zip(zip_path: &Path) -> Result<Vec<String>, String> {
    let file = File::open(zip_path)
        .map_err(|e| format!("ZIPファイルを開けません: {}", e))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("ZIPファイルの読み取りに失敗: {}", e))?;

    let mut images: Vec<String> = Vec::new();
    for i in 0..archive.len() {
        let raw_name = match archive.by_index_raw(i) {
            Ok(entry) => entry.name_raw().to_vec(),
            Err(_) => continue,
        };
        let decoded = decode_zip_path(&raw_name);
        if !decoded.ends_with('/') && is_image_entry(&decoded) {
            images.push(decoded);
        }
    }

    images.sort_by(|a, b| natural_compare(a, b));
    Ok(images)
}

/// ZIP内で start_entry から end_entry の範囲の画像エントリ名（デコード済み）を返す
pub fn list_images_in_zip_range(
    zip_path: &Path,
    start_entry: Option<&str>,
    end_entry: Option<&str>,
) -> Result<Vec<String>, String> {
    let all_images = list_images_in_zip(zip_path)?;

    let start_idx = match start_entry {
        Some(name) => {
            all_images
                .iter()
                .position(|entry| {
                    entry == name
                        || Path::new(entry)
                            .file_name()
                            .and_then(|n| n.to_str())
                            .map(|n| n == name)
                            .unwrap_or(false)
                })
                .ok_or_else(|| format!("ZIP内に開始エントリが見つかりません: {}", name))?
        }
        None => 0,
    };

    let end_idx = match end_entry {
        Some(name) => {
            all_images
                .iter()
                .position(|entry| {
                    entry == name
                        || Path::new(entry)
                            .file_name()
                            .and_then(|n| n.to_str())
                            .map(|n| n == name)
                            .unwrap_or(false)
                })
                .ok_or_else(|| format!("ZIP内に終了エントリが見つかりません: {}", name))?
        }
        None => all_images.len().saturating_sub(1),
    };

    if start_idx > end_idx {
        return Err("開始エントリが終了エントリより後にあります（自然順ソート順）".to_string());
    }

    Ok(all_images[start_idx..=end_idx].to_vec())
}

/// ZIP内の指定プレフィックス（サブディレクトリ）以下にある画像を列挙する
/// プレフィックスはデコード済み日本語名で指定する
pub fn list_images_in_zip_prefix(zip_path: &Path, prefix: &str) -> Result<Vec<String>, String> {
    let file = File::open(zip_path)
        .map_err(|e| format!("ZIPファイルを開けません: {}", e))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("ZIPファイルの読み取りに失敗: {}", e))?;

    let dir_prefix = format!("{}/", prefix.trim_end_matches('/'));

    let mut images: Vec<String> = Vec::new();
    for i in 0..archive.len() {
        let raw_name = match archive.by_index_raw(i) {
            Ok(entry) => entry.name_raw().to_vec(),
            Err(_) => continue,
        };
        let decoded = decode_zip_path(&raw_name);
        if !decoded.ends_with('/') && is_image_entry(&decoded) && decoded.starts_with(&dir_prefix) {
            images.push(decoded);
        }
    }

    images.sort_by(|a, b| natural_compare(a, b));
    Ok(images)
}

/// ZIP展開時の最大ファイルサイズ（200MB）
const MAX_ZIP_ENTRY_SIZE: u64 = 200 * 1024 * 1024;

/// ZIP内の指定エントリを読み取ってバイト列を返す（解凍はメモリ上で行う）
/// entry_name はデコード済み日本語名で指定する
pub fn read_image_from_zip(zip_path: &Path, entry_name: &str) -> Result<Vec<u8>, String> {
    // Zip Slip 対策: エントリパスに ".." が含まれていないか確認
    let entry_path = Path::new(entry_name);
    if entry_path.components().any(|c| c == std::path::Component::ParentDir) {
        return Err("不正なZIPエントリパスです（パストラバーサルは許可されていません）".to_string());
    }

    let file = File::open(zip_path)
        .map_err(|e| format!("ZIPファイルを開けません: {}", e))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("ZIPファイルの読み取りに失敗: {}", e))?;

    // デコード済み名前でエントリのインデックスを検索する
    // archive.by_name() はCP437文字化けキーで検索するため、
    // 代わりに全エントリをデコードして比較する
    let mut found_idx: Option<usize> = None;
    for i in 0..archive.len() {
        let raw_name = match archive.by_index_raw(i) {
            Ok(entry) => entry.name_raw().to_vec(),
            Err(_) => continue,
        };
        let decoded = decode_zip_path(&raw_name);
        // 末尾スラッシュを除去して比較（念のため両方確認）
        if decoded == entry_name || decoded.trim_end_matches('/') == entry_name {
            found_idx = Some(i);
            break;
        }
    }

    let idx = found_idx
        .ok_or_else(|| format!("ZIPエントリが見つかりません '{}'", entry_name))?;

    let mut zip_file = archive
        .by_index(idx)
        .map_err(|e| format!("ZIPエントリが開けません: {}", e))?;

    // ファイルサイズ上限チェック（DoS対策）
    if zip_file.size() > MAX_ZIP_ENTRY_SIZE {
        return Err(format!(
            "ZIPエントリが大きすぎます（上限: {}MB）",
            MAX_ZIP_ENTRY_SIZE / 1024 / 1024
        ));
    }

    let mut buffer = Vec::new();
    zip_file
        .read_to_end(&mut buffer)
        .map_err(|e| format!("ZIPエントリの読み取りに失敗: {}", e))?;

    Ok(buffer)
}
