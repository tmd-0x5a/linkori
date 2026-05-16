// Bilingual copy
const COPY = {
  nav: {
    features: { ja: "機能", en: "Features" },
    playlist: { ja: "プレイリスト", en: "Playlist" },
    viewer: { ja: "ビューア", en: "Viewer" },
    shortcuts: { ja: "ショートカット", en: "Shortcuts" },
    download: { ja: "ダウンロード", en: "Download" },
  },
  hero: {
    badge: {
      ja: "v0.5.0 — 色と栞で、作品を束ねる。",
      en: "v0.5.0 — Bind works by color and bookmark.",
    },
    line1: { ja: "物語を、", en: "Stories," },
    line2: { ja: "", en: "" },
    line3: { ja: "一続きに。", en: "woven as one." },
    lede: {
      ja: "Linkori = Link（繋ぐ）+ Ori（栞）。\nフォルダ・ZIP・PDFの読みたい範囲だけを連結し、\n1つのプレイリストとして通して読めるローカル漫画ビューア。",
      en: "Linkori — Link × Ori (bookmark).\nChain folders, ZIPs and PDFs into chunks,\nand weave them into one seamless local read.",
    },
    cta: { ja: "Windows版をダウンロード", en: "Download for Windows" },
    ghost: { ja: "GitHubで見る", en: "View on GitHub" },
    meta1: { ja: "Windows 10 / 11", en: "Windows 10 / 11" },
    meta2: { ja: "無料・オープンソース (MIT)", en: "Free · Open Source (MIT)" },
    meta3: { ja: "x64", en: "x64" },
    scroll: { ja: "SCROLL TO EXPLORE", en: "SCROLL TO EXPLORE" },
  },
  ticker: {
    items: [
      { ja: "ZIP", en: "ZIP" },
      { ja: "CBZ", en: "CBZ" },
      { ja: "PDF", en: "PDF" },
      { ja: "JPG / PNG / WEBP", en: "JPG / PNG / WEBP" },
      { ja: "タグ色", en: "Tag colors" },
      { ja: "ビューア内編集", en: "In-viewer edit" },
      { ja: "17色パレット", en: "17 colors" },
      { ja: "Shift-JIS", en: "Shift-JIS" },
      { ja: "右→左読み", en: "Right-to-left" },
      { ja: "見開き", en: "Spread view" },
      { ja: "即起動", en: "Instant open" },
      { ja: "プレイリスト", en: "Playlist" },
      { ja: "範囲連結", en: "Range chain" },
      { ja: "グループドラッグ", en: "Group drag" },
      { ja: "元に戻す", en: "Undo" },
    ],
  },
  overview: {
    eyebrow: { ja: "01 — 概要", en: "01 — OVERVIEW" },
    title: {
      ja: "読むために必要な、\nすべての機能。",
      en: "Everything you need to read.",
    },
    sub: {
      ja: "フォルダ、ZIP、PDF、プレイリスト —\nひとつのアプリに統合。",
      en: "Folders, ZIPs, PDFs, playlists — all in one app.",
    },
    items: [
      {
        t: { ja: "見開き＆1枚表示", en: "Spread & Single" },
        d: {
          ja: "2ページ見開きと1枚表示を瞬時に切替。\n漫画に最適な右→左読み。",
          en: "Two-page spread or single page.\nRight-to-left reading for manga.",
        },
      },
      {
        t: { ja: "プレイリスト", en: "Playlist" },
        d: {
          ja: "フォルダ・ZIPを範囲指定で連結。\nタグ・お気に入り・既読管理。",
          en: "Chain folders and ZIPs by range.\nTags, favorites, read status.",
        },
      },
      {
        t: { ja: "内蔵ファイルブラウザ", en: "File Browser" },
        d: {
          ja: "検索・サムネイル・リスト/グリッド切替。\nZIP内ナビもアプリ内で完結。",
          en: "Search, thumbnails, list / grid toggle.\nZIP navigation — all in-app.",
        },
      },
      {
        t: { ja: "即起動", en: "Instant open" },
        d: {
          ja: "ビューアは即座に起動。\n画像は読み進めながらオンデマンドで。",
          en: "Viewer starts instantly.\nImages load on demand.",
        },
      },
      {
        t: { ja: "ZIP・CBZ・PDF", en: "ZIP, CBZ, PDF" },
        d: {
          ja: "アーカイブとPDFを直接読み込み。\nShift-JISファイル名にも対応。",
          en: "Read archives and PDFs directly.\nShift-JIS filenames supported.",
        },
      },
      {
        t: { ja: "日本語 / English", en: "EN / JA" },
        d: {
          ja: "UI言語を日本語・英語で切替。\n設定は自動保存。",
          en: "Switch UI language.\nSaved across sessions.",
        },
      },
    ],
  },
  playlist: {
    eyebrow: { ja: "02 — プレイリスト", en: "02 — PLAYLIST" },
    title: {
      ja: "すべてを、\nひとつのサイドバーに。",
      en: "Organize everything.",
    },
    sub: {
      ja: "お気に入り、タグ、既読ステータス。\nサイドバーにすべて揃う。",
      en: "Favorites, tags, read status —\nall in the sidebar.",
    },
    bullets: [
      {
        ja: "プレイリストをスター登録。\n★フィルタで瞬時に絞込。",
        en: "Star any playlist.\n★ filter narrows instantly.",
      },
      {
        ja: "テキストタグを付与。\n#tagクリックで即絞込。",
        en: "Text tags per playlist.\nClick #tag to filter.",
      },
      {
        ja: "既読/未読の切替と、\n進捗バーを各アイテムに表示。",
        en: "Unread / read toggle with\nper-item progress bar.",
      },
      {
        ja: "ドラッグで並び替え。\nダブルクリックでその場リネーム。",
        en: "Drag to reorder.\nDouble-click to rename in place.",
      },
    ],
  },
  chunk: {
    eyebrow: { ja: "03 — 範囲指定", en: "03 — RANGE" },
    title: {
      ja: "バラバラのファイルを、\nひと続きの作品に。",
      en: "Stitch scattered files into one.",
    },
    sub: {
      ja: "差分や不要なページが混ざっていても大丈夫。\n読みたい範囲だけを抽出・連結して、\n途切れない読書体験を。",
      en: "Skip variations and clutter.\nExtract only the ranges you want\nand chain them into a seamless read.",
    },
    bullets: [
      {
        ja: "開始画像 → 終了画像で範囲を定義",
        en: "Start image → end image defines range",
      },
      {
        ja: "フォルダ/ZIPまるごと選択も可能",
        en: "Or select whole folder / ZIP",
      },
      {
        ja: "逆順指定:\n終了が開始より前 → 逆順再生",
        en: "Reverse order:\nend before start → reverse",
      },
      {
        ja: "各区間に枚数バッジ &\nサムネプレビュー",
        en: "Count badge &\nthumbnail preview per range",
      },
    ],
    group: {
      title: { ja: "複数を、まとめて動かす。", en: "Move them all at once." },
      sub: {
        ja: "複数選択 → ドラッグ。\nすべてが同時に移動。",
        en: "Multi-select → drag.\nAll move together.",
      },
      actions: [
        {
          k: { ja: "クリック", en: "Click" },
          d: { ja: "単一選択", en: "Select one" },
        },
        {
          k: { ja: "Ctrl+クリック", en: "Ctrl+Click" },
          d: { ja: "追加/除外", en: "Toggle in/out" },
        },
        {
          k: { ja: "Shift+クリック", en: "Shift+Click" },
          d: { ja: "範囲選択", en: "Range select" },
        },
        {
          k: { ja: "ドラッグ", en: "Drag" },
          d: { ja: "掃引選択", en: "Sweep select" },
        },
      ],
    },
    tools: {
      title: { ja: "ソート。分割。元に戻す。", en: "Sort. Split. Undo." },
      items: [
        {
          t: { ja: "区間をソート", en: "Sort ranges" },
          d: {
            ja: "名前・更新日・作成日で昇降順",
            en: "By name, modified, or created — asc/desc",
          },
        },
        {
          t: { ja: "サブフォルダで分割", en: "Split by subfolder" },
          d: {
            ja: "1区間をサブフォルダ単位に自動分割。\nネスト対応。",
            en: "One range → per-subfolder ranges.\nNested.",
          },
        },
        {
          t: { ja: "一括削除と復元", en: "Batch delete & undo" },
          d: {
            ja: "複数区間をまとめて削除。\nCtrl+Zで復元。",
            en: "Delete many at once.\nCtrl+Z restores.",
          },
        },
      ],
    },
  },
  browser: {
    eyebrow: { ja: "04 — ファイルブラウザ", en: "04 — FILE BROWSER" },
    title: {
      ja: "アプリを出ずに、\nファイルをブラウズ。",
      en: "Browse without leaving the app.",
    },
    sub: {
      ja: "フルスペックのファイルエクスプローラーを内蔵。",
      en: "A full file explorer, built-in.",
    },
    bullets: [
      {
        ja: "ドライブサイドバー:\n利用可能なドライブを自動表示",
        en: "Drive sidebar —\nall drives auto-listed",
      },
      {
        ja: "クイックアクセス:\nDesktop / Downloads / Documents ...",
        en: "Quick access:\nDesktop / Downloads / Documents ...",
      },
      {
        ja: "パンくずナビ / 直接パス入力 /\n検索 / List・Grid切替",
        en: "Breadcrumb or path input.\nSearch. List/Grid.",
      },
      {
        ja: "ZIP・CBZ内をそのままナビ。\nShift-JIS対応。",
        en: "Navigate into ZIP / CBZ.\nShift-JIS support.",
      },
    ],
  },
  viewer: {
    eyebrow: { ja: "05 — ビューア", en: "05 — VIEWER" },
    title: {
      ja: "漫画のために作られた、\n専用ビューア。",
      en: "A viewer built for manga.",
    },
    sub: {
      ja: "見開き。右→左。即起動。\n待ち時間ゼロ。",
      en: "Spread. RTL. Instant.\nZero wait.",
    },
    bullets: [
      {
        ja: "1枚 / 2枚見開き切替（Sキー）",
        en: "Single / two-page spread (S key)",
      },
      {
        ja: "右→左（RTL）— 日本漫画向け",
        en: "Right-to-left for Japanese manga",
      },
      {
        ja: "ページ遷移アニメーション・\nフルスクリーン（F）",
        en: "Page transition animation.\nFullscreen (F)",
      },
      {
        ja: "閲覧位置を\nプレイリストごとに自動保存",
        en: "Reading position saved\nper playlist",
      },
      {
        ja: "スマートシーク:\n現在ページ優先でサムネ生成",
        en: "Smart seek thumbnails\nprioritized from current page",
      },
    ],
    bar: {
      title: {
        ja: "現在地を、\n正確にナビゲート。",
        en: "Navigate with precision.",
      },
      sub: {
        ja: "プログレスバーが今いる場所を正確に示す。",
        en: "The progress bar tells you exactly where you are.",
      },
      items: [
        {
          t: { ja: "RTLプログレスバー", en: "RTL progress bar" },
          d: {
            ja: "ドラッグ/クリックで瞬時にジャンプ。",
            en: "Drag or click to jump anywhere.",
          },
        },
        {
          t: { ja: "区間境界マーク", en: "Range tick marks" },
          d: {
            ja: "各区間の先頭へ1クリックで移動。",
            en: "Jump to any range's first page.",
          },
        },
        {
          t: { ja: "前/次区間ボタン", en: "Prev / next range" },
          d: {
            ja: "バー両端に配置。\n中央に現区間名。",
            en: "Flanking the bar.\nCurrent range in the middle.",
          },
        },
      ],
    },
  },
  whatsnew: {
    eyebrow: { ja: "06 — v0.5.0", en: "06 — v0.5.0" },
    title: { ja: "v0.5.0の新機能。", en: "New in v0.5.0." },
    sub: {
      ja: "タグ色、ビューア内編集、\n17色パレット、ダークモード改善。",
      en: "Tag colors, in-viewer editing,\n17-color palette, dark mode polish.",
    },
    items: [
      {
        t: { ja: "タグ色システム", en: "Tag color system" },
        d: {
          ja: "各タグに色を紐付け。\nプレイリストカードが最初の色付きタグで淡く染まる。\nホバー・選択時はブルーに切替。",
          en: "Link a color to each tag.\nPlaylist cards tint with the first colored tag.\nHover and selection switch to blue.",
        },
      },
      {
        t: { ja: "ビューア内編集", en: "In-viewer editing" },
        d: {
          ja: "ビューアを開いたまま右スライドインの\nサイドバーで追加・編集・削除・並び替え・分割。\n変更後も閲覧位置は保持。",
          en: "A right-slide-in sidebar adds, edits,\ndeletes, reorders, and splits ranges\nwithout leaving the reader.",
        },
      },
      {
        t: { ja: "17色パレット", en: "17-color palette" },
        d: {
          ja: "ブルー系・グリーン系・ウォーム系・\nパープル系・ニュートラル系を網羅。\nタグ追加と同じパネルで色を選択。",
          en: "Blues, greens, warms,\npurples, neutrals — all in one.\nPick a color where you add a tag.",
        },
      },
      {
        t: {
          ja: "ダークモード改善 &\n日本語インストーラー",
          en: "Dark mode polish &\nJP installer",
        },
        d: {
          ja: "選択時の白文字問題を解消。\nNSISに日本語セレクタ、\n%LOCALAPPDATA%にユーザー単位でインストール。",
          en: "White-on-white selection fixed.\nNSIS ships a JP selector and installs\nper-user to %LOCALAPPDATA%.",
        },
      },
    ],
  },
  formats: {
    eyebrow: { ja: "07 — フォーマット", en: "07 — FORMATS" },
    title: { ja: "何でも、\nそのまま読める。", en: "Read anything." },
    list: [
      "ZIP",
      "CBZ",
      "PDF",
      "JPG",
      "PNG",
      "WEBP",
      "GIF",
      "BMP",
      "AVIF",
      "JP2",
      "Shift-JIS",
    ],
  },
  shortcuts: {
    eyebrow: { ja: "08 — ショートカット", en: "08 — SHORTCUTS" },
    title: {
      ja: "マウスなしで、\nすべての操作を。",
      en: "Navigate entirely\nwithout a mouse.",
    },
    sub: { ja: "キーボード完結。", en: "Keyboard first." },
    groups: [
      {
        t: { ja: "ページ操作", en: "Page navigation" },
        rows: [
          {
            k: ["←", "↑", "PgDn"],
            a: { ja: "次ページ", en: "Next page" },
          },
          {
            k: ["→", "↓", "PgUp"],
            a: { ja: "前ページ", en: "Previous page" },
          },
          { k: ["Home"], a: { ja: "先頭", en: "First page" } },
          { k: ["End"], a: { ja: "最終", en: "Last page" } },
          {
            k: ["Scroll ↓↑"],
            a: { ja: "次 / 前ページ", en: "Next / prev page" },
            mouse: true,
          },
        ],
      },
      {
        t: { ja: "表示・画面", en: "View & screen" },
        rows: [
          { k: ["S"], a: { ja: "1枚 / 見開き", en: "Single / spread" } },
          { k: ["F"], a: { ja: "フルスクリーン", en: "Fullscreen" } },
          { k: ["Esc"], a: { ja: "解除 / ホーム", en: "Exit / Home" } },
          {
            k: ["Click left"],
            a: { ja: "次ページ", en: "Next page" },
            mouse: true,
          },
          {
            k: ["Click right"],
            a: { ja: "前ページ", en: "Previous page" },
            mouse: true,
          },
        ],
      },
      {
        t: { ja: "プレイリスト・区間", en: "Playlist & ranges" },
        rows: [
          {
            k: ["[", "]"],
            a: { ja: "前 / 次区間", en: "Prev / next range" },
          },
          { k: ["F2"], a: { ja: "リネーム", en: "Rename" } },
          { k: ["Delete"], a: { ja: "削除", en: "Delete" } },
          { k: ["Ctrl+Z"], a: { ja: "元に戻す", en: "Undo" } },
        ],
      },
    ],
  },
  download: {
    title: { ja: "さあ、読み始めよう。", en: "Start reading." },
    sub: {
      ja: "Windows 10 / 11 (x64) 対応。\n無料・オープンソース。",
      en: "Windows 10 / 11 (x64).\nFree & open source.",
    },
    cta: { ja: "Windows版をダウンロード", en: "Download for Windows" },
    sys: {
      ja: "Windows 10 / 11 · x64 · MIT",
      en: "Windows 10 / 11 · x64 · MIT",
    },
    note: {
      ja: "※未署名のためSmartScreen警告が出る場合があります",
      en: "Note: SmartScreen may warn as this app is unsigned",
    },
  },
};

const LangCtx = createContext({ lang: "ja", setLang: () => {} });
function T({ k, children }) {
  const { lang } = useContext(LangCtx);
  if (typeof k === "object" && k) return k[lang] ?? k.en ?? "";
  return children?.[lang] ?? children?.en ?? children;
}
window.COPY = COPY;
window.LangCtx = LangCtx;
window.T = T;
