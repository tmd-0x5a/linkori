/**
 * Tauri OS ファイルドラッグ&ドロップ管理。
 *
 * OS からのドラッグは Tauri が OS レベルで横取りするため HTML5 drag イベントは発火しない。
 * onDragDropEvent の position（物理ピクセル）と各ゾーンの getBoundingClientRect（CSS ピクセル）を
 * devicePixelRatio で変換して当たり判定を行う。
 */

type Zone = {
  id: string;
  getRect: () => DOMRect | null;
  onDrop: (paths: string[]) => void;
  setActive: (active: boolean) => void;
};

const _registry = new Map<string, Zone>();
let _activeId: string | null = null;
let _initialized = false;

export function registerDropZone(zone: Zone): void {
  _registry.set(zone.id, zone);
}

export function unregisterDropZone(id: string): void {
  if (_activeId === id) {
    _activeId = null;
  }
  _registry.delete(id);
}

/** 物理ピクセル座標でヒットテスト */
function hitTest(physX: number, physY: number): Zone | null {
  const dpr = typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1;
  const lx = physX / dpr;
  const ly = physY / dpr;
  for (const zone of _registry.values()) {
    const r = zone.getRect();
    if (r && lx >= r.left && lx <= r.right && ly >= r.top && ly <= r.bottom) {
      return zone;
    }
  }
  return null;
}

function setActive(id: string | null) {
  if (id === _activeId) return;
  if (_activeId) _registry.get(_activeId)?.setActive(false);
  _activeId = id;
  if (_activeId) _registry.get(_activeId)?.setActive(true);
}

/** アプリ起動後に一度だけ呼ぶ。二重登録防止済み。 */
export async function initDragDropListener(): Promise<void> {
  if (_initialized || typeof window === "undefined") return;
  _initialized = true;
  try {
    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
    await getCurrentWebview().onDragDropEvent((event) => {
      const p = event.payload;
      if (p.type === "enter") {
        // ドラッグがウィンドウに入った瞬間のゾーン検出
        setActive(hitTest(p.position.x, p.position.y)?.id ?? null);
      } else if (p.type === "over") {
        setActive(hitTest(p.position.x, p.position.y)?.id ?? null);
      } else if (p.type === "drop") {
        const zone = hitTest(p.position.x, p.position.y);
        setActive(null);
        if (zone) {
          zone.onDrop(p.paths.map((s) => s.replace(/\\/g, "/")));
        }
      } else if (p.type === "leave") {
        setActive(null);
      }
    });
  } catch {
    // Tauri 環境以外（SSR / ブラウザプレビュー）では無効
  }
}
