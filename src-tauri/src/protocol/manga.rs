use std::io::Cursor;
use std::path::Path;

use crate::reader::directory;
use crate::reader::zip as zip_reader;
use crate::utils::paths::find_zip_boundary;

/// manga:// カスタムプロトコルのリクエストハンドラ
pub fn handle_manga_request(
    request: &tauri::http::Request<Vec<u8>>,
) -> tauri::http::Response<Vec<u8>> {
    match process_request(request) {
        Ok(response) => response,
        Err(e) => {
            log::error!("[manga protocol] エラー: {}", e);
            tauri::http::Response::builder()
                .status(500)
                .header("Content-Type", "text/plain")
                .header("Access-Control-Allow-Origin", "*")
                .body(format!("Error: {}", e).into_bytes())
                .unwrap()
        }
    }
}

fn process_request(
    request: &tauri::http::Request<Vec<u8>>,
) -> Result<tauri::http::Response<Vec<u8>>, Box<dyn std::error::Error>> {
    let url = request.uri().to_string();
    log::info!("[manga protocol] リクエスト受信: {}", url);

    // URL から型 + データ部分を抽出する。
    // Tauri v2 / WebView2 Windows では、カスタムプロトコルは
    // https://{scheme}.localhost/ として仮想ホストにマップされる。
    // dev モード（http://localhost:3000）でも同様に https:// で届く。
    // 念のため他の形式もフォールバックとして対応する。
    let path_part = url
        .strip_prefix("https://manga.localhost/")
        .or_else(|| url.strip_prefix("http://manga.localhost/"))
        .or_else(|| url.strip_prefix("manga://localhost/"))
        .or_else(|| url.strip_prefix("manga:///"))
        .or_else(|| url.strip_prefix("manga://"))
        .unwrap_or("");

    // パーセントエンコードを解除
    let decoded_path = urlencoding::decode(path_part)
        .map(|s| s.into_owned())
        .unwrap_or_else(|_| path_part.to_string());

    // クエリ文字列・フラグメントを除去してからセグメントに分割する
    let clean_path = decoded_path
        .split('?')
        .next()
        .and_then(|s| s.split('#').next())
        .unwrap_or(&decoded_path)
        .to_string();

    // type / base64_1 / base64_2 の 3 セグメントに分割
    let segments: Vec<&str> = clean_path.splitn(3, '/').collect();
    log::info!("[manga protocol] セグメント: {:?}", segments);

    match segments.first().copied() {
        // サムネイル: /thumb/{maxSize}/{元のmanga URL パス}
        // 例: /thumb/200/dir/{base64}  or  /thumb/200/zip/{b64zip}/{b64entry}
        Some("thumb") => {
            let rest = segments.get(1).unwrap_or(&"");
            // rest = "200/dir/xxx" or "200/zip/xxx/yyy"
            let (max_size_str, inner_path) = rest.split_once('/')
                .ok_or("サムネイルサイズが指定されていません")?;
            // segments[2] があれば結合（splitn(3) で切れた残り）
            let full_inner = if let Some(s2) = segments.get(2) {
                format!("{}/{}", inner_path, s2)
            } else {
                inner_path.to_string()
            };
            let max_size: u32 = max_size_str.parse().map_err(|_| "無効なサムネイルサイズ")?;

            // inner をさらにパースして画像バイトを取得
            let inner_segments: Vec<&str> = full_inner.splitn(3, '/').collect();
            let raw_bytes = match inner_segments.first().copied() {
                Some("dir") => {
                    let encoded = inner_segments.get(1).ok_or("パスが指定されていません")?;
                    let image_path_str = decode_base64(encoded)?;
                    let image_path = Path::new(&image_path_str);
                    if image_path.components().any(|c| c == std::path::Component::ParentDir) {
                        return Err("不正なパスです".into());
                    }
                    directory::read_image_from_directory(image_path)
                        .map_err(|e| format!("ファイル読み取り失敗: {e}"))?
                }
                Some("zip") => {
                    let encoded_zip = inner_segments.get(1).ok_or("ZIPパスが指定されていません")?;
                    let encoded_entry = inner_segments.get(2).ok_or("ZIPエントリが指定されていません")?;
                    let zip_path_str = decode_base64(encoded_zip)?;
                    let entry_name = decode_base64(encoded_entry)?;
                    let zip_path = Path::new(&zip_path_str);
                    if zip_path.components().any(|c| c == std::path::Component::ParentDir) {
                        return Err("不正なZIPパスです".into());
                    }
                    zip_reader::read_image_from_zip(zip_path, &entry_name)
                        .map_err(|e| format!("ZIP読み取り失敗: {e}"))?
                }
                _ => return Err("不明なサムネイル種別".into()),
            };

            let thumb_bytes = generate_thumbnail(&raw_bytes, max_size)?;
            Ok(build_ok_response(thumb_bytes, "image/jpeg".to_string()))
        }
        Some("dir") => {
            let encoded_path = segments.get(1).ok_or("パスが指定されていません")?;
            let image_path_str = decode_base64(encoded_path)?;

            // パストラバーサル対策: ".." セグメントを含むパスを拒否
            let image_path = Path::new(&image_path_str);
            if image_path.components().any(|c| c == std::path::Component::ParentDir) {
                return Err("不正なパスです（パストラバーサルは許可されていません）".into());
            }
            // 実在するファイルであること・ディレクトリでないことを確認
            if !image_path.is_file() {
                return Err(format!("ファイルが存在しません: {}", image_path_str).into());
            }

            let data = directory::read_image_from_directory(image_path)
                .map_err(|e| format!("ファイル読み取り失敗 '{}': {}", image_path_str, e))?;
            let content_type = guess_content_type(&image_path_str);

            Ok(build_ok_response(data, content_type))
        }
        Some("zip") => {
            let encoded_zip = segments.get(1).ok_or("ZIPパスが指定されていません")?;
            let encoded_entry = segments.get(2).ok_or("ZIPエントリ名が指定されていません")?;

            let zip_path_str = decode_base64(encoded_zip)?;
            let entry_name = decode_base64(encoded_entry)?;

            // ZIPファイルパスのパストラバーサル対策
            let zip_path = Path::new(&zip_path_str);
            if zip_path.components().any(|c| c == std::path::Component::ParentDir) {
                return Err("不正なZIPパスです（パストラバーサルは許可されていません）".into());
            }
            if !zip_path.is_file() {
                return Err(format!("ZIPファイルが存在しません: {}", zip_path_str).into());
            }

            let data = zip_reader::read_image_from_zip(zip_path, &entry_name)
                .map_err(|e| format!("ZIP読み取り失敗 '{}' / '{}': {}", zip_path_str, entry_name, e))?;
            let content_type = guess_content_type(&entry_name);

            Ok(build_ok_response(data, content_type))
        }
        other => {
            log::warn!("[manga protocol] 不明なパス種別: {:?} (元URL: {})", other, url);
            Ok(tauri::http::Response::builder()
                .status(404)
                .header("Content-Type", "text/plain")
                .header("Access-Control-Allow-Origin", "*")
                .body(b"Not Found".to_vec())?)
        }
    }
}

