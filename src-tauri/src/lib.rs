mod commands;
mod protocol;
mod reader;
mod utils;

use commands::chunk::{validate_chunk, resolve_chunk_images};
use commands::filesystem::{browse_directory, browse_zip, list_drives, read_file_as_base64};
use commands::image::{read_image_as_data_url, read_image_thumbnail, validate_image_file};
use protocol::manga::{convert_to_manga_urls, convert_to_manga_thumb_urls};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .register_uri_scheme_protocol("manga", |_ctx, request| {
            protocol::manga::handle_manga_request(&request)
        })
        .invoke_handler(tauri::generate_handler![
            validate_chunk,
            resolve_chunk_images,
            browse_directory,
            browse_zip,
            list_drives,
            convert_to_manga_urls,
            convert_to_manga_thumb_urls,
            validate_image_file,
            read_image_as_data_url,
            read_image_thumbnail,
            read_file_as_base64,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
