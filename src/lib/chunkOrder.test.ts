import { describe, it, expect } from "vitest";
import { computeChunkMove } from "./chunkOrder";

// テスト用の ID 配列
// [A, B, C, D, E] の 5 チャンクを使用

const ALL = ["A", "B", "C", "D", "E"];

// ── 単体移動 ────────────────────────────────────────────────────────────────

describe("単体移動（selectedIds.size <= 1 またはドラッグ対象が選択外）", () => {
  it("選択なし: B → D に移動", () => {
    const result = computeChunkMove(ALL, "B", "D", new Set());
    expect(result).toEqual({ type: "single", fromIndex: 1, toIndex: 3 });
  });

  it("自分自身にドロップ → noop", () => {
    const result = computeChunkMove(ALL, "B", "B", new Set(["B", "C"]));
    expect(result).toEqual({ type: "noop" });
  });

  it("選択1件のみ: A → E に移動", () => {
    const result = computeChunkMove(ALL, "A", "E", new Set(["A"]));
    expect(result).toEqual({ type: "single", fromIndex: 0, toIndex: 4 });
  });

  it("複数選択中でもドラッグ対象が選択外なら単体移動", () => {
    // B, C 選択中だが A をドラッグ
    const result = computeChunkMove(ALL, "A", "D", new Set(["B", "C"]));
    expect(result).toEqual({ type: "single", fromIndex: 0, toIndex: 3 });
  });

  it("存在しない ID → noop", () => {
    const result = computeChunkMove(ALL, "X", "B", new Set());
    expect(result).toEqual({ type: "noop" });
  });
});

// ── グループ移動（下方向） ────────────────────────────────────────────────

describe("グループ移動：選択チャンクを下方向に移動", () => {
  it("[A,B,C,D,E] で B,C 選択 → B を D の上に移動 → [A,D,B,C,E]", () => {
    // B(1) を D(3) にドロップ（下方向）
    const result = computeChunkMove(ALL, "B", "D", new Set(["B", "C"]));
    expect(result).toEqual({ type: "group", newOrder: ["A", "D", "B", "C", "E"] });
  });

  it("[A,B,C,D,E] で B,C 選択 → B を E の上に移動 → [A,D,B,C,E] => 最後尾", () => {
    // B(1) を E(4) にドロップ（下方向・末尾）
    const result = computeChunkMove(ALL, "B", "E", new Set(["B", "C"]));
    expect(result).toEqual({ type: "group", newOrder: ["A", "D", "E", "B", "C"] });
  });

  it("[A,B,C,D,E] で A,B,C 選択 → A を D にドロップ → [D,A,B,C,E]", () => {
    const result = computeChunkMove(ALL, "A", "D", new Set(["A", "B", "C"]));
    expect(result).toEqual({ type: "group", newOrder: ["D", "A", "B", "C", "E"] });
  });

  it("[A,B,C,D,E] で A,C 選択（飛び石） → A を D にドロップ → [B,D,A,C,E]", () => {
    const result = computeChunkMove(ALL, "A", "D", new Set(["A", "C"]));
    expect(result).toEqual({ type: "group", newOrder: ["B", "D", "A", "C", "E"] });
  });
});

// ── グループ移動（上方向） ────────────────────────────────────────────────

describe("グループ移動：選択チャンクを上方向に移動", () => {
  it("[A,B,C,D,E] で D,E 選択 → D を B の上に移動 → [A,D,E,B,C]", () => {
    // D(3) を B(1) にドロップ（上方向）
    const result = computeChunkMove(ALL, "D", "B", new Set(["D", "E"]));
    expect(result).toEqual({ type: "group", newOrder: ["A", "D", "E", "B", "C"] });
  });

  it("[A,B,C,D,E] で D,E 選択 → D を A の上に移動 → [D,E,A,B,C]", () => {
    const result = computeChunkMove(ALL, "D", "A", new Set(["D", "E"]));
    expect(result).toEqual({ type: "group", newOrder: ["D", "E", "A", "B", "C"] });
  });

  it("[A,B,C,D,E] で C,D,E 選択 → C を A にドロップ → [C,D,E,A,B]", () => {
    const result = computeChunkMove(ALL, "C", "A", new Set(["C", "D", "E"]));
    expect(result).toEqual({ type: "group", newOrder: ["C", "D", "E", "A", "B"] });
  });
});

// ── グループ内の並び替え ─────────────────────────────────────────────────

describe("グループ内並び替え（over が選択グループ内）", () => {
  it("[A,B,C,D,E] で B,C,D 選択 → B を D にドロップ（グループ内順序変更）", () => {
    // B が最後に、C,D は前に → グループ [C,D,B] が元の B の位置付近に挿入
    const result = computeChunkMove(ALL, "B", "D", new Set(["B", "C", "D"]));
    expect(result).toEqual({ type: "group", newOrder: ["A", "C", "D", "B", "E"] });
  });

  it("[A,B,C,D,E] で B,C,D 選択 → D を B にドロップ（グループ内逆順）", () => {
    // D が最初に → グループ [D,B,C] が元の B 位置付近に挿入
    const result = computeChunkMove(ALL, "D", "B", new Set(["B", "C", "D"]));
    expect(result).toEqual({ type: "group", newOrder: ["A", "D", "B", "C", "E"] });
  });
});

// ── エッジケース ─────────────────────────────────────────────────────────

describe("エッジケース", () => {
  it("2チャンクのみ: A,B で B を A にドロップ → [B,A]", () => {
    const result = computeChunkMove(["A", "B"], "B", "A", new Set());
    expect(result).toEqual({ type: "single", fromIndex: 1, toIndex: 0 });
  });

  it("全チャンク選択で A を E にドロップ → グループ内並び替えで A が末尾に [B,C,D,E,A]", () => {
    // 全選択 = unselected が空 → グループ内並び替えのみ発生、A が E の後ろに移動
    const result = computeChunkMove(ALL, "A", "E", new Set(["A", "B", "C", "D", "E"]));
    expect(result).toEqual({ type: "group", newOrder: ["B", "C", "D", "E", "A"] });
  });

  it("1件のみのリストで自分自身 → noop", () => {
    const result = computeChunkMove(["A"], "A", "A", new Set());
    expect(result).toEqual({ type: "noop" });
  });
});
