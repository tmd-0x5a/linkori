"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { browseDirectory, browseZip, readImageAsDataUrl, listDrives } from "@/lib/tauri";
import type { FileEntry } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { useT } from "@/hooks/useT";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Location {
  path: string;
  name: string;
  isZip: boolean;
}

export interface FileBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** 選択が確定したときに呼ばれるコールバック */
  onSelect: (path: string) => void;
  /**
   * 開いた直後にジャンプするパス（オプション）。
   * - ZIP ファイルパスを渡すと直接その ZIP 内を表示する
   * - ディレクトリパスを渡すとそのフォルダを表示する
   */
  initialPath?: string;
  /**
   * このパス内のみ選択を許可する（終了パス選択時など）。
   * 設定するとサイドバー・アドレスバー編集が無効になり、このフォルダより上へは移動できない。
   */
  restrictToDir?: string;
}

// ---------------------------------------------------------------------------
// モジュールレベルでソート/表示モードを永続化（ダイアログ再マウント後も維持）
// ---------------------------------------------------------------------------
let _savedSortField: "name" | "date" = "name";
let _savedSortDir: "asc" | "desc" = "asc";
let _savedViewMode: "list" | "grid" = "list";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ZIP内部パスを除いてZIPファイルパス（またはディレクトリパス）までを返す */
function extractZipFilePath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  for (const ext of [".zip/", ".cbz/"]) {
    const idx = lower.indexOf(ext);
    if (idx !== -1) return normalized.slice(0, idx + ext.length - 1);
  }
  return normalized;
}

/** パス文字列から Location を構築するヘルパー */
function pathToLocation(path: string): Location {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const name = normalized.split("/").filter(Boolean).pop() || normalized;
  const lower = normalized.toLowerCase();
  // ZIPファイル自体（末尾が .zip/.cbz）か
  // ZIP内部パス（パスの途中に .zip/ や .cbz/ が含まれる）かをチェック
  const isZip =
    lower.endsWith(".zip") ||
    lower.endsWith(".cbz") ||
    lower.includes(".zip/") ||
    lower.includes(".cbz/");
  return { path: normalized, name, isZip };
}

/**
 * パス文字列をルートから目的地まで分解して Location スタックを構築する。
 * 直接ジャンプしたときもパンくずにフルパスが表示されるようにするため。
 */