fn build_ok_response(data: Vec<u8>, content_type: String) -> tauri::http::Response<Vec<u8>> {
    tauri::http::Response::builder()
        .status(200)
        .header("Content-Type", content_type)
        .header("Access-Control-Allow-Origin", "*")
        .header("Cache-Control", "public, max-age=3600")
        .body(data)
        .unwrap()
}

fn decode_base64(encoded: &str) -> Result<String, String> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(encoded)
        .map_err(|e| format!("Base64デコード失敗 (input={:?}): {}", encoded, e))?;
    String::from_utf8(bytes).map_err(|e| format!("UTF-8デコード失敗: {}", e))
}

/// 画像バイト列を max_size に縮小して JPEG で返す
fn generate_thumbnail(raw_bytes: &[u8], max_size: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let img = image::load_from_memory(raw_bytes)
        .map_err(|e| format!("画像デコードエラー: {e}"))?;

    let (w, h) = (img.width(), img.height());
    let scale = (max_size as f32 / w.max(h) as f32).min(1.0);
    let nw = ((w as f32 * scale).round() as u32).max(1);
    let nh = ((h as f32 * scale).round() as u32).max(1);
    let thumb = img.resize_exact(nw, nh, image::imageops::FilterType::Nearest);

    let mut out: Vec<u8> = Vec::new();
    {
        use image::codecs::jpeg::JpegEncoder;
        let mut enc = JpegEncoder::new_with_quality(Cursor::new(&mut out), 40);
        enc.encode_image(&thumb)
            .map_err(|e| format!("サムネイル生成エラー: {e}"))?;
    }
    Ok(out)
}

