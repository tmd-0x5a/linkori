import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn: クラス名マージ", () => {
  it("単一クラスをそのまま返す", () => {
    expect(cn("flex")).toBe("flex");
  });

  it("複数クラスをスペース区切りで結合する", () => {
    expect(cn("flex", "items-center")).toBe("flex items-center");
  });

  it("undefined / null / false を無視する", () => {
    expect(cn("flex", undefined, null, false, "gap-4")).toBe("flex gap-4");
  });

  it("条件付きクラス（オブジェクト形式）", () => {
    expect(cn({ "font-bold": true, "text-red-500": false })).toBe("font-bold");
  });

  it("条件付きクラス（三項演算子）", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toBe("base active");
  });

  it("Tailwind のコンフリクトを解消する（後勝ち）", () => {
    // text-sm と text-lg が競合 → 後ろの text-lg が勝つ
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("padding のコンフリクト解消", () => {
    // p-4 と px-6 → px-6 が勝ち p-4 は上書き（tailwind-merge の仕様）
    expect(cn("p-4", "px-6")).toBe("p-4 px-6");
  });

  it("配列形式のクラス", () => {
    expect(cn(["flex", "items-center"])).toBe("flex items-center");
  });

  it("ネストした配列と条件の組み合わせ", () => {
    expect(cn(["flex", false && "hidden"], "gap-2")).toBe("flex gap-2");
  });

  it("空の入力は空文字列を返す", () => {
    expect(cn()).toBe("");
  });

  it("すべて falsy な入力は空文字列を返す", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});