function buildLocationStack(path: string): Location[] {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);
  const stack: Location[] = [];
  for (let i = 0; i < segments.length; i++) {
    const partial = segments.slice(0, i + 1).join("/");
    stack.push(pathToLocation(partial));
  }
  return stack;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FileBrowserDialog({
  isOpen,
  onClose,
  onSelect,
  initialPath,
  restrictToDir,
}: FileBrowserDialogProps) {
  const t = useT();
  const [locationStack, setLocationStack] = useState<Location[]>([]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [addressInput, setAddressInput] = useState("");
  const [addressEditing, setAddressEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drives, setDrives] = useState<string[]>([]);
  // ソート（モジュールレベル変数から初期値を取得して再マウント後も維持）
  const [sortField, setSortField] = useState<"name" | "date">(_savedSortField);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(_savedSortDir);
  // 表示モード（同上）
  const [viewMode, setViewMode] = useState<"list" | "grid">(_savedViewMode);
  // 1=前進（フォルダへ入る）, -1=後退
  const [navDir, setNavDir] = useState<1 | -1>(1);

  // restrictToDir の正規化
  const normalizedRestrictDir = restrictToDir?.replace(/\\/g, "/").replace(/\/+$/, "");

  const currentLocation =
    locationStack.length > 0 ? locationStack[locationStack.length - 1] : null;

  // ロケーション変更時に読み込み
  const loadLocation = useCallback(async (loc: Location) => {
    setIsLoading(true);
    setError(null);
    setSearchQuery("");
    try {
      const result = loc.isZip
        ? await browseZip(loc.path)
        : await browseDirectory(loc.path);
      setEntries(result);
    } catch (e) {
      setError(String(e));
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentLocation) {
      // ZIP内部パスはアドレスバーに表示しない（文字化けするため）
      // ZIPファイル自体のパスまでを表示する
      setAddressInput(extractZipFilePath(currentLocation.path));
      loadLocation(currentLocation);
    }
  }, [currentLocation, loadLocation]);

  // initialPath / restrictToDir を常に最新値として ref に保持（isOpen 変化時に読み取る）
  const initialPathRef = useRef(initialPath);
  const restrictToDirRef = useRef(restrictToDir);
  useEffect(() => {
    initialPathRef.current = initialPath;
    restrictToDirRef.current = restrictToDir;
  });

  // ダイアログが開いたとき（initialPath/restrictToDir は依存配列に含めず、開いた瞬間の値のみ使う）
  useEffect(() => {
    if (isOpen) {
      listDrives().then(setDrives).catch(() => setDrives([]));
      const restricted = restrictToDirRef.current?.replace(/\\/g, "/").replace(/\/+$/, "");
      if (restricted) {
        // restrictToDir が設定されている場合: 親ディレクトリを含まない単一エントリで初期化する。
        // buildLocationStack を使うと親がスタックに入りパンくずクリックで上へ戻れてしまうため。
        setNavDir(1);
        setLocationStack([pathToLocation(restricted)]);
      } else if (initialPathRef.current) {
        setNavDir(1);
        setLocationStack(buildLocationStack(initialPathRef.current));
      }
    } else {
      setLocationStack([]);
      setEntries([]);
      setError(null);
      setAddressInput("");
      setSearchQuery("");
      setAddressEditing(false);
    }
  }, [isOpen]);

  // ----------------------------------------
  // Navigation helpers
  // ----------------------------------------

  function navigateInto(entry: FileEntry) {
    setNavDir(1);
    setLocationStack((prev) => [
      ...prev,
      { path: entry.path, name: entry.name, isZip: entry.is_zip },
    ]);
  }

  function goBack() {
    if (locationStack.length === 0) return;
    // restrictToDir が設定されている場合、そこより上には戻れない
    if (normalizedRestrictDir && currentLocation?.path === normalizedRestrictDir) return;

    if (locationStack.length === 1) {
      const current = locationStack[0];
      const normalized = current.path.replace(/\\/g, "/").replace(/\/+$/, "");
      const lastSlash = normalized.lastIndexOf("/");
      if (lastSlash > 0) {
        const parentPath = normalized.slice(0, lastSlash);
        setNavDir(-1);
        setLocationStack([pathToLocation(parentPath)]);
        return;
      }
      // "D:" のようにスラッシュがない → ルート画面へ
      setNavDir(-1);
      setLocationStack([]);
      return;
    }

    setNavDir(-1);
    setLocationStack((prev) => prev.slice(0, -1));
  }

  function navigateToDrive(drive: string) {
    const path = drive.replace(/\/$/, "");
    setNavDir(1);
    setLocationStack([{ path, name: drive, isZip: false }]);
  }

  function handleAddressSubmit() {
    const raw = addressInput.trim();
    if (!raw) return;
    const path = raw.replace(/\\/g, "/").replace(/\/+$/, "");
    setNavDir(1);
    setLocationStack([pathToLocation(path)]);
    setAddressEditing(false);
  }

  // ----------------------------------------
  // Selection
  // ----------------------------------------

  function confirmSelect(path: string) {
    onSelect(path);
    onClose();
  }

  // ----------------------------------------
  // フィルタリング＆ソート
  // ----------------------------------------

  function toggleSort(field: "name" | "date") {
    if (sortField === field) {
      const nd = sortDir === "asc" ? "desc" : "asc";
      setSortDir(nd);
      _savedSortDir = nd;
    } else {
      setSortField(field);
      _savedSortField = field;
      setSortDir("asc");
      _savedSortDir = "asc";
    }
  }

  function changeViewMode(mode: "list" | "grid") {
    setViewMode(mode);
    _savedViewMode = mode;
  }

  const filteredEntries = entries
    .filter((e) => showHidden || !e.is_hidden)
    .filter(
      (e) =>
        !searchQuery.trim() ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice()
    .sort((a, b) => {
      // フォルダ優先（フォルダ同士、ファイル同士でソート）
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name, "ja", { numeric: true, sensitivity: "base" });
      } else {
        const at = a.modified_at ?? 0;
        const bt = b.modified_at ?? 0;
        cmp = at - bt;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  if (!isOpen) return null;

  const slideVariants: Variants = {
    enter: (dir: number) => ({ x: dir * 30, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: -dir * 30, opacity: 0 }),
  };

  const canGoBack = locationStack.length > 0 &&
    (!normalizedRestrictDir || currentLocation?.path !== normalizedRestrictDir);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="flex h-[88vh] w-[92vw] max-w-5xl flex-col rounded-2xl border border-[#dad4c8] bg-white shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px] overflow-hidden"
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* ── ツールバー ── */}
            <div className="flex shrink-0 items-center gap-2 border-b border-[#dad4c8] bg-[#faf9f7] px-3 py-2">
              {/* 戻るボタン */}
              <button
                type="button"
                onClick={goBack}
                disabled={!canGoBack}
                className="flex h-7 w-7 items-center justify-center rounded text-[#9f9b93] transition-colors hover:bg-[#eee9df] hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
                title={t.back}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              {/* アドレスバー */}
              <div className="flex flex-1 items-center min-w-0">
                {addressEditing && !normalizedRestrictDir ? (
                  <input
                    autoFocus
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddressSubmit();
                      if (e.key === "Escape") setAddressEditing(false);
                    }}
                    onBlur={() => setAddressEditing(false)}
                    className="h-7 w-full rounded-[4px] border border-[rgb(20,110,245)] bg-white px-2 text-sm text-black focus:outline-[rgb(20,110,245)_solid_2px]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={normalizedRestrictDir ? undefined : () => setAddressEditing(true)}
                    className={cn(
                      "flex h-7 min-w-0 flex-1 items-center gap-1 truncate rounded border border-[#dad4c8] bg-white px-2 text-left text-sm text-[#333333]",
                      !normalizedRestrictDir && "transition-colors hover:bg-[#eee9df]",
                      normalizedRestrictDir && "cursor-default"
                    )}
                    title={normalizedRestrictDir ? undefined : t.clickToEnterPath}
                  >
                    {/* パンくず */}
                    {currentLocation ? (
                      <span className="truncate">
                        {locationStack.map((loc, i) => (
                          <span key={i}>
                            {i > 0 && <span className="mx-1 text-[#dad4c8]">&gt;</span>}
                            <span
                              className={cn(
                                "cursor-pointer",
                                i === locationStack.length - 1
                                  ? "text-black"
                                  : "text-[#9f9b93] hover:text-black"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (i < locationStack.length - 1) {
                                  setNavDir(-1);
                                  setLocationStack((prev) => prev.slice(0, i + 1));
                                }
                              }}
                            >
                              {loc.name}
                            </span>
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-[#9f9b93]">{t.addressBarPlaceholder}</span>
                    )}
                  </button>
                )}
              </div>

              {/* 検索ボックス */}
              <div className="relative shrink-0">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="h-7 w-36 rounded-[4px] border border-[#dad4c8] bg-white pl-7 pr-6 text-xs text-black placeholder:text-[#9f9b93] focus:outline-[rgb(20,110,245)_solid_2px] transition-colors"
                />
                <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9f9b93] pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#9f9b93] hover:text-black"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              {/* 表示モード切り替え */}
              <div className="flex shrink-0 overflow-hidden rounded border border-[#dad4c8]">
                <button
                  type="button"
                  onClick={() => changeViewMode("list")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center transition-colors",
                    viewMode === "list" ? "bg-[#eee9df] text-black" : "text-[#9f9b93] hover:bg-[#eee9df] hover:text-black"
                  )}
                  title={t.listView}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => changeViewMode("grid")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center border-l border-[#dad4c8] transition-colors",
                    viewMode === "grid" ? "bg-[#eee9df] text-black" : "text-[#9f9b93] hover:bg-[#eee9df] hover:text-black"
                  )}
                  title={t.gridView}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                </button>
              </div>

              {/* フォルダ制限バッジ */}
              {normalizedRestrictDir && (
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#fbbd41] bg-[#fff9ec] px-2 py-0.5 text-[10px] font-semibold text-[#9a6c00]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {t.restrictedFolder}
                </span>
              )}

              {/* 隠しファイルトグル */}
              <button
                type="button"
                onClick={() => setShowHidden((v) => !v)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded transition-colors",
                  showHidden
                    ? "bg-[#eee9df] text-black"
                    : "text-[#9f9b93] hover:bg-[#eee9df] hover:text-black"
                )}
                title={showHidden ? t.hideHiddenFiles : t.showHiddenFiles}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showHidden ? (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  ) : (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  )}
                </svg>
              </button>

              {/* 閉じるボタン */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded text-[#9f9b93] transition-colors hover:bg-[#eee9df] hover:text-black"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* ── メインエリア（サイドバー＋コンテンツ） ── */}
            <div className="flex min-h-0 flex-1 overflow-hidden">

              {/* ── 左サイドバー（ドライブ一覧・ダーク）：フォルダ制限時は非表示 ── */}
              {!normalizedRestrictDir && <div className="flex w-36 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-[#02492a] bg-[#02492a] p-2">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#84e7a5]/60">
                  {t.pc}
                </p>
                {drives.map((drive) => {
                  const drivePath = drive.replace(/\/$/, "");
                  const isActive = currentLocation?.path === drivePath ||
                    currentLocation?.path.startsWith(drivePath + "/");
                  return (
                    <button
                      type="button"
                      key={drive}
                      onClick={() => navigateToDrive(drive)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                        isActive
                          ? "bg-[#078a52] text-[#84e7a5]"
                          : "text-[#84e7a5]/70 hover:bg-[#078a52]/60 hover:text-white"
                      )}
                    >
                      <svg className="shrink-0 text-[#84e7a5]/50" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <path d="M6 12h.01M10 12h.01" />
                        <circle cx="17" cy="12" r="1" fill="currentColor" />
                      </svg>
                      <span className="truncate font-medium">{drive}</span>
                    </button>
                  );
                })}
              </div>}

              {/* ── コンテンツエリア ── */}
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

                {/* ルート画面（ドライブ未選択時） */}
                {!currentLocation && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
                    <div className="text-center">
                      <p className="heading-clay text-xl text-black">
                        {t.selectDriveOrFolder}
                      </p>
                      <p className="mt-2 text-sm text-[#9f9b93] leading-relaxed">
                        {t.selectDriveDesc}
                      </p>
                    </div>
                    <div className="flex w-full max-w-md gap-2">
                      <Input
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddressSubmit()}
                        placeholder={t.pathInputPlaceholder}
                      />
                      <Button
                        variant="primary"
                        onClick={handleAddressSubmit}
                        disabled={!addressInput.trim()}
                      >
                        {t.open}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ファイルリスト */}
                {currentLocation && (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

                    {/* カラムヘッダー（リストモードのみ） */}
                    {viewMode === "list" && (
                      <div className="flex shrink-0 items-center border-b border-[#dad4c8] bg-[#faf9f7] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#9f9b93] select-none">
                        <button
                          type="button"
                          className="flex flex-1 items-center gap-1 hover:text-black transition-colors"
                          onClick={() => toggleSort("name")}
                        >
                          {t.colName}
                          {sortField === "name" && (
                            <SortIcon dir={sortDir} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="flex w-36 items-center justify-end gap-1 hover:text-black transition-colors"
                          onClick={() => toggleSort("date")}
                        >
                          {sortField === "date" && (
                            <SortIcon dir={sortDir} />
                          )}
                          {t.colModified}
                        </button>
                        <span className="w-20 text-right">{t.colType}</span>
                      </div>
                    )}

                    {/* コンテンツ本体 */}
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      <AnimatePresence mode="wait" custom={navDir}>
                        <motion.div
                          key={currentLocation.path}
                          custom={navDir}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="min-h-full"
                        >
                          {/* ローディング */}
                          {isLoading && (
                            <div className="flex h-40 items-center justify-center gap-3">
                              <div
                                className="size-5 rounded-full border-2 border-[#dad4c8] border-t-[#078a52]"
                                style={{ animation: "spin 0.8s linear infinite" }}
                              />
                              <p className="text-xs text-[#9f9b93]">{t.loading}</p>
                            </div>
                          )}

                          {/* エラー */}
                          {!isLoading && error && (
                            <div className="m-3 rounded-xl border border-[#fc7981]/30 bg-[#fc7981]/10 p-3 text-sm text-[#e05560]">
                              {error}
                            </div>
                          )}

                          {/* エントリ一覧 */}
                          {!isLoading && !error && (
                            <>
                              {filteredEntries.length === 0 ? (
                                <div className="flex h-40 items-center justify-center text-sm text-[#9f9b93]">
                                  {searchQuery ? t.noResults : t.emptyFolder}
                                </div>
                              ) : viewMode === "list" ? (
                                filteredEntries.map((entry) => (
                                  <FileRow
                                    key={entry.path}
                                    entry={entry}
                                    onNavigate={() => navigateInto(entry)}
                                    onSelect={() => confirmSelect(entry.path)}
                                  />
                                ))
                              ) : (
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 p-3">
                                  {filteredEntries.map((entry) => (
                                    <GridCard
                                      key={entry.path}
                                      entry={entry}
                                      onNavigate={() => navigateInto(entry)}
                                      onSelect={() => confirmSelect(entry.path)}
                                    />
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── フッター ── */}
            <div className="flex shrink-0 items-center justify-between border-t border-[#dad4c8] bg-[#faf9f7] px-4 py-2.5">
              <div className="flex items-center gap-2">
                {currentLocation && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => confirmSelect(currentLocation.path)}
                  >
                    {currentLocation.isZip ? t.selectThisZip : t.selectThisFolder}
                  </Button>
                )}
                <p className="text-xs text-[#9f9b93]">
                  {t.helpText}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t.cancel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// ソートアイコン
// ---------------------------------------------------------------------------

function SortIcon({ dir }: { dir: "asc" | "desc" }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[#078a52]">
      {dir === "asc" ? (
        <polyline points="18 15 12 9 6 15" />
      ) : (
        <polyline points="6 9 12 15 18 9" />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 日時フォーマット
// ---------------------------------------------------------------------------

function formatDate(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${h}:${min}`;
}

// ---------------------------------------------------------------------------
// FileRow（エクスプローラー風の行）
// ---------------------------------------------------------------------------

interface FileRowProps {
  entry: FileEntry;
  onNavigate: () => void;
  onSelect: () => void;
}

function FileRow({ entry, onNavigate, onSelect }: FileRowProps) {
  const t = useT();
  const isNavigable = entry.is_dir || entry.is_zip;
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!entry.is_image) return;
    let cancelled = false;
    readImageAsDataUrl(entry.path)
      .then((url) => { if (!cancelled) setImgSrc(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [entry.path, entry.is_image]);

  const typeLabel = entry.is_dir
    ? t.folderType
    : entry.is_zip
    ? t.zipType
    : entry.is_image
    ? (entry.name.split(".").pop()?.toUpperCase() ?? t.imageType)
    : "";

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-3 border-b border-[#eee9df] px-3 py-1.5 transition-colors hover:bg-[#eee9df]",
        entry.is_hidden && "opacity-50"
      )}
      onClick={isNavigable ? onNavigate : onSelect}
      title={entry.path}
    >
      {/* アイコン or サムネイル */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={entry.name} className="h-full w-full object-contain" />
        ) : entry.is_dir ? (
          <svg className="text-amber-500" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.59 4.59A2 2 0 0 0 9.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-1.41-1.41z" />
          </svg>
        ) : entry.is_zip ? (
          <svg className="text-green-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <rect x="10" y="9" width="4" height="3" rx="0.5" />
            <line x1="12" y1="13" x2="12" y2="18" />
          </svg>
        ) : (
          <svg className="text-[#078a52]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )}
      </div>

      {/* ファイル名 */}
      <span className="flex-1 truncate text-sm text-[#333333] group-hover:text-black">
        {entry.name}
      </span>

      {/* 更新日時 */}
      <span className="w-36 shrink-0 text-right text-xs text-[#9f9b93]">
        {formatDate(entry.modified_at)}
      </span>

      {/* 種類 */}
      <span className="w-20 shrink-0 text-right text-xs text-[#9f9b93]">
        {typeLabel}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GridCard（グリッド表示）
// ---------------------------------------------------------------------------

interface GridCardProps {
  entry: FileEntry;
  onNavigate: () => void;
  onSelect: () => void;
}

function GridCard({ entry, onNavigate, onSelect }: GridCardProps) {
  const isNavigable = entry.is_dir || entry.is_zip;
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!entry.is_image) return;
    let cancelled = false;
    readImageAsDataUrl(entry.path)
      .then((url) => { if (!cancelled) setImgSrc(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [entry.path, entry.is_image]);

  return (
    <div
      className={cn(
        "group flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-[#dad4c8] bg-white p-2 transition-colors hover:border-[#078a52] hover:bg-[#eee9df]",
        entry.is_hidden && "opacity-50"
      )}
      onClick={isNavigable ? onNavigate : onSelect}
      title={entry.path}
    >
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded bg-[#faf9f7]">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={entry.name} className="h-full w-full object-contain" />
        ) : entry.is_dir ? (
          <svg className="text-amber-500" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.59 4.59A2 2 0 0 0 9.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-1.41-1.41z" />
          </svg>
        ) : entry.is_zip ? (
          <svg className="text-green-600" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <rect x="10" y="9" width="4" height="3" rx="0.5" />
            <line x1="12" y1="13" x2="12" y2="18" />
          </svg>
        ) : (
          <svg className="text-[#078a52]" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )}
      </div>
      <span className="w-full truncate text-center text-[11px] leading-tight text-[#9f9b93] group-hover:text-black">
        {entry.name}
      </span>
    </div>
  );
}
