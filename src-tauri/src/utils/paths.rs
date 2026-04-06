/// ZIP/CBZファイルのパス境界を検出する。
///
/// パス内でいずれかのセグメントが `.zip` または `.cbz` で終わる場合、
/// そのZIPパスと内部エントリパス（あれば）を返す。
///
/// # 例
/// - `"D:/manga.zip"`              → `Some(("D:/manga.zip", None))`
/// - `"D:/manga.zip/ch01/001.jpg"` → `Some(("D:/manga.zip", Some("ch01/001.jpg")))`
/// - `"D:/manga/001.jpg"`          → `None`
pub fn find_zip_boundary(path: &str) -> Option<(String, Option<String>)> {
    let normalized = path.replace('\\', "/");
    let parts: Vec<&str> = normalized.split('/').collect();

    let mut zip_path_parts: Vec<&str> = Vec::new();
    for (i, part) in parts.iter().enumerate() {
        zip_path_parts.push(part);
        let lower = part.to_lowercase();
        if lower.ends_with(".zip") || lower.ends_with(".cbz") {
            let zip_path = zip_path_parts.join("/");
            let inner_path = if i + 1 < parts.len() {
                Some(parts[i + 1..].join("/"))
            } else {
                None
            };
            return Some((zip_path, inner_path));
        }
    }
    None
}

