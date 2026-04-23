// Main content sections
const { useContext: uC, useRef: uR } = React;

const mapLang = (obj, lang) => obj?.[lang] ?? obj?.en ?? obj;

// ─── 01 Overview ───
function Overview() {
  const { lang } = uC(LangCtx);
  const ref = uR(null);
  useReveal(ref);
  useCardSpot();
  const c = COPY.overview;
  const icos = ["monitor", "list", "folder", "clock", "archive", "globe"];
  return (
    <section className="section" id="features" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow, lang)}</span>
            <h2>{mapLang(c.title, lang)}</h2>
            <p>{mapLang(c.sub, lang)}</p>
          </div>
          <div className="section-counter">6 FEATURES</div>
        </div>
        <div className="grid g3">
          {c.items.map((it, i) => (
            <div
              key={i}
              className="card spot reveal"
              style={{ "--d": i * 60 + "ms" }}
            >
              <div className="ico">
                <Ico name={icos[i]} />
              </div>
              <h3>{mapLang(it.t, lang)}</h3>
              <p>{mapLang(it.d, lang)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Screenshots ───
function Screens() {
  const { lang } = uC(LangCtx);
  const ref = uR(null);
  useReveal(ref);
  return (
    <section className="section" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">
              {lang === "ja" ? "プレビュー" : "PREVIEW"}
            </span>
            <h2>
              {lang === "ja" ? <>見てみよう。</> : <>See it in action.</>}
            </h2>
            <p>
              {lang === "ja"
                ? "モックで再現したアプリの各画面。\nプレイリスト、ビューア、ファイルブラウザ。"
                : "App screens, reimagined as mocks. Playlist, viewer, file browser."}
            </p>
          </div>
          <div className="section-counter">3 SCREENS</div>
        </div>
        <div className="ss">
          <div className="cell reveal" data-par="0.3">
            <div className="frame">
              <PlaylistMockFull />
            </div>
            <div className="cap">
              <b>{lang === "ja" ? "プレイリスト" : "Playlist"}</b>
              <span>
                {lang === "ja"
                  ? "タグ色・お気に入り"
                  : "Tag colors · favorites"}
              </span>
            </div>
          </div>
          <div
            className="cell reveal"
            style={{ "--d": "120ms" }}
            data-par="0.5"
          >
            <div className="frame">
              <ViewerMockFull />
            </div>
            <div className="cap">
              <b>{lang === "ja" ? "ビューア" : "Viewer"}</b>
              <span>
                {lang === "ja" ? "見開き・RTL・編集" : "Spread · RTL · edit"}
              </span>
            </div>
          </div>
          <div
            className="cell reveal"
            style={{ "--d": "240ms" }}
            data-par="0.3"
          >
            <div className="frame">
              <BrowserMockFull />
            </div>
            <div className="cap">
              <b>{lang === "ja" ? "ファイルブラウザ" : "File Browser"}</b>
              <span>
                {lang === "ja" ? "検索・リスト表示" : "Search · list view"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 02 Playlist feature row ───
function PlaylistSec() {
  const { lang } = uC(LangCtx);
  const ref = uR(null);
  useReveal(ref);
  const c = COPY.playlist;
  return (
    <section className="section" id="playlist" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow, lang)}</span>
            <h2>{mapLang(c.title, lang)}</h2>
            <p>{mapLang(c.sub, lang)}</p>
          </div>
          <div className="section-counter">sidebar · tags · status</div>
        </div>
        <div className="feature-row">
          <div className="feature-copy reveal">
            <ul>
              {c.bullets.map((b, i) => (
                <li key={i}>{mapLang(b, lang)}</li>
              ))}
            </ul>
          </div>
          <div
            className="mock reveal"
            style={{ "--d": "100ms" }}
            data-par="0.4"
          >
            <WinChrome title="Linkori" />
            <PlaylistMock />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 03 Chunks ───
function ChunksSec() {
  const { lang } = uC(LangCtx);
  const ref = uR(null);
  useReveal(ref);
  const c = COPY.chunk;
  return (
    <section className="section" id="chunks" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow, lang)}</span>
            <h2>{mapLang(c.title, lang)}</h2>
            <p>{mapLang(c.sub, lang)}</p>
          </div>
          <div className="section-counter">chain · range · reverse</div>
        </div>

        {/* Chunk chain visualization */}
        <div
          className="reveal"
          style={{ overflowX: "auto", overflowY: "hidden", marginBottom: 60 }}
        >
          <div className="chain-track" style={{ paddingBottom: 20 }}>
            {[
              { n: "01", name: "Vol.01 — prologue", meta: "ZIP · 42p" },
              { n: "02", name: "Vol.01 — arc A", meta: "Folder · 86p" },
              { n: "03", name: "Vol.02", meta: "PDF · 120p" },
              { n: "04", name: "Extras", meta: "CBZ · 18p" },
              { n: "05", name: "Vol.03 — finale", meta: "Folder · 64p" },
            ].map((x, i) => (
              <div key={i} className="chain-node">
                <span className="badge">{x.n}</span>
                <h4>CHUNK</h4>
                <div className="ti">{x.name}</div>
                <div className="meta">{x.meta}</div>
                <div className="link" />
              </div>
            ))}
          </div>
        </div>

        <div
          className="feature-row reveal"
          style={{ margin: "40px 0", alignItems: "center" }}
        >
          <div
            className="mock reveal"
            style={{ "--d": "100ms" }}
            data-par="0.3"
          >
            <WinChrome title="Linkori" />
            <ChunkSelectPanel />
          </div>
          <div className="feature-copy">
            <h3 style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}>
              {lang === "ja" ? "柔軟な範囲指定。" : "Flexible range."}
            </h3>
            <p style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}>
              {lang === "ja"
                ? "1画像から1フォルダまで、どこでも始点・終点に指定できる。複数選択でまとめて移動・削除も。"
                : "Start anywhere, end anywhere — single image to a full folder. Multi-select to move or delete in bulk."}
            </p>
            <ul>
              {c.bullets.map((b, i) => (
                <li
                  key={i}
                  style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}
                >
                  {mapLang(b, lang)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Group drag */}
        <div
          className="reveal"
          style={{ marginTop: 60, textAlign: "center", padding: "40px 0" }}
        >
          <h3
            style={{
              fontFamily: "var(--display)",
              fontSize: "clamp(32px,4vw,56px)",
              fontWeight: 700,
              letterSpacing: "-.03em",
              marginBottom: 12,
            }}
          >
            {mapLang(c.group.title, lang)}
          </h3>
          <p
            style={{
              color: "var(--fg-dim)",
              fontSize: 17,
              maxWidth: 540,
              margin: "0 auto 40px",
            }}
          >
            {mapLang(c.group.sub, lang)}
          </p>
          <div className="grid g4" style={{ marginTop: 40 }}>
            {c.group.actions.map((a, i) => (
              <div
                key={i}
                className="card reveal"
                style={{ "--d": i * 50 + "ms", textAlign: "left" }}
              >
                <div className="ico">
                  <Ico name={["arrow", "plus", "caret", "move"][i]} />
                </div>
                <h3
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 14,
                    letterSpacing: 0,
                  }}
                >
                  {mapLang(a.k, lang)}
                </h3>
                <p>{mapLang(a.d, lang)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="reveal" style={{ marginTop: 80, textAlign: "center" }}>
          <h3
            style={{
              fontFamily: "var(--display)",
              fontSize: "clamp(32px,4vw,56px)",
              fontWeight: 700,
              letterSpacing: "-.03em",
              marginBottom: 32,
            }}
          >
            {mapLang(c.tools.title, lang)}
          </h3>
          <div className="grid g3">
            {c.tools.items.map((it, i) => (
              <div
                key={i}
                className="card spot reveal"
                style={{ "--d": i * 60 + "ms", textAlign: "left" }}
              >
                <div className="ico">
                  <Ico name={["bars", "split", "undo"][i]} />
                </div>
                <h3>{mapLang(it.t, lang)}</h3>
                <p>{mapLang(it.d, lang)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 04 Browser ───
function BrowserSec() {
  const { lang } = uC(LangCtx);
  const ref = uR(null);
  useReveal(ref);
  const c = COPY.browser;
  return (
    <section className="section" id="browser" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow, lang)}</span>
            <h2>{mapLang(c.title, lang)}</h2>
            <p>{mapLang(c.sub, lang)}</p>
          </div>
          <div className="section-counter">drives · search · thumbs</div>
        </div>
        <div className="feature-row">
          <div className="feature-copy reveal">
            <ul>
              {c.bullets.map((b, i) => (
                <li key={i}>{mapLang(b, lang)}</li>
              ))}
            </ul>
          </div>
          <div
            className="mock reveal"
            style={{ "--d": "100ms" }}
            data-par="0.4"
          >
            <WinChrome title="Linkori — File Browser" />
            <BrowserMock />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 05 Viewer ───
function ViewerSec() {
  const { lang } = uC(LangCtx);
  const ref = uR(null);
  useReveal(ref);
  const c = COPY.viewer;
  return (
    <section className="section" id="viewer" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow, lang)}</span>
            <h2>{mapLang(c.title, lang)}</h2>
            <p>{mapLang(c.sub, lang)}</p>
          </div>
          <div className="section-counter">spread · RTL · instant</div>
        </div>
        {/* 左: モック / 右: 機能リスト（吹き出しなし・他セクションと合わせた feature-row） */}
        <div className="feature-row reveal" style={{ alignItems: "center" }}>
          <div
            className="mock reveal"
            style={{ "--d": "100ms" }}
            data-par="0.3"
          >
            <WinChrome title="Linkori — Viewer" />
            <ViewerMock showSidebar={true} />
          </div>
          <div className="feature-copy">
            <ul>
              {c.bullets.map((b, i) => (
                <li
                  key={i}
                  style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}
                >
                  {mapLang(b, lang)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="reveal" style={{ marginTop: 60 }}>
          <h3
            style={{
              fontFamily: "var(--display)",
              fontSize: "clamp(28px,3vw,42px)",
              fontWeight: 700,
              letterSpacing: "-.03em",
              marginBottom: 12,
            }}
          >
            {mapLang(c.bar.title, lang)}
          </h3>
          <p style={{ color: "var(--fg-dim)", marginBottom: 32 }}>
            {mapLang(c.bar.sub, lang)}
          </p>
          <div className="grid g3">
            {c.bar.items.map((it, i) => (
              <div
                key={i}
                className="card spot reveal"
                style={{ "--d": i * 60 + "ms" }}
              >
                <div className="ico">
                  <Ico name={["bars", "split2", "arrow"][i]} />
                </div>
                <h3>{mapLang(it.t, lang)}</h3>
                <p>{mapLang(it.d, lang)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 06 Shortcuts ───
function ShortcutsSec() {
  const { lang } = uC(LangCtx);
  const ref = uR(null);
  useReveal(ref);
  const c = COPY.shortcuts;
  return (
    <section className="section" id="shortcuts" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow, lang)}</span>
            <h2>{mapLang(c.title, lang)}</h2>
            <p>{mapLang(c.sub, lang)}</p>
          </div>
          <div className="section-counter">keyboard-first</div>
        </div>
        <div className="kbd-table">
          {c.groups.map((g, i) => (
            <div
              key={i}
              className="kbd-card reveal"
              style={{ "--d": i * 80 + "ms" }}
            >
              <h3>
                <span className="ico">
                  <Ico name={["arrow", "expand", "list"][i]} size={14} />
                </span>
                {mapLang(g.t, lang)}
              </h3>
              {g.rows.map((r, j) => (
                <div key={j} className="kbd-row">
                  <div className="kbd-act">{mapLang(r.a, lang)}</div>
                  <div className="kbd-keys">
                    {r.k.map((k, n) => (
                      <kbd key={n} className={r.mouse ? "mouse" : ""}>
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 07 What's New ───
function NewSec() {
  const { lang } = uC(LangCtx);
  const ref = uR(null);
  useReveal(ref);
  const c = COPY.whatsnew;
  return (
    <section className="section" id="new" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow, lang)}</span>
            <h2>{mapLang(c.title, lang)}</h2>
            <p>{mapLang(c.sub, lang)}</p>
          </div>
          <div className="section-counter">RELEASED · 2025</div>
        </div>
        <div className="new-grid">
          {c.items.map((it, i) => (
            <div
              key={i}
              className="new-card reveal"
              style={{ "--d": i * 80 + "ms" }}
            >
              <div className="num">0{i + 1}</div>
              <div>
                <span className="new-tag">NEW</span>
                <h3>{mapLang(it.t, lang)}</h3>
                <p>{mapLang(it.d, lang)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 08 Formats + Download CTA ───
function DownloadSec() {
  const { lang } = uC(LangCtx);
  const ref = uR(null);
  useReveal(ref);
  const c = COPY.formats;
  const d = COPY.download;
  return (
    <section className="section" id="download" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow, lang)}</span>
            <h2>{mapLang(c.title, lang)}</h2>
          </div>
        </div>
        <div className="fmt-row reveal">
          {c.list.map((f, i) => (
            <span key={i} className="fmt-pill">
              <i className="b" />
              {f}
            </span>
          ))}
        </div>

        <div className="download-card reveal" style={{ "--d": "120ms" }}>
          <div>
            <h3>{mapLang(d.title, lang)}</h3>
            <p>{mapLang(d.sub, lang)}</p>
            <div className="sys">{mapLang(d.sys, lang)}</div>
          </div>
          <DownloadAnchor
            className="btn-primary"
            style={{ fontSize: 16, padding: "18px 28px" }}
          >
            <Ico name="dl" size={18} />
            <span>{mapLang(d.cta, lang)}</span>
          </DownloadAnchor>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───
function Footer() {
  const { lang } = uC(LangCtx);
  return (
    <footer className="footer" style={{ paddingBottom: "80px" }}>
      <div className="wrap">
        <div className="footer-inner" style={{ marginBottom: "40px" }}>
          <div className="footer-brand">
            Link<em>ori</em>
          </div>
          <div className="footer-meta">
            <div>© 2026 tmd-0x5a · MIT License</div>
            <div>
              <a href="https://github.com/tmd-0x5a/linkori">GitHub</a>
            </div>
          </div>
        </div>
        <div
          className="footer-disclaimer"
          style={{
            fontSize: "11px",
            color: "var(--fg-mute)",
            lineHeight: "1.6",
            borderTop: "1px solid var(--border)",
            paddingTop: "20px",
            fontFamily: "var(--sans)",
            wordBreak: "keep-all",
            overflowWrap: "break-word",
            whiteSpace: "pre-line",
            lineBreak: "strict",
          }}
        >
          {lang === "ja"
            ? `免責事項
本ソフトウェアは現状有姿（AS IS）で提供されます。
使用によって生じたいかなる損害についても、作者は責任を負いません。
著作権で保護されたコンテンツの取り扱いは、ユーザー自身の責任において適法に行ってください。
本ソフトウェアはローカル環境のみで動作し、外部サーバーへのデータ送信は一切行いません。`
            : `Disclaimer
This software is provided "AS IS", without warranty of any kind.
The author is not responsible for any damages caused by its use.
Please handle copyrighted content legally and at your own risk.
This software only operates locally and does not transmit any data to external servers.`}
        </div>
      </div>
    </footer>
  );
}

// ───────── Mocks (Linkori app 準拠) ─────────
// アプリ実色
const APP = {
  navy: "#0f1d4a",
  blue: "#2f8fd1",
  skyDim: "#9fd8e8",
  skyMid: "rgba(159,216,232,.60)",
  skyLow: "rgba(159,216,232,.25)",
  yellow: "#fbbd41",
};
// v0.5.0 タグ色パレット（17色から代表色を抜粋）
const TAG_COLORS = {
  ocean: { hex: "#2f8fd1", fg: "#fff" },
  forest: { hex: "#078a52", fg: "#fff" },
  lemon: { hex: "#fbbd41", fg: "#0a1628" },
  coral: { hex: "#f0673f", fg: "#fff" },
  grape: { hex: "#c1b0ff", fg: "#0a1628" },
  pomegranate: { hex: "#fc7981", fg: "#0a1628" },
};

// アプリ準拠のプレイリスト行（1行目: 名前/★/件数、2行目: 進捗バー+%）
function PListRow({ name, star, progress, count = 5, active, tagColor }) {
  const tc = tagColor ? TAG_COLORS[tagColor] : null;
  const tint = tc ? `${tc.hex}33` : null;
  const border = tc ? `${tc.hex}66` : undefined;
  return (
    <div
      className={"plrow " + (active ? "active" : "")}
      style={
        tint && !active ? { background: tint, borderColor: border } : undefined
      }
    >
      <div className="plrow-top">
        <span className="nm">{name}</span>
        <span className={"fav " + (star ? "on" : "")}>★</span>
        <span className="cnt">{count}</span>
      </div>
      <div className="plrow-bot">
        <div className="pbar">
          <i style={{ width: progress + "%" }} />
        </div>
        <span className="pct">{progress}%</span>
      </div>
    </div>
  );
}

function PlaylistMock() {
  return (
    <div className="mock-plist">
      {/* サイドバー（実アプリ準拠: ダークネイビー） */}
      <div className="side">
        <div className="brand-row">
          <span className="brand">Linkori</span>
          <span className="spacer" />
          <span className="icobtn">JA</span>
          <span className="icobtn" title="テーマ切替">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </span>
          <span className="icobtn">
            <Ico name="plus" size={11} />
          </span>
        </div>
        <div className="filter">
          <span className="chip active">すべて</span>
          <span className="chip">
            <Ico name="star" size={9} />
          </span>
          <span
            className="chip"
            style={{
              background: TAG_COLORS.ocean.hex,
              color: TAG_COLORS.ocean.fg,
              border: "none",
            }}
          >
            seinen
          </span>
          <span
            className="chip"
            style={{
              background: TAG_COLORS.coral.hex,
              color: TAG_COLORS.coral.fg,
              border: "none",
            }}
          >
            action
          </span>
          <span
            className="chip"
            style={{
              background: TAG_COLORS.forest.hex,
              color: TAG_COLORS.forest.fg,
              border: "none",
            }}
          >
            finished
          </span>
        </div>
        <div className="list">
          <PListRow name="VAGABOND" star status="read" progress={72} active />
          <PListRow
            name="BERSERK"
            status="unread"
            progress={34}
            tagColor="coral"
          />
          <PListRow
            name="AKIRA"
            star
            status="read"
            progress={100}
            tagColor="lemon"
          />
          <PListRow
            name="HUNTER x"
            status="unread"
            progress={12}
            tagColor="forest"
          />
          <PListRow name="MONSTER" progress={55} tagColor="grape" />
          <PListRow name="PLUTO" status="read" progress={88} tagColor="ocean" />
        </div>
      </div>
      {/* メインパネル（チャンク一覧） */}
      <div className="main">
        <div className="head">
          <div>
            <div className="title">VAGABOND</div>
            <div className="meta">
              <span className="metatxt">5 チャンク</span>
            </div>
          </div>
          <div className="actions">
            <span className="hdbtn">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              サムネ表示
            </span>
            <span className="hdbtn">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="15" y2="12" />
                <line x1="3" y1="18" x2="9" y2="18" />
              </svg>
              並び替え
            </span>
            <span className="cta">ビューアで開く</span>
          </div>
        </div>
        <div className="chunks">
          {[
            {
              n: "序章 — 旅立ち",
              start: "D:/manga/vol_01/001.jpg",
              end: "042.jpg",
              cnt: 42,
              type: "JPG",
            },
            {
              n: "第一巻 — 出会い",
              start: "D:/manga/vol_01_raw",
              end: "",
              cnt: 86,
              type: "Folder",
              sel: true,
            },
            {
              n: "第二巻 — 修練",
              start: "D:/manga/vol_02.zip",
              end: "",
              cnt: 120,
              type: "ZIP",
            },
            {
              n: "第三巻 — 決戦",
              start: "D:/manga/vol_03.pdf",
              end: "",
              cnt: 64,
              type: "PDF",
            },
          ].map((ch, i) => (
            <div key={i} className={"chunk " + (ch.sel ? "selected" : "")}>
              <div className="grip">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="body">
                <div className="name">{ch.n}</div>
                <div className="pathline">
                  <span className="lbl">START:</span>
                  <span className="pth">{ch.start}</span>
                </div>
                {ch.end && (
                  <div className="pathline">
                    <span className="lbl">END:</span>
                    <span className="pth">{ch.end}</span>
                  </div>
                )}
                <span className="count-badge">{ch.cnt}枚</span>
              </div>
              <span className="eyebtn">
                <Ico name="eye" size={12} />
              </span>
            </div>
          ))}
          <div className="addchunk">
            <Ico name="plus" size={11} />
            チャンクを追加
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewerMock({ showSidebar = true }) {
  return (
    <div className="mock-viewer">
      {/* 左上ホバー UI（実アプリ: ホーム / フルスクリーン / チャンク編集 / 見開き切替） */}
      <div className="top">
        <span className="topbtn">
          <Ico name="arrow" size={10} />
          ホーム
        </span>
        <span className="topbtn icon">
          <Ico name="expand" size={11} />
        </span>
        <span className="topbtn icon">
          <Ico name="list" size={11} />
        </span>
        <span className="seg">
          <span>1枚</span>
          <span className="on">2枚</span>
        </span>
      </div>
      <div className="pages">
        {/* 右→左読み: 先に R（次ページ）、続いて L */}
        <div className="pg R">
          <div
            className="panel-mini"
            style={{ top: "8%", left: "10%", right: "10%", height: "40%" }}
          />
          <div
            className="panel-mini"
            style={{ top: "52%", left: "10%", right: "10%", height: "40%" }}
          />
        </div>
        <div className="pg L">
          <div
            className="panel-mini"
            style={{ top: "8%", left: "10%", right: "10%", height: "30%" }}
          />
          <div
            className="panel-mini"
            style={{ top: "42%", left: "10%", width: "38%", height: "22%" }}
          />
          <div
            className="panel-mini"
            style={{ top: "42%", right: "10%", width: "38%", height: "22%" }}
          />
          <div
            className="panel-mini"
            style={{ top: "68%", left: "10%", right: "10%", height: "24%" }}
          />
        </div>
        {/* v0.5.0 — ビューア内チャンク編集サイドバー（右スライドイン） */}
        {showSidebar && (
          <div className="side-sheet">
            <div className="ss-head">
              <div>
                <div className="ss-title">VAGABOND</div>
                <div className="ss-sub">4 チャンク</div>
              </div>
              <span className="closebtn">
                <Ico name="x" size={13} />
              </span>
            </div>
            <div className="ss-body">
              {[
                { n: "序章 — 旅立ち", type: "JPG · 42枚", cnt: "42" },
                {
                  n: "第一巻 — 出会い",
                  type: "Folder · 86枚",
                  cnt: "86",
                  sel: true,
                },
                { n: "第二巻 — 修練", type: "ZIP · 120枚", cnt: "120" },
                { n: "第三巻 — 決戦", type: "PDF · 64枚", cnt: "64" },
              ].map((c, i) => (
                <div key={i} className={"ss-row " + (c.sel ? "selected" : "")}>
                  <div className="ssgrip">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div>
                    <div className="nm">{c.n}</div>
                    <div className="mt">{c.type}</div>
                  </div>
                  <span className="ssbadge">{c.cnt}</span>
                </div>
              ))}
              <div className="ss-add">
                <Ico name="plus" size={12} />
                <span>チャンクを追加</span>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* ページバー（実アプリ: 2段構成） */}
      <div className="bar">
        <div className="bar-top">
          <span className="remaining">残り 44 ページ</span>
          <span className="chunkname">第一巻 — 出会い</span>
          <span className="pgnum">
            <b>42</b> / 86
          </span>
        </div>
        <div className="bar-bot">
          <span className="navbtn">
            <Ico
              name="caret"
              size={12}
              style={{ transform: "rotate(90deg)" }}
            />
          </span>
          <div className="progress">
            <span className="tick" style={{ right: "20%" }} />
            <span className="tick" style={{ right: "50%" }} />
            <span className="tick" style={{ right: "80%" }} />
            <i />
            <span className="handle" />
          </div>
          <span className="navbtn">
            <Ico
              name="caret"
              size={12}
              style={{ transform: "rotate(-90deg)" }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}

function BrowserMock() {
  const rows = [
    { n: "vol_01.zip", t: "ZIP", d: "2026-04-12", sel: true },
    { n: "vol_02.zip", t: "ZIP", d: "2026-04-10" },
    { n: "vol_03_raw", t: "Folder", d: "2026-04-05" },
    { n: "chapter_05", t: "Folder", d: "2026-04-03" },
    { n: "extras.pdf", t: "PDF", d: "2026-03-29" },
    { n: "covers_hi.cbz", t: "CBZ", d: "2026-03-22" },
    { n: "interview.pdf", t: "PDF", d: "2026-03-18" },
    { n: "scan_a01", t: "Folder", d: "2026-03-12" },
    { n: "scan_a02", t: "Folder", d: "2026-03-12" },
  ];
  return (
    <div className="mock-browser">
      {/* 左: クイックアクセス + ドライブ（アプリ準拠のナビーサイドバー） */}
      <div className="drives">
        <div className="h">Quick</div>
        <div className="d">
          <Ico name="folder" size={11} />
          デスクトップ
        </div>
        <div className="d">
          <Ico name="folder" size={11} />
          ダウンロード
        </div>
        <div className="d">
          <Ico name="folder" size={11} />
          ドキュメント
        </div>
        <div className="d">
          <Ico name="folder" size={11} />
          ピクチャ
        </div>
        <div className="divider" />
        <div className="h">Drives</div>
        <div className="d active">
          <Ico name="archive" size={11} />
          C:
        </div>
        <div className="d">
          <Ico name="archive" size={11} />
          D:
        </div>
      </div>
      {/* 右: メイン（ライトテーマ） */}
      <div className="main">
        <div className="crumbs">
          <span className="back">
            <Ico name="arrow" size={12} />
          </span>
          <div className="addr">
            <span className="seg">C:</span>
            <span className="sep">&gt;</span>
            <span className="seg">Users</span>
            <span className="sep">&gt;</span>
            <span className="seg">manga</span>
            <span className="sep">&gt;</span>
            <span className="seg active">vol_01</span>
          </div>
          <span className="search">
            <Ico name="search" size={11} />
            検索…
          </span>
          <span className="vmode">
            <span className="on">
              <Ico name="list" size={11} />
            </span>
            <span>
              <Ico name="expand" size={11} />
            </span>
          </span>
        </div>
        <div className="cols">
          <span>名前 ▾</span>
          <span>種類</span>
          <span>更新日時</span>
        </div>
        <div className="files">
          {rows.map((r, i) => (
            <div key={i} className={"f " + (r.sel ? "sel" : "")}>
              <span className="n">
                <Ico
                  name={
                    r.t === "Folder"
                      ? "folder"
                      : r.t === "PDF"
                        ? "file"
                        : "archive"
                  }
                  size={13}
                />
                {r.n}
              </span>
              <span className="t">{r.t}</span>
              <span className="d">{r.d}</span>
            </div>
          ))}
        </div>
        <div className="footer">
          <span className="pill">この ZIP を選択</span>
          <span className="spacer" />
          <span className="muted">9 items</span>
        </div>
      </div>
    </div>
  );
}

// チャンク複数選択モック（サイドバー無し・メインパネル全幅で「チャンク」に焦点）
function ChunkSelectPanel() {
  const chunks = [
    {
      n: "序章 — 旅立ち",
      start: "D:/manga/vol_01/001.jpg",
      end: "042.jpg",
      cnt: 42,
    },
    {
      n: "第一巻 — 出会い",
      start: "D:/manga/vol_01_raw",
      end: "",
      cnt: 86,
      sel: true,
    },
    {
      n: "第二巻 — 修練",
      start: "D:/manga/vol_02.zip",
      end: "",
      cnt: 120,
      sel: true,
    },
    {
      n: "第三巻 — 決戦",
      start: "D:/manga/vol_03.pdf",
      end: "",
      cnt: 64,
      sel: true,
    },
    { n: "外伝 — 追憶", start: "D:/manga/bonus", end: "", cnt: 28 },
  ];
  const selCount = chunks.filter((c) => c.sel).length;
  return (
    <div className="mock-plist chunk-focus">
      <div className="main">
        <div className="head">
          <div>
            <div className="title">VAGABOND</div>
            <div className="meta">
              <span className="metatxt">5 チャンク</span>
            </div>
          </div>
          <div className="actions">
            <span className="hdbtn">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              サムネ表示
            </span>
            <span className="hdbtn">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="15" y2="12" />
                <line x1="3" y1="18" x2="9" y2="18" />
              </svg>
              並び替え
            </span>
            <span className="cta">ビューアで開く</span>
          </div>
        </div>
        <div className="chunks">
          {chunks.map((ch, i) => (
            <div key={i} className={"chunk " + (ch.sel ? "selected" : "")}>
              <div className="grip">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="body">
                <div className="name">{ch.n}</div>
                <div className="pathline">
                  <span className="lbl">START:</span>
                  <span className="pth">{ch.start}</span>
                </div>
                {ch.end && (
                  <div className="pathline">
                    <span className="lbl">END:</span>
                    <span className="pth">{ch.end}</span>
                  </div>
                )}
                <span className="count-badge">{ch.cnt}枚</span>
              </div>
              <span className="eyebtn">
                <Ico name="eye" size={12} />
              </span>
            </div>
          ))}
        </div>
        {/* 複数選択フローティングバー（実アプリ準拠: 選択数・全選択・選択解除・削除） */}
        <div className="selbar">
          <span className="sel-count">{selCount}件選択中</span>
          <span className="sel-link">全選択</span>
          <span className="sel-link">選択解除</span>
          <span className="sel-delete">{selCount}件を削除</span>
        </div>
      </div>
    </div>
  );
}

// Windows 11 風クローム（タイトル左 / 制御右）
function WinChrome({ title }) {
  return (
    <div className="chrome">
      <span className="ti">{title}</span>
      <span className="wc" aria-hidden>
        <svg
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <line x1="2" y1="5" x2="8" y2="5" />
        </svg>
      </span>
      <span className="wc" aria-hidden>
        <svg
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <rect x="2" y="2" width="6" height="6" />
        </svg>
      </span>
      <span className="wc close" aria-hidden>
        <svg
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <line x1="2" y1="2" x2="8" y2="8" />
          <line x1="8" y1="2" x2="2" y2="8" />
        </svg>
      </span>
    </div>
  );
}
// full-cell mocks（プレビュー用: Windows風クローム付き）
function WithChrome({ title, children }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WinChrome title={title} />
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
function PlaylistMockFull() {
  return (
    <WithChrome title="Linkori">
      <PlaylistMock />
    </WithChrome>
  );
}
function ViewerMockFull() {
  return (
    <WithChrome title="Linkori — Viewer">
      <ViewerMock showSidebar={false} />
    </WithChrome>
  );
}
function BrowserMockFull() {
  return (
    <WithChrome title="Linkori — File Browser">
      <BrowserMock />
    </WithChrome>
  );
}

window.Overview = Overview;
window.Screens = Screens;
window.PlaylistSec = PlaylistSec;
window.ChunksSec = ChunksSec;
window.BrowserSec = BrowserSec;
window.ViewerSec = ViewerSec;
window.ShortcutsSec = ShortcutsSec;
window.NewSec = NewSec;
window.DownloadSec = DownloadSec;
window.Footer = Footer;
