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
    // バックスラッシュをフォワードスラッシュに正規化してから処理する。
    // これにより "D:\manga\001.jpg" と "D:/manga/001.jpg" を同一視できる。
    let normalized = path.replace('\\', "/");

    // パストラバーサル対策: ".." セグメントを含むパスを拒否
    // （ZIP内エントリパスを含むすべてのパスに適用）
    if normalized.split('/').any(|seg| seg == "..") {
        // PathType に Error バリアントはないため File に空文字を返してエラーを伝播させる
        // 呼び出し側で is_dir() / is_file() が false になり適切に処理される
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
            // ファイルパスの場合、親ディレクトリとファイル名に分離
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

/// チャンクのバリデーション
/// start_path, end_pathが同じ階層/ZIPに存在し、順序が正しいか検証する
#[tauri::command]
pub async fn validate_chunk(
    start_path: String,
    end_path: String,
) -> Result<ChunkValidationResult, String> {
    // end_path が空 → resolve_from_start_only と同じ挙動（フォルダ/ZIP全体）
    if end_path.trim().is_empty() {
        let paths = resolve_from_start_only(&start_path)?;
        return Ok(ChunkValidationResult {
            is_valid: true,
            image_count: paths.len(),
            error_message: None,
            image_paths: paths,
        });
    }

    let start_type = classify_path(&start_path);
    let end_type = classify_path(&end_path);

    match (start_type, end_type) {
        // 両方がディレクトリ → 同じディレクトリである必要がある
        (PathType::Directory(dir1), PathType::Directory(dir2)) => {
            if dir1 != dir2 {
                return Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some("開始パスと終了パスが異なるディレクトリを指しています".to_string()),
                    image_paths: vec![],
                });
            }
            // ディレクトリ全体
            let images = directory::list_images_in_directory(Path::new(&dir1))?;
            let paths: Vec<String> = images.iter().map(|p| p.to_string_lossy().to_string()).collect();
            Ok(ChunkValidationResult {
                is_valid: true,
                image_count: paths.len(),
                error_message: None,
                image_paths: paths,
            })
        }

        // 両方がファイル → 同じディレクトリ内である必要がある
        (PathType::File(dir1, file1), PathType::File(dir2, file2)) => {
            if dir1 != dir2 {
                return Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some("開始ファイルと終了ファイルが異なるディレクトリにあります".to_string()),
                    image_paths: vec![],
                });
            }
            if !Path::new(&dir1).is_dir() {
                return Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some(format!("ディレクトリが存在しません: {}", dir1)),
                    image_paths: vec![],
                });
            }
            match directory::list_images_in_range(Path::new(&dir1), Some(&file1), Some(&file2)) {
                Ok(images) => {
                    let paths: Vec<String> = images.iter().map(|p| p.to_string_lossy().to_string()).collect();
                    Ok(ChunkValidationResult {
                        is_valid: true,
                        image_count: paths.len(),
                        error_message: None,
                        image_paths: paths,
                    })
                }
                Err(e) => Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some(e),
                    image_paths: vec![],
                }),
            }
        }

        // 開始がディレクトリ、終了もディレクトリ（同じ） → ディレクトリ全体
        // 開始がファイル、終了がディレクトリ → エラー（混在不可）
        (PathType::Directory(_dir), PathType::File(_, _))
        | (PathType::File(_, _), PathType::Directory(_dir)) => {
            Ok(ChunkValidationResult {
                is_valid: false,
                image_count: 0,
                error_message: Some("開始パスと終了パスの種類が異なります（ディレクトリとファイル）".to_string()),
                image_paths: vec![],
            })
        }

        // 両方がZIP全体 → 同じZIPである必要がある
        (PathType::ZipWhole(zip1), PathType::ZipWhole(zip2)) => {
            if zip1 != zip2 {
                return Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some("開始と終了が異なるZIPファイルを指しています".to_string()),
                    image_paths: vec![],
                });
            }
            if !Path::new(&zip1).is_file() {
                return Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some(format!("ZIPファイルが存在しません: {}", zip1)),
                    image_paths: vec![],
                });
            }
            let images = zip_reader::list_images_in_zip(Path::new(&zip1))?;
            let paths: Vec<String> = images
                .iter()
                .map(|entry| format!("zip://{}///{}", zip1, entry))
                .collect();
            Ok(ChunkValidationResult {
                is_valid: true,
                image_count: paths.len(),
                error_message: None,
                image_paths: paths,
            })
        }

        // 両方がZIPエントリ → 同じZIP内である必要がある
        (PathType::ZipEntry(zip1, entry1), PathType::ZipEntry(zip2, entry2)) => {
            if zip1 != zip2 {
                return Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some("開始と終了が異なるZIPファイルを参照しています".to_string()),
                    image_paths: vec![],
                });
            }
            if !Path::new(&zip1).is_file() {
                return Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some(format!("ZIPファイルが存在しません: {}", zip1)),
                    image_paths: vec![],
                });
            }
            match zip_reader::list_images_in_zip_range(Path::new(&zip1), Some(&entry1), Some(&entry2)) {
                Ok(images) => {
                    let paths: Vec<String> = images
                        .iter()
                        .map(|entry| format!("zip://{}///{}", zip1, entry))
                        .collect();
                    Ok(ChunkValidationResult {
                        is_valid: true,
                        image_count: paths.len(),
                        error_message: None,
                        image_paths: paths,
                    })
                }
                Err(e) => Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some(e),
                    image_paths: vec![],
                }),
            }
        }

        // ZIP全体とZIPエントリ → 同じZIPならエントリ側を範囲とみなす
        (PathType::ZipWhole(zip1), PathType::ZipEntry(zip2, entry2)) => {
            if zip1 != zip2 {
                return Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some("開始と終了が異なるZIPファイルを参照しています".to_string()),
                    image_paths: vec![],
                });
            }
            // ZIPの先頭からentry2まで
            match zip_reader::list_images_in_zip_range(Path::new(&zip1), None, Some(&entry2)) {
                Ok(images) => {
                    let paths: Vec<String> = images
                        .iter()
                        .map(|entry| format!("zip://{}///{}", zip1, entry))
                        .collect();
                    Ok(ChunkValidationResult {
                        is_valid: true,
                        image_count: paths.len(),
                        error_message: None,
                        image_paths: paths,
                    })
                }
                Err(e) => Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some(e),
                    image_paths: vec![],
                }),
            }
        }

        (PathType::ZipEntry(zip1, entry1), PathType::ZipWhole(zip2)) => {
            if zip1 != zip2 {
                return Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some("開始と終了が異なるZIPファイルを参照しています".to_string()),
                    image_paths: vec![],
                });
            }
            // entry1からZIPの末尾まで
            match zip_reader::list_images_in_zip_range(Path::new(&zip1), Some(&entry1), None) {
                Ok(images) => {
                    let paths: Vec<String> = images
                        .iter()
                        .map(|entry| format!("zip://{}///{}", zip1, entry))
                        .collect();
                    Ok(ChunkValidationResult {
                        is_valid: true,
                        image_count: paths.len(),
                        error_message: None,
                        image_paths: paths,
                    })
                }
                Err(e) => Ok(ChunkValidationResult {
                    is_valid: false,
                    image_count: 0,
                    error_message: Some(e),
                    image_paths: vec![],
                }),
            }
        }

        // その他の組み合わせ（ディレクトリ/ファイルとZIPの混在）
        _ => {
            Ok(ChunkValidationResult {
                is_valid: false,
                image_count: 0,
                error_message: Some("開始パスと終了パスの種類が異なります（ディレクトリ/ファイルとZIPの混在は不可）".to_string()),
                image_paths: vec![],
            })
        }
    }
}

/// end_path が空のとき、start_path の種別に応じてフォルダ全体を解決する
fn resolve_from_start_only(start_path: &str) -> Result<Vec<String>, String> {
    match classify_path(start_path) {
        PathType::Directory(dir) => {
            let images = directory::list_images_in_directory(Path::new(&dir))?;
            Ok(images.iter().map(|p| p.to_string_lossy().to_string()).collect())
        }
        PathType::ZipWhole(zip) => {
            let images = zip_reader::list_images_in_zip(Path::new(&zip))?;
            Ok(images.iter().map(|e| format!("zip://{}///{}", zip, e)).collect())
        }
        PathType::ZipEntry(zip, entry) => {
            if is_image_entry(&entry) {
                // 単一画像エントリ
                Ok(vec![format!("zip://{}///{}", zip, entry)])
            } else {
                // サブディレクトリとして扱い、配下の全画像を返す
                let images = zip_reader::list_images_in_zip_prefix(Path::new(&zip), &entry)?;
                Ok(images.iter().map(|e| format!("zip://{}///{}", zip, e)).collect())
            }
        }
        PathType::File(dir, file) => {
            // 単一ファイル
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
    // end_path が空 → start_path をフォルダ全体として解決
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