fn guess_content_type(path: &str) -> String {
    mime_guess::from_path(path)
        .first_or_octet_stream()
        .to_string()
}

/// 画像パスを manga プロトコル URL に変換する。
///
/// Tauri v2 / Windows WebView2 では、カスタムプロトコルは
/// `https://{scheme}.localhost/` 仮想ホストとしてマップされる。
///
/// 対応フォーマット：
/// - 通常ファイル:        `D:\manga\001.jpg`          → `https://manga.localhost/dir/{base64}`
/// - ZIP内部 (zip://形式): `zip://D:/a.zip///001.jpg`  → `https://manga.localhost/zip/{base64_zip}/{base64_entry}`
/// - ZIP内部 (パス形式):  `D:/a.zip/001.jpg`           → `https://manga.localhost/zip/{base64_zip}/{base64_entry}`
pub fn image_path_to_manga_url(image_path: &str) -> String {
    use base64::Engine;

    // Windows の PathBuf が返すバックスラッシュを正規化する
    let normalized = image_path.replace('\\', "/");

    // zip:// スキーム形式（chunk.rs が生成する内部表現）
    if normalized.starts_with("zip://") {
        let rest = &normalized[6..];
        if let Some(sep_pos) = rest.find("///") {
            let zip_path = &rest[..sep_pos];
            let entry = &rest[sep_pos + 3..];
            let encoded_zip = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(zip_path);
            let encoded_entry = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(entry);
            return format!("https://manga.localhost/zip/{}/{}", encoded_zip, encoded_entry);
        }
        return "https://manga.localhost/error/invalid-zip-path".to_string();
    }

    // パス形式の ZIP エントリ: D:/manga.zip/ch01/001.jpg
    if let Some((zip_path, Some(entry_path))) = find_zip_boundary(&normalized) {
        let encoded_zip = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&zip_path);
        let encoded_entry = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&entry_path);
        return format!("https://manga.localhost/zip/{}/{}", encoded_zip, encoded_entry);
    }

    // 通常ファイルパス（正規化済みのパスをエンコード）
    let encoded = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&normalized);
    format!("https://manga.localhost/dir/{}", encoded)
}

/// 画像パスをサムネイル用 manga プロトコル URL に変換する。
/// `/thumb/{maxSize}/dir/{base64}` or `/thumb/{maxSize}/zip/{b64zip}/{b64entry}`
pub fn image_path_to_manga_thumb_url(image_path: &str, max_size: u32) -> String {
    // 通常の manga URL を生成し、ホスト部分の直後に thumb/{maxSize}/ を挿入
    let full_url = image_path_to_manga_url(image_path);
    // full_url = "https://manga.localhost/dir/..." or "https://manga.localhost/zip/..."
    let prefix = "https://manga.localhost/";
    if let Some(rest) = full_url.strip_prefix(prefix) {
        format!("{}thumb/{}/{}", prefix, max_size, rest)
    } else {
        full_url
    }
}

#[tauri::command]
pub fn convert_to_manga_urls(image_paths: Vec<String>) -> Vec<String> {
    image_paths
        .iter()
        .map(|path| image_path_to_manga_url(path))
        .collect()
}

#[tauri::command]
pub fn convert_to_manga_thumb_urls(image_paths: Vec<String>, max_size: u32) -> Vec<String> {
    image_paths
        .iter()
        .map(|path| image_path_to_manga_thumb_url(path, max_size))
        .collect()
}
