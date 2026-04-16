# Linkori

**English** | [日本語](README.ja.md)

A local manga and image viewer. Read multiple folders and ZIP archives in sequence using a playlist system.

**[Website](https://tmd-0x5a.github.io/linkori/)** | **[Download](https://github.com/tmd-0x5a/linkori/releases/latest)**

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
- **Drag to reorder** (v0.4.0): drag anywhere on the playlist item to reorder (no separate drag handle required)
- Right-click for rename / delete context menu
- Double-click to rename in place
- `F2` to rename the selected playlist; `Delete` to delete it
- **Favorites**: star any playlist; filter the list to show only favorites (★ button)
- **Custom tags**: add arbitrary text tags to each playlist; click a tag in the filter bar to narrow the list
- **Reading progress bar**: each playlist item shows a progress bar indicating how far you've read

### Chunks (Reading Ranges)
- Register a range from a start file to an end file as a "chunk"
- **Multi-select & group drag** (v0.4.0): click to select, `Ctrl+click` to toggle, `Shift+click` to range-select, drag to select — drag selected chunks as a group; all move simultaneously with a DragOverlay showing a stacked card and count badge
- Reorder chunks with drag and drop
- Supports images in directories and inside ZIP archives
- Chain multiple chunks into a single continuous playlist
- Set a folder or ZIP as the start path to include the entire contents (no end path needed)
- Supports ZIP subdirectories
- Right-click context menu for edit / delete
- **Reverse order**: if the end file comes before the start file numerically (e.g. `027.jpg` → `001.jpg`), images are served in reverse order
- **Preview**: click the eye icon on a chunk card to browse its images as thumbnails before opening the viewer
- **Image count badge**: each chunk card shows the number of images it contains
- **Sort chunks**: sort all chunks in the active playlist by name, last-modified date, or created date (ascending / descending) via the sort menu
- **Split by subfolder**: split a single chunk into multiple sub-chunks, one per subfolder — with undo support
- **Batch delete**: select multiple chunks and delete them all at once; `Ctrl+Z` restores the last deleted batch

### File Browser (Built-in Explorer)
- Custom in-app file browser — no OS native dialog
- Left sidebar shows all available drives dynamically
- Click the address bar (breadcrumb) to type a path directly
- **View modes**: List / Grid (large thumbnails)
- **Sorting**: by name or date, ascending / descending — click column headers; sort order and view mode are remembered across navigations and dialog reopens
- Navigate into directories and ZIP files (.zip / .cbz)
- Correct display of Shift-JIS (CP932) encoded filenames in Japanese ZIPs
- Lazy thumbnail loading; hidden files are hidden by default
- "Select this folder" / "Select this ZIP" buttons for whole-folder selection
- **End-path restriction**: the end path picker is locked to the same folder or ZIP as the start path

### Language
- Switch UI language between **English** and **Japanese** from the settings menu
- Language preference is saved and restored on next launch

### Viewer
- Toggle between single-page and two-page spread view
- Right-to-left reading direction (Japanese manga)
- Page transition animation
- Full-screen display
- **Fast open**: viewer opens instantly — images load on demand as you read (lazy loading), so large playlists and ZIPs no longer cause a delay
- **Reading position memory**: automatically saves and restores the last viewed page and display settings (single / spread) per playlist — persists across app restarts
- **Faster seek-bar thumbnails**: thumbnails are generated outward from the current page first; already-loaded images are resized in the browser instantly without IPC overhead
- **Partial-failure warning**: if some chunks fail to load but others succeed, a dismissible warning banner appears at the top of the viewer listing which chunks could not be read — the rest of the playlist remains fully viewable

#### Controls

| Input | Action |
|---|---|
| Scroll ↓ / `←` / `↑` / `Space` / `PageDown` | Next page |
| Scroll ↑ / `→` / `↓` / `Shift+Space` / `PageUp` | Previous page |
| `Home` | First page |
| `End` | Last page |
| `S` | Toggle single / spread view |
| `[` | Next chunk |
| `]` | Previous chunk |
| `F` | Toggle fullscreen |
| `Esc` | Exit fullscreen / Return to home |
| Click right half | Previous page |
| Click left half | Next page |

#### Page Bar (bottom, visible on hover)
- Shows current page / total pages and remaining count
- Drag or click the progress bar (right-to-left) to seek
- **Chunk visualization**: tick marks on the progress bar show chunk boundaries — click a tick to jump to that chunk
- **Chunk navigation buttons**: prev / next chunk buttons flank the progress bar
- Current chunk name (or number) is displayed in the center when a playlist has multiple chunks

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
