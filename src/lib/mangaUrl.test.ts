import { describe, it, expect } from "vitest";
import { imagePathToMangaUrl, imagePathsToMangaUrls } from "./mangaUrl";

// テスト用の base64 エンコード補助関数（mangaUrl.ts と同じアルゴリズム）
function b64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ── 通常ファイルパス ──────────────────────────────────────────────────────────

describe("imagePathToMangaUrl: 通常ファイルパス", () => {
  it("Unix スラッシュ形式のパス", () => {
    const result = imagePathToMangaUrl("D:/manga/001.jpg");
    expect(result).toBe(`https://manga.localhost/dir/${b64("D:/manga/001.jpg")}`);
  });

  it("Windows バックスラッシュを正規化してから変換", () => {
    const result = imagePathToMangaUrl("D:\\manga\\001.jpg");
    // バックスラッシュ → スラッシュに正規化
    expect(result).toBe(`https://manga.localhost/dir/${b64("D:/manga/001.jpg")}`);
  });

  it("ネストしたディレクトリのパス", () => {
    const result = imagePathToMangaUrl("/home/user/images/page-001.png");
    expect(result).toBe(`https://manga.localhost/dir/${b64("/home/user/images/page-001.png")}`);
  });

  it("ZIP でも CBZ でもないファイルは /dir/ 形式", () => {
    const result = imagePathToMangaUrl("C:/manga/chapter1/001.webp");
    expect(result).toMatch(/^https:\/\/manga\.localhost\/dir\//);
  });
});

// ── zip:// スキーム形式 ───────────────────────────────────────────────────────

describe("imagePathToMangaUrl: zip:// スキーム形式", () => {
  it("zip:// スキームを /zip/ 形式に変換", () => {
    const result = imagePathToMangaUrl("zip://D:/manga/vol1.zip///ch01/001.jpg");
    expect(result).toBe(
      `https://manga.localhost/zip/${b64("D:/manga/vol1.zip")}/${b64("ch01/001.jpg")}`
    );
  });

  it("CBZ ファイルも zip:// スキームで処理", () => {
    const result = imagePathToMangaUrl("zip://D:/manga/vol1.cbz///001.jpg");
    expect(result).toBe(
      `https://manga.localhost/zip/${b64("D:/manga/vol1.cbz")}/${b64("001.jpg")}`
    );
  });

  it("/// セパレータが存在しない場合は error を返す", () => {
    const result = imagePathToMangaUrl("zip://D:/manga/vol1.zip/invalid");
    expect(result).toBe("https://manga.localhost/error/invalid-zip-path");
  });
});

// ── パス形式 ZIP ─────────────────────────────────────────────────────────────

describe("imagePathToMangaUrl: パス形式の ZIP エントリ", () => {
  it(".zip 境界を検出してエントリを分離", () => {
    const result = imagePathToMangaUrl("D:/manga/vol1.zip/ch01/001.jpg");
    expect(result).toBe(
      `https://manga.localhost/zip/${b64("D:/manga/vol1.zip")}/${b64("ch01/001.jpg")}`
    );
  });

  it(".cbz 境界を検出してエントリを分離", () => {
    const result = imagePathToMangaUrl("D:/manga/vol1.cbz/001.jpg");
    expect(result).toBe(
      `https://manga.localhost/zip/${b64("D:/manga/vol1.cbz")}/${b64("001.jpg")}`
    );
  });

  it("ZIP ファイル自体（エントリなし）は /dir/ 形式", () => {
    // パス内に zip の後にエントリが続かない場合
    const result = imagePathToMangaUrl("D:/manga/vol1.zip");
    expect(result).toMatch(/^https:\/\/manga\.localhost\/dir\//);
  });

  it("大文字 .ZIP も認識する", () => {
    const result = imagePathToMangaUrl("D:/manga/vol1.ZIP/001.jpg");
    expect(result).toMatch(/^https:\/\/manga\.localhost\/zip\//);
  });
});

// ── imagePathsToMangaUrls ─────────────────────────────────────────────────────

describe("imagePathsToMangaUrls: 配列一括変換", () => {
  it("空配列は空配列を返す", () => {
    expect(imagePathsToMangaUrls([])).toEqual([]);
  });

  it("複数パスをまとめて変換", () => {
    const paths = ["D:/manga/001.jpg", "D:/manga/002.jpg"];
    const result = imagePathsToMangaUrls(paths);
    expect(result).toEqual([
      `https://manga.localhost/dir/${b64("D:/manga/001.jpg")}`,
      `https://manga.localhost/dir/${b64("D:/manga/002.jpg")}`,
    ]);
  });

  it("各要素が個別変換と同じ結果", () => {
    const paths = [
      "D:/manga/001.jpg",
      "zip://D:/archive.zip///ch01/002.png",
      "D:\\backslash\\003.jpg",
    ];
    const batchResult = imagePathsToMangaUrls(paths);
    const singleResults = paths.map(imagePathToMangaUrl);
    expect(batchResult).toEqual(singleResults);
  });
});
