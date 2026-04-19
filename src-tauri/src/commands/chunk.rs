use std::path::Path;
use serde::{Deserialize, Serialize};

use crate::reader::directory;
use crate::reader::zip as zip_reader;
use crate::utils::paths::find_zip_boundary;
use crate::utils::sorting::is_image_entry;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChunkValidationResult {
    pub is_valid: bool,
    pub image_count: usize,
    pub error_message: Option<String>,
    pub image_paths: Vec<String>,
}

/// パスの種別を判別する
#[derive(Debug)]
enum PathType {
    /// 通常のディレクトリパス
    Directory(String),
    /// 通常のファイルパス（ディレクトリパス, ファイル名）
    File(String, String),
    /// ZIPファイル全体
    ZipWhole(String),
    /// ZIP内の特定エントリ（ZIPパス, エントリパス）
    ZipEntry(String, String),
}

fn classify_path(path: &str) -> PathType {
    // バックスラッシュをフォワードスラッシュに正規化してから処理する
    let normalized = path.replace('\\', "/");

    // パストラバーサル対策: ".." セグメントを含むパスを拒否
    if normalized.split('/').any(|seg| seg == "..") {
        return PathType::File(String::new(), String::new());
    }

    if let Some((zip_path, inner)) = find_zip_boundary(&normalized) {
        match inner {
            Some(entry) => PathType::ZipEntry(zip_path, entry),
            None => PathType::ZipWhole(zip_path),
        }
    } else {
        let p = Path::new(&normalized);
        if p.is_dir() {
            PathType::Directory(normalized)
        } else {
            let dir = p.parent()
                .map(|d| d.to_string_lossy().replace('\\', "/"))
                .unwrap_or_default();
            let file = p.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();
            PathType::File(dir, file)
        }
    }
}

// ---------------------------------------------------------------------------
// ChunkValidationResult 構築ヘルパー
// ---------------------------------------------------------------------------

#[inline]
fn ok_result(paths: Vec<String>) -> ChunkValidationResult {
    ChunkValidationResult {
        is_valid: true,
        image_count: paths.len(),
        error_message: None,
        image_paths: paths,
    }
}

#[inline]
fn err_result(msg: impl Into<String>) -> ChunkValidationResult {
    ChunkValidationResult {
        is_valid: false,
        image_count: 0,
        error_message: Some(msg.into()),
        image_paths: vec![],
    }
}

/// Result<Vec<String>, String> を ChunkValidationResult にラップする
#[inline]
fn wrap_range_result(r: Result<Vec<String>, String>) -> ChunkValidationResult {
    match r {
        Ok(paths) => ok_result(paths),
        Err(e) => err_result(e),
    }
}

// ---------------------------------------------------------------------------
// 種別ペアごとの検証関数
// ---------------------------------------------------------------------------

/// 両方がディレクトリのケース
fn validate_dir_pair(dir1: &str, dir2: &str) -> ChunkValidationResult {
    if dir1 != dir2 {
        return err_result("開始パスと終了パスが異なるディレクトリを指しています");
    }
    match directory::list_images_recursively(Path::new(dir1)) {
        Ok(images) => {
            let paths = images.iter().map(|p| p.to_string_lossy().to_string()).collect();
            ok_result(paths)
        }
        Err(e) => err_result(e),
    }
}

/// 両方がファイル（同一ディレクトリ下）のケース
fn validate_file_pair(dir1: &str, file1: &str, dir2: &str, file2: &str) -> ChunkValidationResult {
    if dir1 != dir2 {
        return err_result("開始ファイルと終了ファイルが異なるディレクトリにあります");
    }
    if !Path::new(dir1).is_dir() {
        return err_result(format!("ディレクトリが存在しません: {}", dir1));
    }
    let r = directory::list_images_in_range(Path::new(dir1), Some(file1), Some(file2))
        .map(|images| images.iter().map(|p| p.to_string_lossy().to_string()).collect());
    wrap_range_result(r)
}

/// ZIP 内のエントリリストを zip:// URL 形式のパスに整形する
#[inline]
fn zip_entries_to_paths(zip_path: &str, entries: &[String]) -> Vec<String> {
    entries.iter().map(|e| format!("zip://{}///{}", zip_path, e)).collect()
}

/// 両方が ZIP 全体のケース
fn validate_zip_whole_pair(zip1: &str, zip2: &str) -> ChunkValidationResult {
    if zip1 != zip2 {
        return err_result("開始と終了が異なるZIPファイルを指しています");
    }
    if !Path::new(zip1).is_file() {
        return err_result(format!("ZIPファイルが存在しません: {}", zip1));
    }
    match zip_reader::list_images_in_zip(Path::new(zip1)) {
        Ok(images) => ok_result(zip_entries_to_paths(zip1, &images)),
        Err(e) => err_result(e),
    }
}

