use std::fs;
use std::path::{Path, PathBuf};

use crate::utils::sorting::{is_image_file, natural_compare};

/// ディレクトリ内の画像ファイルを自然順ソートで列挙する
/// サブディレクトリは再帰的に走査しない（同一階層のみ）
pub fn list_images_in_directory(dir_path: &Path) -> Result<Vec<PathBuf>, String> {
    if !dir_path.is_dir() {
        return Err(format!("ディレクトリが存在しません: {}", dir_path.display()));
    }

    let mut images: Vec<PathBuf> = fs::read_dir(dir_path)
        .map_err(|e| format!("ディレクトリの読み取りに失敗: {}", e))?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.is_file() && is_image_file(path))
        .collect();

    images.sort_by(|a, b| {
        let a_name = a.file_name().and_then(|n| n.to_str()).unwrap_or("");
        let b_name = b.file_name().and_then(|n| n.to_str()).unwrap_or("");
        natural_compare(a_name, b_name)
    });

    Ok(images)
}

/// ディレクトリ内で start_file から end_file の範囲の画像を返す
/// start_file/end_file はファイル名（パスではない）
/// start_file が None の場合は先頭から、end_file が None の場合は末尾まで
pub fn list_images_in_range(
    dir_path: &Path,
    start_file: Option<&str>,
    end_file: Option<&str>,
) -> Result<Vec<PathBuf>, String> {
    let all_images = list_images_in_directory(dir_path)?;

    let start_idx = match start_file {
        Some(name) => {
            all_images
                .iter()
                .position(|p| {
                    p.file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n == name)
                        .unwrap_or(false)
                })
                .ok_or_else(|| format!("開始ファイルが見つかりません: {}", name))?
        }
        None => 0,
    };

    let end_idx = match end_file {
        Some(name) => {
            all_images
                .iter()
                .position(|p| {
                    p.file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n == name)
                        .unwrap_or(false)
                })
                .ok_or_else(|| format!("終了ファイルが見つかりません: {}", name))?
        }
        None => all_images.len().saturating_sub(1),
    };

    if start_idx > end_idx {
        // 逆順チャンク: end→start の範囲を逆順で返す（例: 027.jpg→001.jpg）
        let mut range = all_images[end_idx..=start_idx].to_vec();
        range.reverse();
        return Ok(range);
    }

    Ok(all_images[start_idx..=end_idx].to_vec())
}

/// 指定パスの画像をバイト列として読み取る
pub fn read_image_from_directory(image_path: &Path) -> Result<Vec<u8>, String> {
    fs::read(image_path).map_err(|e| format!("画像の読み取りに失敗: {}", e))
}
