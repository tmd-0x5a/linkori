"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useViewerStore } from "@/stores/viewerStore";
import { readImageAsDataUrl } from "@/lib/tauri";
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
    settings,
    nextSpread,
    prevSpread,
    goToPage,
    goToFirst,
    goToLast,
    updateSettings,
  } = useViewerStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState(0);
  const prevIndexRef = useRef(currentPageIndex);
  const shouldReduceMotion = useReducedMotion();

  // path → data URL のキャッシュ（ページ移動時に都度読み込まないよう保持）
  const imageCacheRef = useRef<Map<string, string>>(new Map());
  const [, forceUpdate] = useState(0);

  // 現在ページ（見開き含む）+ 先読みページを非同期で読み込む
  useEffect(() => {
    if (flatImageList.length === 0) return;

    const step = settings.spreadMode ? 2 : 1;
    // 現在ページ + 先読み2スプレッド分のインデックスを対象にする
    const indices = new Set<number>();
    for (let i = currentPageIndex; i < Math.min(currentPageIndex + step * 3, flatImageList.length); i++) {
      indices.add(i);
    }

    let cancelled = false;
    (async () => {
      for (const idx of indices) {
        const path = flatImageList[idx];
        if (!path || imageCacheRef.current.has(path)) continue;
        try {
          const url = await readImageAsDataUrl(path);
          if (cancelled) return;
          imageCacheRef.current.set(path, url);
          forceUpdate((n) => n + 1);
        } catch {
          // 読み込み失敗はスキップ
        }
      }
    })();

    return () => { cancelled = true; };
  }, [currentPageIndex, flatImageList, settings.spreadMode]);

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
      // 入力中は無視
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        // 次ページ
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          nextSpread();
          break;
        // 前ページ
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          prevSpread();
          break;
        // スペース: 次ページ / Shift+スペース: 前ページ
        case " ":
          e.preventDefault();
          if (e.shiftKey) prevSpread();
          else nextSpread();
          break;
        // PageDown: 次ページ / PageUp: 前ページ
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
        case "Escape":
          e.preventDefault();
          onBack();
          break;
        // S: 1枚 / 2枚 切替
        case "s":
        case "S":
          e.preventDefault();
          updateSettings({ spreadMode: !settings.spreadMode });
          break;
      }
    },
    [settings, nextSpread, prevSpread, goToFirst, goToLast, onBack, updateSettings]
  );

  // マウスホイールナビゲーション（スロットル付き）
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
    // passive: false でスクロールのデフォルト動作をキャンセル
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [handleKeyDown, handleWheel]);

  // クリックナビゲーション（左半分 ← / 右半分 →）
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

  // パスから読み込み済み data URL を取得（未読み込みは空文字）
  function resolveUrl(path: string): string {
    return imageCacheRef.current.get(path) ?? "";
  }

  // 現在表示すべき画像 URL を決定（キャッシュから取得）
  function getCurrentImages(): string[] {
    if (totalPages === 0) return [];

    if (settings.spreadMode) {
      // 見開きモード: 2枚表示
      const images: string[] = [];
      const url0 = flatImageList[currentPageIndex] ? resolveUrl(flatImageList[currentPageIndex]) : "";
      if (url0) images.push(url0);
      const url1 = currentPageIndex + 1 < totalPages && flatImageList[currentPageIndex + 1]
        ? resolveUrl(flatImageList[currentPageIndex + 1])
        : "";
      if (url1) images.push(url1);
      return settings.rightToLeft ? images.reverse() : images;
    } else {
      // 単ページモード
      const path = flatImageList[currentPageIndex];
      const url = path ? resolveUrl(path) : "";
      return url ? [url] : [];
    }
  }

  const currentImages = getCurrentImages();

  // ローディング
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

  // エラー
  if (loadError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-black">
        <p className="mb-6 max-w-md text-center text-sm text-red-400 text-pretty">
          {loadError}
        </p>
        <button
          onClick={onBack}
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

  // 残りページ数（見開きモードは2枚単位）
  const remaining = settings.spreadMode
    ? Math.max(0, Math.ceil((totalPages - currentPageIndex - 2) / 2))
    : Math.max(0, totalPages - currentPageIndex - 1);

  // プログレスバーの幅（%）
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
          {currentImages.length === 0 ? (
            <motion.p
              key="empty"
              className="text-sm text-zinc-500 absolute"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              表示できる画像がありません
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
              {currentImages.map((url, i) => (
                <img
                  key={`${currentPageIndex}-${i}`}
                  src={url}
                  alt={`Page ${currentPageIndex + i + 1}`}
                  className={cn(
                    "object-contain",
                    settings.spreadMode
                      ? "max-h-dvh max-w-[50%]"
                      : "max-h-dvh max-w-full w-auto h-full"
                  )}
                  draggable={false}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 左上: ホームボタン + 表示モード切替（マウスオフ時は完全透明） */}
      <div className="group/top absolute left-4 top-4 z-10 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          title={t.homeTitle}
          className="flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 text-xs text-zinc-400 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover/top:opacity-100 hover:bg-black/70 hover:text-zinc-100"
        >
          <HomeIcon />
          {t.home}
        </button>

        {/* 1枚 / 2枚 トグル */}
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

      {/* ページバー（ホバーエリア + コンテンツ） */}
      <div className="group absolute inset-x-0 bottom-0 z-10 h-20">
        {/* コンテンツ: マウスが乗ったときのみ表示 */}
        <div
          className="absolute inset-x-0 bottom-0 translate-y-full opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-black/85 backdrop-blur-sm px-5 py-3 flex flex-col gap-2">
            {/* 上段: ページ情報テキスト */}
            <div className="flex items-center justify-between text-xs">
              {/* 残りページ（左） */}
              <span className="tabular-nums text-zinc-500">
                {t.remaining(remaining)}
              </span>

              {/* 現在ページ / 全ページ（右） */}
              <span className="tabular-nums font-medium text-zinc-200">
                {displayPageNum}
                <span className="ml-1 font-normal text-zinc-500">/ {totalPages}</span>
              </span>
            </div>

            {/* 下段: プログレスバー（クリック＆ドラッグでシーク） */}
            <div className="relative flex items-center">
              {/* 背景トラック */}
              <div className="absolute inset-0 rounded-full bg-zinc-700/60" />
              {/* 進捗（右から伸びる） */}
              <div
                className="absolute right-0 top-0 h-full rounded-full bg-blue-500/70 transition-all duration-100"
                style={{ width: `${progressPct}%` }}
              />
              {/* シークスライダー（透明・手前に重ねる・RTL方向） */}
              <input
                type="range"
                min={0}
                max={Math.max(0, totalPages - 1)}
                value={currentPageIndex}
                onChange={(e) => goToPage(Number(e.target.value))}
                className="relative z-10 h-3 w-full cursor-pointer appearance-none bg-transparent accent-blue-400"
                style={{ direction: "rtl" }}
              />
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