/// ZIP 内の範囲検証（ZipEntry×ZipEntry / ZipEntry×ZipWhole / ZipWhole×ZipEntry 共通化）
fn validate_zip_range(
    zip1: &str,
    zip2: &str,
    start_entry: Option<&str>,
    end_entry: Option<&str>,
) -> ChunkValidationResult {
    if zip1 != zip2 {
        return err_result("開始と終了が異なるZIPファイルを参照しています");
    }
    if !Path::new(zip1).is_file() {
        return err_result(format!("ZIPファイルが存在しません: {}", zip1));
    }
    let r = zip_reader::list_images_in_zip_range(Path::new(zip1), start_entry, end_entry)
        .map(|images| zip_entries_to_paths(zip1, &images));
    wrap_range_result(r)
}

// ---------------------------------------------------------------------------
// Tauri コマンド
// ---------------------------------------------------------------------------

/// チャンクのバリデーション
/// start_path, end_path が同じ階層/ZIP に存在し、順序が正しいか検証する
#[tauri::command]
pub async fn validate_chunk(
    start_path: String,
    end_path: String,
) -> Result<ChunkValidationResult, String> {
    // end_path が空 → start_path 単体（フォルダ/ZIP全体）
    if end_path.trim().is_empty() {
        let paths = resolve_from_start_only(&start_path)?;
        return Ok(ok_result(paths));
    }

    let start_type = classify_path(&start_path);
    let end_type = classify_path(&end_path);

    let result = match (start_type, end_type) {
        (PathType::Directory(dir1), PathType::Directory(dir2)) => validate_dir_pair(&dir1, &dir2),

        (PathType::File(dir1, file1), PathType::File(dir2, file2)) => {
            validate_file_pair(&dir1, &file1, &dir2, &file2)
        }

        (PathType::Directory(_), PathType::File(_, _))
        | (PathType::File(_, _), PathType::Directory(_)) => {
            err_result("開始パスと終了パスの種類が異なります（ディレクトリとファイル）")
        }

        (PathType::ZipWhole(zip1), PathType::ZipWhole(zip2)) => validate_zip_whole_pair(&zip1, &zip2),

        (PathType::ZipEntry(zip1, entry1), PathType::ZipEntry(zip2, entry2)) => {
            validate_zip_range(&zip1, &zip2, Some(&entry1), Some(&entry2))
        }

        (PathType::ZipWhole(zip1), PathType::ZipEntry(zip2, entry2)) => {
            validate_zip_range(&zip1, &zip2, None, Some(&entry2))
        }

        (PathType::ZipEntry(zip1, entry1), PathType::ZipWhole(zip2)) => {
            validate_zip_range(&zip1, &zip2, Some(&entry1), None)
        }

        _ => err_result("開始パスと終了パスの種類が異なります（ディレクトリ/ファイルとZIPの混在は不可）"),
    };

    Ok(result)
}

/// end_path が空のとき、start_path の種別に応じてフォルダ全体を解決する
fn resolve_from_start_only(start_path: &str) -> Result<Vec<String>, String> {
    match classify_path(start_path) {
        PathType::Directory(dir) => {
            let images = directory::list_images_recursively(Path::new(&dir))?;
            Ok(images.iter().map(|p| p.to_string_lossy().to_string()).collect())
        }
        PathType::ZipWhole(zip) => {
            let images = zip_reader::list_images_in_zip(Path::new(&zip))?;
            Ok(zip_entries_to_paths(&zip, &images))
        }
        PathType::ZipEntry(zip, entry) => {
            if is_image_entry(&entry) {
                Ok(vec![format!("zip://{}///{}", zip, entry)])
            } else {
                let images = zip_reader::list_images_in_zip_prefix(Path::new(&zip), &entry)?;
                Ok(zip_entries_to_paths(&zip, &images))
            }
        }
        PathType::File(dir, file) => {
            Ok(vec![format!("{}/{}", dir, file)])
        }
    }
}

/// チャンク内の画像パスリストを解決する（ビューア用）
/// end_path が空の場合は start_path のフォルダ全体を対象とする
#[tauri::command]
pub async fn resolve_chunk_images(
    start_path: String,
    end_path: String,
) -> Result<Vec<String>, String> {
    if end_path.trim().is_empty() {
        return resolve_from_start_only(&start_path);
    }
    let result = validate_chunk(start_path, end_path).await?;
    if result.is_valid {
        Ok(result.image_paths)
    } else {
        Err(result.error_message.unwrap_or_else(|| "不明なエラー".to_string()))
    }
}
