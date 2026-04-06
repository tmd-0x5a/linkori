use std::fs::File;
use std::io::Read;
use std::path::Path;

use zip::ZipArchive;

use crate::utils::sorting::{is_image_entry, natural_compare};

/// ZIP内の画像エントリ名を自然順ソートで列挙する
pub fn list_images_in_zip(zip_path: &Path) -> Result<Vec<String>, String> {
    let file = File::open(zip_path)
        .map_err(|e| format!("ZIPファイルを開けません: {}", e))?;
    let archive = ZipArchive::new(file)
        .map_err(|e| format!("ZIPファイルの読み取りに失敗: {}", e))?;

    let mut images: Vec<String> = (0..archive.len())
        .filter_map(|i| {
            archive.name_for_index(i).map(|n| n.to_string())
        })
        .filter(|name| !name.ends_with('/') && is_image_entry(name))
        .collect();

    // フルパスでソートすることでディレクトリをまたいだ混在を防ぐ
    images.sort_by(|a, b| natural_compare(a, b));

    Ok(images)
}

/// ZIP内で start_entry から end_entry の範囲の画像エントリ名を返す
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
        return Err(format!(
            "開始エントリが終了エントリより後にあります（自然順ソート順）"
        ));
    }

    Ok(all_images[start_idx..=end_idx].to_vec())
}

/// ZIP内の指定プレフィックス（サブディレクトリ）以下にある画像を列挙する
pub fn list_images_in_zip_prefix(zip_path: &Path, prefix: &str) -> Result<Vec<String>, String> {
    let file = File::open(zip_path)
        .map_err(|e| format!("ZIPファイルを開けません: {}", e))?;
    let archive = ZipArchive::new(file)
        .map_err(|e| format!("ZIPファイルの読み取りに失敗: {}", e))?;

    let dir_prefix = format!("{}/", prefix.trim_end_matches('/'));

    let mut images: Vec<String> = (0..archive.len())
        .filter_map(|i| archive.name_for_index(i).map(|n| n.to_string()))
        .filter(|name| !name.ends_with('/') && is_image_entry(name) && name.starts_with(&dir_prefix))
        .collect();

    images.sort_by(|a, b| natural_compare(a, b));
    Ok(images)
}

/// ZIP展開時の最大ファイルサイズ（200MB）
const MAX_ZIP_ENTRY_SIZE: u64 = 200 * 1024 * 1024;

/// ZIP内の指定エントリを読み取ってバイト列を返す（解凍はメモリ上で行う）
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

    let mut zip_file = archive
        .by_name(entry_name)
        .map_err(|e| format!("ZIPエントリが見つかりません '{}': {}", entry_name, e))?;

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
