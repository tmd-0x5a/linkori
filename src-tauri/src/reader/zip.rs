use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::SystemTime;

use zip::ZipArchive;

use crate::utils::sorting::{is_image_entry, natural_compare};
use crate::utils::encoding::decode_zip_path;

/// ZIP の CentralDirectory 解析結果。
/// `File` ハンドルは保持しない（ZIP ファイルのロックを避けるため）。
struct ZipMeta {
    /// デコード済みエントリ名 → ZIP 内の raw index
    name_to_idx: HashMap<String, usize>,
    /// 画像エントリのデコード済み名前を自然順ソートしたリスト
    image_entries: Vec<String>,
    /// stale 検証用（ZIP ファイルの更新時刻）
    mtime: Option<SystemTime>,
    /// stale 検証用（ZIP ファイルのバイト数）
    size: u64,
}

/// 単純な LRU（上限 8、アクセス順を末尾に移動）
struct ZipMetaCache {
    entries: Vec<(PathBuf, Arc<ZipMeta>)>,
    cap: usize,
}

impl ZipMetaCache {
    const fn new(cap: usize) -> Self {
        Self { entries: Vec::new(), cap }
    }

    fn get(&mut self, path: &Path) -> Option<Arc<ZipMeta>> {
        let pos = self.entries.iter().position(|(p, _)| p == path)?;
        let entry = self.entries.remove(pos);
        let meta = Arc::clone(&entry.1);
        self.entries.push(entry);
        Some(meta)
    }

    fn put(&mut self, path: PathBuf, meta: Arc<ZipMeta>) {
        if let Some(pos) = self.entries.iter().position(|(p, _)| p == &path) {
            self.entries.remove(pos);
        }
        if self.entries.len() >= self.cap {
            self.entries.remove(0);
        }
        self.entries.push((path, meta));
    }

    fn invalidate(&mut self, path: &Path) {
        if let Some(pos) = self.entries.iter().position(|(p, _)| p == path) {
            self.entries.remove(pos);
        }
    }
}

fn cache() -> &'static Mutex<ZipMetaCache> {
    static CACHE: OnceLock<Mutex<ZipMetaCache>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(ZipMetaCache::new(8)))
}

/// ZIP ファイルのメタデータ（mtime + size）を取得
fn file_stat(zip_path: &Path) -> (Option<SystemTime>, u64) {
    match fs::metadata(zip_path) {
        Ok(m) => (m.modified().ok(), m.len()),
        Err(_) => (None, 0),
    }
}

/// ZIP を開いて CentralDirectory を舐め、name_to_idx + image_entries を構築する。
/// キャッシュヒット時は File を開かない。
/// キャッシュロックを parse 中も保持することで、同一 path への並列 miss が
/// 重複して CentralDirectory をパースするのを防ぐ（同 ZIP の並列サムネ要求で効く）。
fn load_meta(zip_path: &Path) -> Result<Arc<ZipMeta>, String> {
    let (mtime, size) = file_stat(zip_path);

    let mut guard = cache().lock().unwrap();

    // キャッシュヒット判定（mtime + size が一致すれば再利用）
    if let Some(cached) = guard.get(zip_path) {
        if cached.mtime == mtime && cached.size == size {
            return Ok(cached);
        }
        guard.invalidate(zip_path);
    }

    // CentralDirectory パース（ロック保持したまま、重複構築を排除）
    let file = File::open(zip_path)
        .map_err(|e| format!("ZIPファイルを開けません: {}", e))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("ZIPファイルの読み取りに失敗: {}", e))?;

    let len = archive.len();
    let mut name_to_idx: HashMap<String, usize> = HashMap::with_capacity(len);
    let mut image_entries: Vec<String> = Vec::new();
    for i in 0..len {
        let raw_name = match archive.by_index_raw(i) {
            Ok(entry) => entry.name_raw().to_vec(),
            Err(_) => continue,
        };
        let decoded = decode_zip_path(&raw_name);
        // 末尾スラッシュを除去した名前で統一（read 時のキー比較と合わせる）
        let key = decoded.trim_end_matches('/').to_string();
        name_to_idx.insert(key, i);
        if !decoded.ends_with('/') && is_image_entry(&decoded) {
            image_entries.push(decoded);
        }
    }
    image_entries.sort_by(|a, b| natural_compare(a, b));

    let meta = Arc::new(ZipMeta { name_to_idx, image_entries, mtime, size });
    guard.put(zip_path.to_path_buf(), Arc::clone(&meta));
    Ok(meta)
}

/// ZIP内の画像エントリ名（デコード済み）を自然順ソートで列挙する
pub fn list_images_in_zip(zip_path: &Path) -> Result<Vec<String>, String> {
    let meta = load_meta(zip_path)?;
    Ok(meta.image_entries.clone())
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
        // 逆順チャンク: end→start の範囲を逆順で返す（例: 027.jpg→001.jpg）
        let mut range = all_images[end_idx..=start_idx].to_vec();
        range.reverse();
        return Ok(range);
    }

    Ok(all_images[start_idx..=end_idx].to_vec())
}

/// ZIP内の指定プレフィックス（サブディレクトリ）以下にある画像を列挙する
/// プレフィックスはデコード済み日本語名で指定する
pub fn list_images_in_zip_prefix(zip_path: &Path, prefix: &str) -> Result<Vec<String>, String> {
    let meta = load_meta(zip_path)?;
    let dir_prefix = format!("{}/", prefix.trim_end_matches('/'));
    Ok(meta
        .image_entries
        .iter()
        .filter(|e| e.starts_with(&dir_prefix))
        .cloned()
        .collect())
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

    // name→idx はキャッシュから O(1) で取得
    let meta = load_meta(zip_path)?;
    let key = entry_name.trim_end_matches('/');
    let idx = *meta
        .name_to_idx
        .get(key)
        .ok_or_else(|| format!("ZIPエントリが見つかりません '{}'", entry_name))?;

    // 解凍のみは File を毎回開く（設計A: ハンドル非保持で ZIP ロックを回避）
    let file = File::open(zip_path)
        .map_err(|e| format!("ZIPファイルを開けません: {}", e))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("ZIPファイルの読み取りに失敗: {}", e))?;

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

    let mut buffer = Vec::with_capacity(zip_file.size() as usize);
    zip_file
        .read_to_end(&mut buffer)
        .map_err(|e| format!("ZIPエントリの読み取りに失敗: {}", e))?;

    Ok(buffer)
}
