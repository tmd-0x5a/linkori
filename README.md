# Linkori

**English** | [日本語](README.ja.md)

A local manga and image viewer. Read multiple folders and ZIP archives in sequence using a playlist system.

## Screenshots

**Playlist Screen**
![Playlist Screen](docs/プレイリスト画面.png)

**File Browser**
![File Browser](docs/ファイルブラウザ.png)

**Viewer**
![Viewer](docs/ビューア画面.png)

## Download

Download the latest installer from the [**Releases**](https://github.com/tmd-0x5a/linkori/releases) page.

| File | Description |
|---|---|
| `Linkori_x.x.x_x64-setup.zip` | Installer (recommended) — extract and run `setup.exe` |
| `Linkori_x.x.x_x64_en-US.zip` | MSI installer — extract and run `.msi` |

### Requirements
- Windows 10 / 11 (x64)
- WebView2 runtime (built into Windows 11; auto-installed on Windows 10)

---

## Features

### Playlist Management
- Create, delete, and rename playlists
- Playlists are saved locally and persist across restarts
- Switch between multiple playlists
- Right-click for rename / delete context menu
- Double-click to rename in place

### Chunks (Reading Ranges)
- Register a range from a start file to an end file as a "chunk"
- Reorder chunks with drag and drop
- Supports images in directories and inside ZIP archives
- Chain multiple chunks into a single continuous playlist
- Set a folder or ZIP as the start path to include the entire contents (no end path needed)
- Supports ZIP subdirectories
- Right-click context menu for edit / delete

### File Browser (Built-in Explorer)
- Custom in-app file browser — no OS native dialog
- Left sidebar shows all available drives dynamically
- Click the address bar (breadcrumb) to type a path directly
- **View modes**: List / Grid (large thumbnails)
- **Sorting**: by name or date, ascending / descending — click column headers
- Navigate into directories and ZIP files (.zip / .cbz)
- Correct display of Shift-JIS (CP932) encoded filenames in Japanese ZIPs
- Lazy thumbnail loading; hidden files are hidden by default
- "Select this folder" / "Select this ZIP" buttons for whole-folder selection

### Language
- Switch UI language between **English** and **Japanese** from the settings menu
- Language preference is saved and restored on next launch

### Viewer
- Toggle between single-page and two-page spread view
- Right-to-left reading direction (Japanese manga)
- Page transition animation
- Full-screen display
- **Fast open**: viewer opens instantly — images load on demand as you read (lazy loading), so large playlists and ZIPs no longer cause a delay

#### Controls

| Input | Action |
|---|---|
| Scroll ↓ / `←` / `↑` / `Space` / `PageDown` | Next page |
| Scroll ↑ / `→` / `↓` / `Shift+Space` / `PageUp` | Previous page |
| `Home` | First page |
| `End` | Last page |
| `S` | Toggle single / spread view |
| `Esc` | Return to home |
| Click right half | Previous page |
| Click left half | Next page |

#### Page Bar (bottom, visible on hover)
- Shows current page / total pages and remaining count
- Drag or click the progress bar (right-to-left) to seek

## Supported Image Formats

JPEG / PNG / GIF / WebP / BMP / TIFF

## Supported Archives

`.zip` / `.cbz` (including images inside ZIP subdirectories)

## Security

- **Zip Slip protection**: Rejects ZIP entries containing `..` path traversal
- **Path traversal protection**: Validated in the `manga://` protocol handler and chunk resolution
- **File size limit**: 200 MB cap per ZIP entry to prevent DoS
- **CSP**: `img-src` restricted to the `manga://` protocol only

## Data Storage

Playlist and chunk data is stored locally at:

```
C:\Users\<username>\AppData\Roaming\com.linkori.app\
```

Data persists after uninstalling. To reset completely, delete the folder above manually.

---

## Disclaimer

- This software is provided "as is" without any warranty.
- The author is not liable for any damages arising from its use.
- You are solely responsible for ensuring that your use of any content complies with applicable copyright laws.
- This application runs entirely locally and never transmits data to external servers.

---

## License

MIT License

---

## Development

```bash
# Frontend dev server
npm run dev

# Tauri dev (with hot reload)
npm run tauri dev

# Production build
npm run build
npm run tauri build
```

### Prerequisites
- Node.js
- Rust / Cargo
- Tauri v2 CLI
