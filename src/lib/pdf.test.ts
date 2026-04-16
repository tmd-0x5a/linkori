import { describe, it, expect } from "vitest";
import { isPdfPagePath, parsePdfPagePath, makePdfPagePath } from "./pdf";

// ── isPdfPagePath ─────────────────────────────────────────────────────────────

describe("isPdfPagePath", () => {
  it("pdf: プレフィックスのパスは true", () => {
    expect(isPdfPagePath("pdf:D:/manga/book.pdf#1")).toBe(true);
  });

  it("pdf: プレフィックスのみでも true", () => {
    expect(isPdfPagePath("pdf:")).toBe(true);
  });

  it("通常ファイルパスは false", () => {
    expect(isPdfPagePath("D:/manga/001.jpg")).toBe(false);
  });

  it("zip:// スキームは false", () => {
    expect(isPdfPagePath("zip://D:/archive.zip///001.pdf")).toBe(false);
  });

  it("空文字列は false", () => {
    expect(isPdfPagePath("")).toBe(false);
  });

  it("PDF 拡張子でも pdf: プレフィックスがなければ false", () => {
    expect(isPdfPagePath("D:/manga/book.pdf")).toBe(false);
  });
});

// ── parsePdfPagePath ──────────────────────────────────────────────────────────

describe("parsePdfPagePath", () => {
  it("正常なパスを解析する", () => {
    const result = parsePdfPagePath("pdf:D:/manga/book.pdf#1");
    expect(result).toEqual({ pdfPath: "D:/manga/book.pdf", pageNum: 1 });
  });

  it("ページ番号が複数桁でも正しく解析する", () => {
    const result = parsePdfPagePath("pdf:D:/manga/book.pdf#42");
    expect(result).toEqual({ pdfPath: "D:/manga/book.pdf", pageNum: 42 });
  });

  it("パスに # が含まれる場合は最後の # をセパレータとして使う", () => {
    // 例: ファイル名に # が含まれるケース
    const result = parsePdfPagePath("pdf:D:/manga/book#1.pdf#5");
    expect(result).toEqual({ pdfPath: "D:/manga/book#1.pdf", pageNum: 5 });
  });

  it("pdf: プレフィックスがない場合は null", () => {
    expect(parsePdfPagePath("D:/manga/book.pdf#1")).toBeNull();
  });

  it("# セパレータがない場合は null", () => {
    expect(parsePdfPagePath("pdf:D:/manga/book.pdf")).toBeNull();
  });

  it("ページ番号が 0 の場合は null（1 始まり）", () => {
    expect(parsePdfPagePath("pdf:D:/manga/book.pdf#0")).toBeNull();
  });

  it("ページ番号が負の場合は null", () => {
    expect(parsePdfPagePath("pdf:D:/manga/book.pdf#-1")).toBeNull();
  });

  it("ページ番号が数値でない場合は null", () => {
    expect(parsePdfPagePath("pdf:D:/manga/book.pdf#abc")).toBeNull();
  });

  it("空文字列は null", () => {
    expect(parsePdfPagePath("")).toBeNull();
  });
});

// ── makePdfPagePath ───────────────────────────────────────────────────────────

describe("makePdfPagePath", () => {
  it("パスとページ番号から pdf: 形式を生成する", () => {
    expect(makePdfPagePath("D:/manga/book.pdf", 1)).toBe("pdf:D:/manga/book.pdf#1");
  });

  it("複数桁のページ番号", () => {
    expect(makePdfPagePath("D:/manga/book.pdf", 100)).toBe("pdf:D:/manga/book.pdf#100");
  });

  it("makePdfPagePath の結果を parsePdfPagePath で逆変換できる（ラウンドトリップ）", () => {
    const pdfPath = "D:/manga/chapter1/volume.pdf";
    const pageNum = 7;
    const encoded = makePdfPagePath(pdfPath, pageNum);
    const decoded = parsePdfPagePath(encoded);
    expect(decoded).toEqual({ pdfPath, pageNum });
  });

  it("Unix パスでも生成できる", () => {
    expect(makePdfPagePath("/home/user/book.pdf", 3)).toBe("pdf:/home/user/book.pdf#3");
  });
});
