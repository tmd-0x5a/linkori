"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useViewerStore } from "@/stores/viewerStore";
import { readImageAsDataUrl, readImageThumbnail } from "@/lib/tauri";
import { isPdfPagePath, parsePdfPagePath, renderPdfPage, renderPdfThumbnail, clearPdfCache } from "@/lib/pdf";
import { cn } from "@/lib/cn";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useT } from "@/hooks/useT";

interface ViewerCanvasProps {
  onBack: () => void;
}

export function ViewerCanvas({ onBack }: ViewerCanvasProps) {
  const t = useT();
  const {
    flatImageList,
    currentPageIndex,
    totalPages,
    isLoading,
    loadError,
    chunkWarning,
    settings,
    chunkBoundaries,
    nextSpread,
    prevSpread,
    goToPage,
    goToFirst,
    goToLast,
    nextChunk,
    prevChunk,
    updateSettings,
    dismissWarning,
  } = useViewerStore();

  // 現在いるチャンクのインデックスを算出
  const currentChunkBoundary = [...chunkBoundaries].reverse().find(
    (b) => b.startPage <= currentPageIndex
  ) ?? chunkBoundaries[0];

  // フルスクリーン状態
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isFullscreenRef = useRef(false);

  const toggleFullscreen = useCallback(async () => {
    const win = getCurrentWindow();
    const next = !isFullscreenRef.current;
    await win.setFullscreen(next);
    isFullscreenRef.current = next;
    setIsFullscreen(next);
  }, []);

  useEffect(() => {
    return () => {
      if (isFullscreenRef.current) {
        getCurrentWindow().setFullscreen(false).catch(() => {});
        isFullscreenRef.current = false;
      }
      // NOTE: clearPdfCache() はここでは呼ばない。
      // React Strict Mode の二重マウント時にクリーンアップが走ると、
      // 進行中の page.render() が破棄されて最初の数ページが失敗するため。
      // キャッシュのクリアは handleBack() で行う。
    };
  }, []);

  // ホームへ戻る（PDF キャッシュをここでクリアする）
  const handleBack = useCallback(() => {
    clearPdfCache();
    onBack();
  }, [onBack]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState(0);
  const prevIndexRef = useRef(currentPageIndex);
  const shouldReduceMotion = useReducedMotion();

  // シークバーホバー
  const [hoverInfo, setHoverInfo] = useState<{ pageIndex: number; x: number } | null>(null);

  // path → data URL キャッシュ（ビューア画像用）
  const imageCacheRef = useRef<Map<string, string>>(new Map());
  const failedPathsRef = useRef<Set<string>>(new Set());
  const loadingPathsRef = useRef<Set<string>>(new Set());
  // PDF ページのリトライ回数（最大 3 回）
  const pdfRetryCountRef = useRef<Map<string, number>>(new Map());
  const [, forceUpdate] = useState(0);

  // サムネイル専用キャッシュ（低品質・小サイズで高速）
  const thumbCacheRef = useRef<Map<string, string>>(new Map());
  const thumbLoadingRef = useRef<Set<string>>(new Set());
  const [thumbTick, setThumbTick] = useState(0);

  // キャッシュ保持ウィンドウ
  const CACHE_BEHIND = 6;
  const CACHE_AHEAD = 10;

  // flatImageList が変わったらキャッシュクリア
  const prevListIdRef = useRef("");
  const listId = flatImageList.length > 0 ? `${flatImageList.length}:${flatImageList[0]}` : "";
  if (listId !== prevListIdRef.current) {
    if (prevListIdRef.current !== "") {
      imageCacheRef.current.clear();
      failedPathsRef.current.clear();
      loadingPathsRef.current.clear();
      pdfRetryCountRef.current.clear();
      thumbCacheRef.current.clear();
      thumbLoadingRef.current.clear();
    }
    prevListIdRef.current = listId;
  }

  // メイン画像読み込み（ガード付きで毎レンダー実行）
  // loadingPathsRef で重複リクエスト防止
  if (flatImageList.length > 0) {
    const step = settings.spreadMode ? 2 : 1;
    for (let i = currentPageIndex; i < Math.min(currentPageIndex + step * 3, flatImageList.length); i++) {
      const path = flatImageList[i];
      if (!path || imageCacheRef.current.has(path) || failedPathsRef.current.has(path) || loadingPathsRef.current.has(path)) continue;
      loadingPathsRef.current.add(path);

      // PDF ページか通常画像かで読み込み方法を分岐
      const loadPromise = isPdfPagePath(path)
        ? (() => {
            const parsed = parsePdfPagePath(path);
            if (!parsed) return Promise.reject(new Error("PDFパスの解析に失敗しました"));
            return renderPdfPage(parsed.pdfPath, parsed.pageNum);
          })()
        : readImageAsDataUrl(path);

      loadPromise
        .then((url) => {
          imageCacheRef.current.set(path, url);
          loadingPathsRef.current.delete(path);
          pdfRetryCountRef.current.delete(path);
          // キャッシュウィンドウ外を削除
          const ci = useViewerStore.getState().currentPageIndex;
          for (const [p] of imageCacheRef.current) {
            const pIdx = flatImageList.indexOf(p);
            if (pIdx !== -1 && (pIdx < ci - CACHE_BEHIND || pIdx > ci + CACHE_AHEAD)) {
              imageCacheRef.current.delete(p);
            }
          }
          forceUpdate(n => n + 1);
        })
        .catch(() => {
          loadingPathsRef.current.delete(path);
          // PDF ページは一時的な失敗（ワーカー未初期化など）が起こりうるためリトライする
          if (isPdfPagePath(path)) {
            const retries = pdfRetryCountRef.current.get(path) ?? 0;
            if (retries < 3) {
              pdfRetryCountRef.current.set(path, retries + 1);
              // 指数バックオフ: 300ms, 600ms, 1200ms
              setTimeout(() => forceUpdate(n => n + 1), 300 * Math.pow(2, retries));
            } else {
              failedPathsRef.current.add(path);
              forceUpdate(n => n + 1);
            }
          } else {
            failedPathsRef.current.add(path);
            forceUpdate(n => n + 1);
          }
        });
    }
  }

  // メイン画像キャッシュからcanvasリサイズでサムネ即時生成
  const generateThumbFromCache = useCallback((path: string, dataUrl: string, size: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(size / img.width, size / img.height, 1);
        const w = Math.round(img.width * scale) || 1;
        const h = Math.round(img.height * scale) || 1;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.3));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }, []);

  // サムネイルを現在ページ付近から外側に向かってプリフェッチ
  const thumbPrefetchPageRef = useRef(0);
  useEffect(() => {
    thumbPrefetchPageRef.current = currentPageIndex;
  }, [currentPageIndex]);

  useEffect(() => {
    if (flatImageList.length === 0) return;

    let stopped = false;
    const THUMB_SIZE = 80;
    const BATCH = 4;

    // 現在ページから外側に広がるインデックス順を生成
    function buildOrder(center: number, total: number): number[] {
      const order: number[] = [];
      const seen = new Set<number>();
      // まず中心付近を優先
      for (let d = 0; d < total; d++) {
        for (const idx of [center + d, center - d]) {
          if (idx >= 0 && idx < total && !seen.has(idx)) {
            seen.add(idx);
            order.push(idx);
          }
        }
      }
      return order;
    }

    async function run() {
      const center = thumbPrefetchPageRef.current;
      const order = buildOrder(center, flatImageList.length);

      for (let bStart = 0; bStart < order.length; bStart += BATCH) {
        if (stopped) break;
        const batch: string[] = [];
        for (let j = bStart; j < Math.min(bStart + BATCH, order.length); j++) {
          const p = flatImageList[order[j]];
          if (p && !thumbCacheRef.current.has(p) && !thumbLoadingRef.current.has(p)) {
            batch.push(p);
          }
        }
        if (batch.length === 0) continue;
        batch.forEach(p => thumbLoadingRef.current.add(p));
        await Promise.all(batch.map(async (p) => {
          try {
            // メイン画像キャッシュにあればcanvasリサイズ（即時、IPC不要）
            const cached = imageCacheRef.current.get(p);
            if (cached) {
              const url = await generateThumbFromCache(p, cached, THUMB_SIZE);
              if (!stopped) thumbCacheRef.current.set(p, url);
            } else if (isPdfPagePath(p)) {
              // PDF ページのサムネイルは pdf.js で直接レンダリング
              const parsed = parsePdfPagePath(p);
              if (parsed) {
                const url = await renderPdfThumbnail(parsed.pdfPath, parsed.pageNum, THUMB_SIZE);
                if (!stopped) thumbCacheRef.current.set(p, url);
              }
            } else {
              const url = await readImageThumbnail(p, THUMB_SIZE);
              if (!stopped) thumbCacheRef.current.set(p, url);
            }
          } catch {
            // サムネ失敗は無視
          } finally {
            thumbLoadingRef.current.delete(p);
          }
        }));
        if (!stopped) setThumbTick(n => n + 1);
      }
    }

    run();
    return () => { stopped = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, generateThumbFromCache]);

  useEffect(() => {
    if (currentPageIndex !== prevIndexRef.current) {
      setDirection(currentPageIndex > prevIndexRef.current ? 1 : -1);
      prevIndexRef.current = currentPageIndex;
    }
  }, [currentPageIndex]);

  const variants = {
    enter: (dir: number) => {
      if (!settings.pageTransition || shouldReduceMotion) return { opacity: 0, x: 0 };
      const sign = settings.rightToLeft ? -1 : 1;
      return { x: dir * sign * 40, opacity: 0 };
    },
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => {
      if (!settings.pageTransition || shouldReduceMotion) return { opacity: 0, x: 0 };
      const sign = settings.rightToLeft ? -1 : 1;
      return { x: -dir * sign * 40, opacity: 0 };
    },
  };

  // キーボードナビゲーション
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          nextSpread();
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          prevSpread();
          break;
        case " ":
          e.preventDefault();
          if (e.shiftKey) prevSpread();
          else nextSpread();
          break;
        case "PageDown":
          e.preventDefault();
          nextSpread();
          break;
        case "PageUp":
          e.preventDefault();
          prevSpread();
          break;
        case "Home":
          e.preventDefault();
          goToFirst();
          break;
        case "End":
          e.preventDefault();
          goToLast();
          break;
        case "s":
        case "S":
          e.preventDefault();
          updateSettings({ spreadMode: !settings.spreadMode });
          break;
        case "[":
          e.preventDefault();
          nextChunk();
          break;
        case "]":
          e.preventDefault();
          prevChunk();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Escape":
          e.preventDefault();
          if (isFullscreenRef.current) {
            toggleFullscreen();
          } else {
            handleBack();
          }
          break;
      }
    },
    [settings, nextSpread, prevSpread, goToFirst, goToLast, handleBack, updateSettings, prevChunk, nextChunk, toggleFullscreen]
  );

  const lastWheelTime = useRef(0);
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime.current < 300) return;
      lastWheelTime.current = now;
      if (e.deltaY > 0) nextSpread();
      else prevSpread();
    },
    [nextSpread, prevSpread]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [handleKeyDown, handleWheel]);

  function handleClick(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const isLeftHalf = clickX < rect.width / 2;

    if (settings.rightToLeft) {
      if (isLeftHalf) nextSpread();
      else prevSpread();
    } else {
      if (isLeftHalf) prevSpread();
      else nextSpread();
    }
  }

  type SlotState = { url: string } | { failed: true } | { loading: true };

  function resolveSlot(path: string | undefined): SlotState | null {
    if (!path) return null;
    if (failedPathsRef.current.has(path)) return { failed: true };
    const url = imageCacheRef.current.get(path);
    if (url) return { url };
    return { loading: true };
  }

  function getCurrentSlots(): SlotState[] {
    if (totalPages === 0) return [];

    if (settings.spreadMode) {
      const slots: SlotState[] = [];
      const s0 = resolveSlot(flatImageList[currentPageIndex]);
      if (s0 !== null) slots.push(s0);
      const s1 = currentPageIndex + 1 < totalPages
        ? resolveSlot(flatImageList[currentPageIndex + 1])
        : null;
      if (s1 !== null) slots.push(s1);
      return settings.rightToLeft ? slots.reverse() : slots;
    } else {
      const s = resolveSlot(flatImageList[currentPageIndex]);
      return s !== null ? [s] : [];
    }
  }

  const currentSlots = getCurrentSlots();

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 rounded-full border-2 border-zinc-600 border-t-blue-500" style={{ animation: "spin 1s linear infinite" }} />
          <p className="text-sm text-zinc-400">{t.viewerLoading}</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-black">
        <p className="mb-6 max-w-md text-center text-sm text-red-400 text-pretty">
          {loadError}
        </p>
        <button
          onClick={handleBack}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          {t.back}
        </button>
      </div>
    );
  }

  const displayPageNum = settings.spreadMode
    ? `${currentPageIndex + 1}–${Math.min(currentPageIndex + 2, totalPages)}`
    : `${currentPageIndex + 1}`;

  const remaining = settings.spreadMode
    ? Math.max(0, Math.ceil((totalPages - currentPageIndex - 2) / 2))
    : Math.max(0, totalPages - currentPageIndex - 1);

  const progressPct = totalPages > 1
    ? (currentPageIndex / (totalPages - 1)) * 100
    : 100;

  return (
    <div className="relative h-dvh bg-black select-none" ref={containerRef}>
      {/* 画像表示エリア */}
      <div
        className="relative flex h-full cursor-pointer items-center justify-center overflow-hidden"
        onClick={handleClick}
      >
        <AnimatePresence initial={false} custom={direction}>
          {currentSlots.length === 0 ? (
            <motion.p
              key="empty"
              className="text-sm text-zinc-500 absolute"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {t.noImages}
            </motion.p>
          ) : (
            <motion.div
              key={currentPageIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {(currentSlots.filter((s) => s !== null) as NonNullable<SlotState>[]).map((slot, i) => (
                "failed" in slot ? (
                  <div
                    key={`${currentPageIndex}-${i}-err`}
                    className={cn(
                      "flex items-center justify-center bg-zinc-900/40",
                      settings.spreadMode ? "h-full w-[50%]" : "h-full w-full"
                    )}
                  >
                    <span className="text-xs text-zinc-600">{t.imageLoadFailed}</span>
                  </div>
                ) : "loading" in slot ? (
                  <div
                    key={`${currentPageIndex}-${i}-loading`}
                    className={cn(
                      "flex items-center justify-center",
                      settings.spreadMode ? "h-full w-[50%]" : "h-full w-full"
                    )}
                  >
                    <div className="size-6 rounded-full border-2 border-zinc-700 border-t-blue-500" style={{ animation: "spin 1s linear infinite" }} />
                  </div>
                ) : (
                  <img
                    key={`${currentPageIndex}-${i}`}
                    src={slot.url}
                    alt={`Page ${currentPageIndex + i + 1}`}
                    className={cn(
                      "object-contain",
                      settings.spreadMode
                        ? "max-h-dvh max-w-[50%]"
                        : "max-h-dvh max-w-full w-auto h-full"
                    )}
                    draggable={false}
                  />
                )
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 左上: ホームボタン + 表示モード切替 */}
      <div className="group/top absolute left-4 top-4 z-10 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleBack();
          }}
          title={t.homeTitle}
          className="flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 text-xs text-zinc-400 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover/top:opacity-100 hover:bg-black/70 hover:text-zinc-100"
        >
          <HomeIcon />
          {t.home}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          title={isFullscreen ? t.exitFullscreen : t.fullscreen}
          className="flex items-center gap-1.5 rounded-lg bg-black/40 px-2.5 py-1.5 text-xs text-zinc-400 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover/top:opacity-100 hover:bg-black/70 hover:text-zinc-100"
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>

        <div className="flex overflow-hidden rounded-lg border border-white/10 bg-black/40 backdrop-blur-sm opacity-0 group-hover/top:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateSettings({ spreadMode: false });
            }}
            title={t.singlePageTitle}
            className={cn(
              "px-3 py-1.5 text-xs transition-colors",
              !settings.spreadMode
                ? "bg-blue-600/60 text-blue-200"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {t.singlePage}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateSettings({ spreadMode: true });
            }}
            title={t.spreadPageTitle}
            className={cn(
              "px-3 py-1.5 text-xs transition-colors border-l border-white/10",
              settings.spreadMode
                ? "bg-blue-600/60 text-blue-200"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {t.spreadPage}
          </button>
        </div>
      </div>

      {/* 一部チャンク失敗時の警告バナー */}
      {chunkWarning && (
        <div className="absolute inset-x-0 top-0 z-20 flex items-start gap-2 bg-amber-900/80 px-4 py-2.5 text-xs text-amber-200 backdrop-blur-sm">
          <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="flex-1 whitespace-pre-wrap">{chunkWarning}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); dismissWarning(); }}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* ページバー */}
      <div className="group absolute inset-x-0 bottom-0 z-10 h-20">
        <div
          className="absolute inset-x-0 bottom-0 translate-y-full opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-black/85 backdrop-blur-sm px-5 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="tabular-nums text-zinc-500">
                {t.remaining(remaining)}
              </span>

              {chunkBoundaries.length > 1 && currentChunkBoundary && (
                <span className="truncate max-w-[40%] text-center text-zinc-400">
                  {currentChunkBoundary.name
                    ? currentChunkBoundary.name
                    : t.chunkOf(currentChunkBoundary.chunkIndex + 1, chunkBoundaries.length)}
                </span>
              )}

              <span className="tabular-nums font-medium text-zinc-200">
                {displayPageNum}
                <span className="ml-1 font-normal text-zinc-500">/ {totalPages}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {chunkBoundaries.length > 1 && (
                <button
                  type="button"
                  onClick={prevChunk}
                  title={t.prevChunk}
                  className="shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="19 20 9 12 19 4" /><line x1="5" y1="19" x2="5" y2="5" />
                  </svg>
                </button>
              )}

              <div className="relative flex flex-1 items-center" onMouseLeave={() => setHoverInfo(null)}>
                <div className="absolute inset-0 rounded-full bg-zinc-700/60" />
                <div
                  className="absolute right-0 top-0 h-full rounded-full bg-blue-500/70 transition-all duration-100"
                  style={{ width: `${progressPct}%` }}
                />
                {totalPages > 1 && chunkBoundaries.slice(1).map((b) => {
                  const pct = (b.startPage / (totalPages - 1)) * 100;
                  const isCurrentChunk = currentChunkBoundary?.chunkIndex === b.chunkIndex;
                  return (
                    <button
                      key={b.chunkIndex}
                      type="button"
                      onClick={() => goToPage(b.startPage)}
                      title={b.name ?? t.chunkOf(b.chunkIndex + 1, chunkBoundaries.length)}
                      className="absolute z-20 h-3 w-0.5 -translate-x-1/2 cursor-pointer rounded-full transition-colors"
                      style={{
                        right: `${pct}%`,
                        backgroundColor: isCurrentChunk ? "rgb(96 165 250)" : "rgba(255,255,255,0.4)",
                      }}
                    />
                  );
                })}
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, totalPages - 1)}
                  value={currentPageIndex}
                  onChange={(e) => goToPage(Number(e.target.value))}
                  onMouseMove={(e) => {
                    if (totalPages <= 1) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const pageIndex = Math.round((1 - relX) * (totalPages - 1));
                    setHoverInfo({ pageIndex, x: relX });
                    // サムネイルキャッシュになければ即座に読み込み（プリフェッチ漏れ対策）
                    const path = flatImageList[pageIndex];
                    if (path && !thumbCacheRef.current.has(path) && !thumbLoadingRef.current.has(path)) {
                      thumbLoadingRef.current.add(path);
                      const cached = imageCacheRef.current.get(path);
                      const thumbPromise = cached
                        ? generateThumbFromCache(path, cached, 80)
                        : isPdfPagePath(path)
                          ? (() => {
                              const parsed = parsePdfPagePath(path);
                              return parsed ? renderPdfThumbnail(parsed.pdfPath, parsed.pageNum, 80) : Promise.reject(new Error("invalid pdf path"));
                            })()
                          : readImageThumbnail(path, 80);
                      thumbPromise
                        .then((url) => { thumbCacheRef.current.set(path, url); setThumbTick(n => n + 1); })
                        .catch(() => {})
                        .finally(() => thumbLoadingRef.current.delete(path));
                    }
                  }}
                  className="relative z-10 h-3 w-full cursor-pointer appearance-none bg-transparent accent-blue-400"
                  style={{ direction: "rtl" }}
                />

                {/* ホバーサムネイル（プリフェッチ済みの低品質サムネイルを即座に表示） */}
                {hoverInfo && thumbTick >= 0 && (
                  <div
                    className="pointer-events-none absolute bottom-full z-30 mb-3 -translate-x-1/2"
                    style={{ left: `${hoverInfo.x * 100}%` }}
                  >
                    <div className="overflow-hidden rounded-lg border border-white/15 bg-black/90 shadow-xl">
                      {(() => {
                        const path = flatImageList[hoverInfo.pageIndex];
                        const url = path ? thumbCacheRef.current.get(path) : undefined;
                        return url ? (
                          <img
                            src={url}
                            alt=""
                            className="block max-h-24 w-auto max-w-[72px] object-contain"
                            draggable={false}
                          />
                        ) : (
                          <div className="flex h-20 w-14 items-center justify-center text-xs text-zinc-500">
                            {hoverInfo.pageIndex + 1}
                          </div>
                        );
                      })()}
                      <p className="py-1 text-center tabular-nums text-[10px] text-zinc-400">
                        {hoverInfo.pageIndex + 1}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {chunkBoundaries.length > 1 && (
                <button
                  type="button"
                  onClick={nextChunk}
                  title={t.nextChunk}
                  className="shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="5 4 15 12 5 20" /><line x1="19" y1="5" x2="19" y2="19" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
      <line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" />
    </svg>
  );
}
