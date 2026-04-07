export type Lang = "ja" | "en";

export const translations = {
  ja: {
    // --- 共通 ---
    cancel:      "キャンセル",
    delete:      "削除",
    rename:      "名前変更",
    save:        "保存",
    deleteConfirm: "削除する",

    // --- PlaylistPanel ---
    newPlaylistAriaLabel:   "新規プレイリスト作成",
    playlistNamePlaceholder: "プレイリスト名",
    stopCreating:           "中止",
    create:                 "作成",
    noPlaylists:            "プレイリストを作成しましょう",
    chunkUnit:              "チャンク",
    openInViewer:           "ビューアで開く",
    noChunksLine1:          "チャンクがまだありません。",
    noChunksLine2:          "クリックして追加しましょう。",
    selectOrCreate:         "左のサイドバーからプレイリストを選択、",
    selectOrCreateSub:      "または新規作成してください。",
    deletePlaylistTitle:    "プレイリストを削除",
    deletePlaylistDesc:     "このプレイリストとすべてのチャンクが削除されます。この操作は元に戻せません。",

    // --- ChunkForm ---
    addChunk:             "チャンクを追加",
    addNewChunk:          "新しいチャンクを追加",
    chunkNameLabel:       "チャンク名（省略可）",
    chunkNamePlaceholder: "例: 第1巻",
    startPath:            "開始パス",
    startPathPlaceholder: "D:/manga/vol1/001.jpg  または  D:/manga/vol1/",
    endPathDir:           "終了パス（フォルダ選択時は不要）",
    endPathFile:          "終了パス（省略するとフォルダ全体）",
    endPathDirPlaceholder:  "（フォルダ全体が対象）",
    endPathFilePlaceholder: "D:/manga/vol1/050.jpg  （省略可）",
    add:                  "追加",

    // --- ChunkCard ---
    dragToReorder:  "ドラッグして並び替え",
    startLabel:     "開始",
    endLabel:       "終了",
    notSet:         "(未設定)",
    wholeFolder:    "(フォルダ全体)",
    edit:           "編集",
    deleteChunkTitle: "チャンクを削除",
    deleteChunkDesc:  (name: string) =>
      `「${name}」を削除しますか？この操作は元に戻せません。`,

    // --- FileBrowserDialog ---
    back:                "戻る",
    clickToEnterPath:    "クリックしてパスを入力",
    searchPlaceholder:   "検索...",
    listView:            "リスト表示",
    gridView:            "グリッド表示",
    hideHiddenFiles:     "隠しファイルを非表示",
    showHiddenFiles:     "隠しファイルを表示",
    pc:                  "PC",
    selectDriveOrFolder: "ドライブまたはフォルダを選択",
    selectDriveDesc:     "左のサイドバーからドライブを選ぶか、上部のアドレスバーにパスを入力してください",
    pathInputPlaceholder: "パスを入力 (例: D:/manga)",
    open:                "開く",
    colName:             "名前",
    colModified:         "更新日時",
    colType:             "種類",
    loading:             "読み込み中...",
    noResults:           "検索結果がありません",
    emptyFolder:         "このフォルダは空です",
    selectThisZip:       "このZIPを選択",
    selectThisFolder:    "このフォルダを選択",
    helpText:            "フォルダ/ZIPをダブルクリックで移動 · 画像をクリックで選択",
    addressBarPlaceholder: "パスを入力...",
    folderType:          "フォルダ",
    zipType:             "ZIPアーカイブ",
    imageType:           "画像",

    // --- ViewerCanvas ---
    viewerLoading:    "画像を読み込んでいます...",
    home:             "ホーム",
    homeTitle:        "ホームに戻る（Esc）",
    singlePage:       "1枚",
    singlePageTitle:  "1枚表示（S）",
    spreadPage:       "2枚",
    spreadPageTitle:  "2枚表示（S）",
    remaining:        (n: number) => `残り ${n} ページ`,

    // --- ImageFilePicker ---
    browseTitle: "ファイル・フォルダを選択",

    // --- 言語切り替え ---
    langToggle: "English",
  },

  en: {
    // --- Common ---
    cancel:      "Cancel",
    delete:      "Delete",
    rename:      "Rename",
    save:        "Save",
    deleteConfirm: "Delete",

    // --- PlaylistPanel ---
    newPlaylistAriaLabel:    "New playlist",
    playlistNamePlaceholder: "Playlist name",
    stopCreating:            "Cancel",
    create:                  "Create",
    noPlaylists:             "Create a playlist to get started",
    chunkUnit:               "chunks",
    openInViewer:            "Open in Viewer",
    noChunksLine1:           "No chunks yet.",
    noChunksLine2:           "Click to add one.",
    selectOrCreate:          "Select a playlist from the sidebar,",
    selectOrCreateSub:       "or create a new one.",
    deletePlaylistTitle:     "Delete Playlist",
    deletePlaylistDesc:      "This playlist and all its chunks will be permanently deleted.",

    // --- ChunkForm ---
    addChunk:             "Add Chunk",
    addNewChunk:          "Add New Chunk",
    chunkNameLabel:       "Chunk name (optional)",
    chunkNamePlaceholder: "e.g. Volume 1",
    startPath:            "Start path",
    startPathPlaceholder: "D:/manga/vol1/001.jpg  or  D:/manga/vol1/",
    endPathDir:           "End path (not needed for folders)",
    endPathFile:          "End path (optional — defaults to whole folder)",
    endPathDirPlaceholder:  "(entire folder)",
    endPathFilePlaceholder: "D:/manga/vol1/050.jpg  (optional)",
    add:                  "Add",

    // --- ChunkCard ---
    dragToReorder:  "Drag to reorder",
    startLabel:     "Start",
    endLabel:       "End",
    notSet:         "(not set)",
    wholeFolder:    "(whole folder)",
    edit:           "Edit",
    deleteChunkTitle: "Delete Chunk",
    deleteChunkDesc:  (name: string) =>
      `Delete "${name}"? This cannot be undone.`,

    // --- FileBrowserDialog ---
    back:                "Back",
    clickToEnterPath:    "Click to enter a path",
    searchPlaceholder:   "Search...",
    listView:            "List view",
    gridView:            "Grid view",
    hideHiddenFiles:     "Hide hidden files",
    showHiddenFiles:     "Show hidden files",
    pc:                  "PC",
    selectDriveOrFolder: "Select a drive or folder",
    selectDriveDesc:     "Choose a drive from the sidebar, or type a path in the address bar above.",
    pathInputPlaceholder: "Enter path (e.g. D:/manga)",
    open:                "Open",
    colName:             "Name",
    colModified:         "Modified",
    colType:             "Type",
    loading:             "Loading...",
    noResults:           "No results",
    emptyFolder:         "This folder is empty",
    selectThisZip:       "Select this ZIP",
    selectThisFolder:    "Select this folder",
    helpText:            "Double-click folder/ZIP to navigate · Click image to select",
    addressBarPlaceholder: "Enter path...",
    folderType:          "Folder",
    zipType:             "ZIP archive",
    imageType:           "Image",

    // --- ViewerCanvas ---
    viewerLoading:   "Loading images...",
    home:            "Home",
    homeTitle:       "Back to home (Esc)",
    singlePage:      "1-up",
    singlePageTitle: "Single page (S)",
    spreadPage:      "2-up",
    spreadPageTitle: "Spread (S)",
    remaining:       (n: number) => `${n} pages left`,

    // --- ImageFilePicker ---
    browseTitle: "Browse files and folders",

    // --- Language toggle ---
    langToggle: "日本語",
  },
} as const;

export type T = typeof translations.ja;
