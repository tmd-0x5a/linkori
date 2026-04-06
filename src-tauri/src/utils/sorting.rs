use std::path::Path;

/// 画像ファイルかどうかを拡張子で判定
pub fn is_image_file(path: &Path) -> bool {
    let extensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "avif", "tiff", "tif"];
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| extensions.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// 画像ファイル名かどうかを文字列で判定（ZIP内エントリ用）
pub fn is_image_entry(name: &str) -> bool {
    let path = Path::new(name);
    is_image_file(path)
}

/// 自然順ソート比較関数
pub fn natural_compare(a: &str, b: &str) -> std::cmp::Ordering {
    natord::compare(a, b)
}

/// パスのファイル名部分を取得（自然順ソートのキーとして使用）
#[allow(dead_code)]
pub fn sort_key(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(path)
        .to_string()
}
