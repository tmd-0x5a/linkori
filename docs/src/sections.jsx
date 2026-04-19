// Main content sections
const { useContext: uC, useRef: uR } = React;

const mapLang = (obj, lang) => obj?.[lang] ?? obj?.en ?? obj;

// ─── 01 Overview ───
function Overview(){
  const { lang } = uC(LangCtx);
  const ref = uR(null); useReveal(ref); useCardSpot();
  const c = COPY.overview;
  const icos = ["monitor","list","folder","clock","archive","globe"];
  return (
    <section className="section" id="features" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow,lang)}</span>
            <h2>{mapLang(c.title,lang)}</h2>
            <p>{mapLang(c.sub,lang)}</p>
          </div>
          <div className="section-counter">6 FEATURES</div>
        </div>
        <div className="grid g3">
          {c.items.map((it,i)=>(
            <div key={i} className="card spot reveal" style={{'--d':(i*60)+'ms'}}>
              <div className="ico"><Ico name={icos[i]}/></div>
              <h3>{mapLang(it.t,lang)}</h3>
              <p>{mapLang(it.d,lang)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Screenshots ───
function Screens(){
  const { lang } = uC(LangCtx);
  const ref = uR(null); useReveal(ref);
  return (
    <section className="section" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{lang==='ja'?'プレビュー':'PREVIEW'}</span>
            <h2>{lang==='ja'?<>見てみよう。</>:<>See it in action.</>}</h2>
            <p>{lang==='ja'?'モックで再現したアプリの各画面。プレイリスト、ビューア、ファイルブラウザ。':'App screens, reimagined as mocks. Playlist, viewer, file browser.'}</p>
          </div>
          <div className="section-counter">3 SCREENS</div>
        </div>
        <div className="ss">
          <div className="cell reveal" data-par="0.3">
            <PlaylistMockFull/>
            <div className="cap"><b>{lang==='ja'?'プレイリスト':'Playlist'}</b><span>{lang==='ja'?'タグ色・お気に入り':'Tag colors · favorites'}</span></div>
          </div>
          <div className="cell reveal" style={{'--d':'120ms'}} data-par="0.5">
            <ViewerMockFull/>
            <div className="cap"><b>{lang==='ja'?'ビューア':'Viewer'}</b><span>{lang==='ja'?'見開き・RTL・編集':'Spread · RTL · edit'}</span></div>
          </div>
          <div className="cell reveal" style={{'--d':'240ms'}} data-par="0.3">
            <BrowserMockFull/>
            <div className="cap"><b>{lang==='ja'?'ファイルブラウザ':'File Browser'}</b><span>{lang==='ja'?'検索・サムネイル':'Search · thumbnails'}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 02 Playlist feature row ───
function PlaylistSec(){
  const { lang } = uC(LangCtx);
  const ref = uR(null); useReveal(ref);
  const c = COPY.playlist;
  return (
    <section className="section" id="playlist" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow,lang)}</span>
            <h2>{mapLang(c.title,lang)}</h2>
            <p>{mapLang(c.sub,lang)}</p>
          </div>
          <div className="section-counter">sidebar · tags · status</div>
        </div>
        <div className="feature-row">
          <div className="feature-copy reveal">
            <ul>
              {c.bullets.map((b,i)=> <li key={i}>{mapLang(b,lang)}</li>)}
            </ul>
          </div>
          <div className="mock reveal" style={{'--d':'100ms'}} data-par="0.4">
            <div className="chrome"><i className="tl"/><i className="tl"/><i className="tl"/><span className="ti">linkori — playlist</span></div>
            <PlaylistMock/>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 03 Chunks ───
function ChunksSec(){
  const { lang } = uC(LangCtx);
  const ref = uR(null); useReveal(ref);
  const c = COPY.chunk;
  return (
    <section className="section" id="chunks" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow,lang)}</span>
            <h2>{mapLang(c.title,lang)}</h2>
            <p>{mapLang(c.sub,lang)}</p>
          </div>
          <div className="section-counter">chain · range · reverse</div>
        </div>

        {/* Chunk chain visualization */}
        <div className="reveal" style={{overflow:'hidden', marginBottom:60}}>
          <div className="chain-track" style={{paddingBottom:20}}>
            {[
              {n:'01', name:'Vol.01 — prologue', meta:'ZIP · 42p'},
              {n:'02', name:'Vol.01 — arc A', meta:'Folder · 86p'},
              {n:'03', name:'Vol.02', meta:'PDF · 120p'},
              {n:'04', name:'Extras', meta:'CBZ · 18p'},
              {n:'05', name:'Vol.03 — finale', meta:'Folder · 64p'},
            ].map((x,i)=>(
              <div key={i} className="chain-node">
                <span className="badge">{x.n}</span>
                <h4>CHUNK</h4>
                <div className="ti">{x.name}</div>
                <div className="meta">{x.meta}</div>
                <div className="link"/>
              </div>
            ))}
          </div>
        </div>

        <div className="reveal" style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}>
          <div className="feature-copy" style={{ maxWidth: 800 }}>
            <h3 style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{lang==='ja'?'柔軟な範囲指定。':'Flexible range.'}</h3>
            <p style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{lang==='ja'?'1画像から1フォルダまで、どこでも始点・終点に指定できる。':'Start anywhere, end anywhere — single image to a full folder.'}</p>
            <ul>{c.bullets.map((b,i)=> <li key={i} style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{mapLang(b,lang)}</li>)}</ul>
          </div>
        </div>

        {/* Group drag */}
        <div className="reveal" style={{marginTop:60, textAlign:'center', padding:'40px 0'}}>
          <h3 style={{fontFamily:'var(--display)', fontSize:'clamp(32px,4vw,56px)', fontWeight:700, letterSpacing:'-.03em', marginBottom:12}}>
            {mapLang(c.group.title,lang)}
          </h3>
          <p style={{color:'var(--fg-dim)', fontSize:17, maxWidth:540, margin:'0 auto 40px'}}>{mapLang(c.group.sub,lang)}</p>
          <div className="grid g4" style={{marginTop:40}}>
            {c.group.actions.map((a,i)=>(
              <div key={i} className="card reveal" style={{'--d':(i*50)+'ms', textAlign:'left'}}>
                <div className="ico"><Ico name={['arrow','plus','caret','move'][i]}/></div>
                <h3 style={{fontFamily:'var(--mono)', fontSize:14, letterSpacing:0}}>{mapLang(a.k,lang)}</h3>
                <p>{mapLang(a.d,lang)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="reveal" style={{marginTop:80}}>
          <h3 style={{fontFamily:'var(--display)', fontSize:'clamp(28px,3vw,42px)', fontWeight:700, letterSpacing:'-.03em', marginBottom:32}}>
            {mapLang(c.tools.title,lang)}
          </h3>
          <div className="grid g3">
            {c.tools.items.map((it,i)=>(
              <div key={i} className="card spot reveal" style={{'--d':(i*60)+'ms'}}>
                <div className="ico"><Ico name={['bars','split','undo'][i]}/></div>
                <h3>{mapLang(it.t,lang)}</h3>
                <p>{mapLang(it.d,lang)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 04 Browser ───
function BrowserSec(){
  const { lang } = uC(LangCtx);
  const ref = uR(null); useReveal(ref);
  const c = COPY.browser;
  return (
    <section className="section" id="browser" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow,lang)}</span>
            <h2>{mapLang(c.title,lang)}</h2>
            <p>{mapLang(c.sub,lang)}</p>
          </div>
          <div className="section-counter">drives · search · thumbs</div>
        </div>
        <div className="feature-row">
          <div className="mock reveal" data-par="0.4">
            <div className="chrome"><i className="tl"/><i className="tl"/><i className="tl"/><span className="ti">linkori — file browser</span></div>
            <BrowserMock/>
          </div>
          <div className="feature-copy reveal" style={{'--d':'100ms'}}>
            <ul>{c.bullets.map((b,i)=> <li key={i}>{mapLang(b,lang)}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 05 Viewer ───
function ViewerSec(){
  const { lang } = uC(LangCtx);
  const ref = uR(null); useReveal(ref);
  const c = COPY.viewer;
  return (
    <section className="section" id="viewer" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow,lang)}</span>
            <h2>{mapLang(c.title,lang)}</h2>
            <p>{mapLang(c.sub,lang)}</p>
          </div>
          <div className="section-counter">spread · RTL · instant</div>
        </div>
        <div className="reveal" style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}>
          <div className="feature-copy" style={{ maxWidth: 800 }}>
            <ul>{c.bullets.map((b,i)=> <li key={i} style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', fontSize: '16px', marginBottom: '12px' }}>{mapLang(b,lang)}</li>)}</ul>
          </div>
        </div>

        {/* v0.5.0 — ビューア機能詳細モック（チャンク編集サイドバー込み） */}
        <div className="reveal vshowcase" data-par="0.3" style={{marginTop:32}}>
          <ViewerShowcaseMock/>
        </div>

        <div className="reveal" style={{marginTop:60}}>
          <h3 style={{fontFamily:'var(--display)', fontSize:'clamp(28px,3vw,42px)', fontWeight:700, letterSpacing:'-.03em', marginBottom:12}}>
            {mapLang(c.bar.title,lang)}
          </h3>
          <p style={{color:'var(--fg-dim)', marginBottom:32}}>{mapLang(c.bar.sub,lang)}</p>
          <div className="grid g3">
            {c.bar.items.map((it,i)=>(
              <div key={i} className="card spot reveal" style={{'--d':(i*60)+'ms'}}>
                <div className="ico"><Ico name={['bars','split2','arrow'][i]}/></div>
                <h3>{mapLang(it.t,lang)}</h3>
                <p>{mapLang(it.d,lang)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 06 Shortcuts ───
function ShortcutsSec(){
  const { lang } = uC(LangCtx);
  const ref = uR(null); useReveal(ref);
  const c = COPY.shortcuts;
  return (
    <section className="section" id="shortcuts" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow,lang)}</span>
            <h2>{mapLang(c.title,lang)}</h2>
            <p>{mapLang(c.sub,lang)}</p>
          </div>
          <div className="section-counter">keyboard-first</div>
        </div>
        <div className="kbd-table">
          {c.groups.map((g,i)=>(
            <div key={i} className="kbd-card reveal" style={{'--d':(i*80)+'ms'}}>
              <h3><span className="ico"><Ico name={['arrow','expand','list'][i]} size={14}/></span>{mapLang(g.t,lang)}</h3>
              {g.rows.map((r,j)=>(
                <div key={j} className="kbd-row">
                  <div className="kbd-act">{mapLang(r.a,lang)}</div>
                  <div className="kbd-keys">
                    {r.k.map((k,n)=> <kbd key={n} className={r.mouse?'mouse':''}>{k}</kbd>)}
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
function NewSec(){
  const { lang } = uC(LangCtx);
  const ref = uR(null); useReveal(ref);
  const c = COPY.whatsnew;
  return (
    <section className="section" id="new" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow,lang)}</span>
            <h2>{mapLang(c.title,lang)}</h2>
            <p>{mapLang(c.sub,lang)}</p>
          </div>
          <div className="section-counter">RELEASED · 2025</div>
        </div>
        <div className="new-grid">
          {c.items.map((it,i)=>(
            <div key={i} className="new-card reveal" style={{'--d':(i*80)+'ms'}}>
              <div className="num">0{i+1}</div>
              <div>
                <span className="new-tag">NEW</span>
                <h3>{mapLang(it.t,lang)}</h3>
                <p>{mapLang(it.d,lang)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 08 Formats + Download CTA ───
function DownloadSec(){
  const { lang } = uC(LangCtx);
  const ref = uR(null); useReveal(ref);
  const c = COPY.formats; const d = COPY.download;
  return (
    <section className="section" id="download" ref={ref}>
      <div className="wrap">
        <div className="section-head-row reveal">
          <div className="section-head">
            <span className="eyebrow">{mapLang(c.eyebrow,lang)}</span>
            <h2>{mapLang(c.title,lang)}</h2>
          </div>
        </div>
        <div className="fmt-row reveal">
          {c.list.map((f,i)=> <span key={i} className="fmt-pill"><i className="b"/>{f}</span>)}
        </div>

        <div className="download-card reveal" style={{'--d':'120ms'}}>
          <div>
            <h3>{mapLang(d.title,lang)}</h3>
            <p>{mapLang(d.sub,lang)}</p>
            <div className="sys">{mapLang(d.sys,lang)}</div>
          </div>
          <DownloadAnchor className="btn-primary" style={{fontSize:16, padding:'18px 28px'}}>
            <Ico name="dl" size={18}/><span>{mapLang(d.cta,lang)}</span>
          </DownloadAnchor>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───
function Footer(){
  const { lang } = uC(LangCtx);
  return (
    <footer className="footer" style={{ paddingBottom: '80px' }}>
      <div className="wrap">
        <div className="footer-inner" style={{ marginBottom: '40px' }}>
          <div className="footer-brand">Link<em>ori</em></div>
          <div className="footer-meta">
            <div>© 2026 tmd-0x5a · MIT License</div>
            <div><a href="https://github.com/tmd-0x5a/linkori">GitHub</a></div>
          </div>
        </div>
        <div className="footer-disclaimer" style={{
          fontSize: '11px', color: 'var(--fg-mute)', lineHeight: '1.6',
          borderTop: '1px solid var(--border)', paddingTop: '20px',
          fontFamily: 'var(--sans)', wordBreak: 'keep-all', overflowWrap: 'break-word', whiteSpace: 'pre-line', lineBreak: 'strict'
        }}>
          {lang === 'ja' ? `免責事項
本ソフトウェアは現状有姿（AS IS）で提供されます。
使用によって生じたいかなる損害についても、作者は責任を負いません。
著作権で保護されたコンテンツの取り扱いは、ユーザー自身の責任において適法に行ってください。
本ソフトウェアはローカル環境のみで動作し、外部サーバーへのデータ送信は一切行いません。` : `Disclaimer
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
  navy:    '#0f1d4a',
  blue:    '#2f8fd1',
  skyDim:  '#9fd8e8',
  skyMid:  'rgba(159,216,232,.60)',
  skyLow:  'rgba(159,216,232,.25)',
  yellow:  '#fbbd41',
};
// v0.5.0 タグ色パレット（17色から代表色を抜粋）
const TAG_COLORS = {
  ocean:       { hex:'#2f8fd1', fg:'#fff' },
  forest:      { hex:'#078a52', fg:'#fff' },
  lemon:       { hex:'#fbbd41', fg:'#0a1628' },
  coral:       { hex:'#f0673f', fg:'#fff' },
  grape:       { hex:'#c1b0ff', fg:'#0a1628' },
  pomegranate: { hex:'#fc7981', fg:'#0a1628' },
};

// アプリ準拠のプレイリスト行
function PListRow({ name, star, progress, status, active, tagColor }){
  const tc = tagColor ? TAG_COLORS[tagColor] : null;
  const tint = tc ? `${tc.hex}33` : null;
  const border = tc ? `${tc.hex}66` : undefined;
  const dot = status === 'read' ? '#42c97a' : status === 'unread' ? APP.yellow : null;
  return (
    <div className={'plrow '+(active?'active':'')}
         style={tint && !active ? {background:tint, borderColor:border}:undefined}>
      <div className="plrow-left">
        {dot && <span className="dot" style={{background:dot}}/>}
        {star && <Ico name="star" size={10}/>}
        <span className="nm">{name}</span>
      </div>
      <div className="pbar"><i style={{width:progress+'%'}}/></div>
    </div>
  );
}

function PlaylistMock(){
  return (
    <div className="mock-plist">
      {/* サイドバー（実アプリ準拠: ダークネイビー） */}
      <div className="side">
        <div className="brand-row">
          <span className="brand">Linkori</span>
          <span className="spacer"/>
          <span className="icobtn">JA</span>
          <span className="icobtn"><Ico name="plus" size={11}/></span>
        </div>
        <div className="filter">
          <span className="chip active">All</span>
          <span className="chip"><Ico name="star" size={9}/></span>
          <span className="chip" style={{background:TAG_COLORS.ocean.hex, color:TAG_COLORS.ocean.fg, border:'none'}}>seinen</span>
          <span className="chip" style={{background:TAG_COLORS.coral.hex, color:TAG_COLORS.coral.fg, border:'none'}}>action</span>
          <span className="chip" style={{background:TAG_COLORS.forest.hex, color:TAG_COLORS.forest.fg, border:'none'}}>finished</span>
        </div>
        <div className="list">
          <PListRow name="VAGABOND"  star status="read"   progress={72}  active/>
          <PListRow name="BERSERK"        status="unread" progress={34}  tagColor="coral"/>
          <PListRow name="AKIRA"     star status="read"   progress={100} tagColor="lemon"/>
          <PListRow name="HUNTER x"       status="unread" progress={12}  tagColor="forest"/>
          <PListRow name="MONSTER"                        progress={55}  tagColor="grape"/>
          <PListRow name="PLUTO"          status="read"   progress={88}  tagColor="ocean"/>
        </div>
      </div>
      {/* メインパネル（チャンク一覧） */}
      <div className="main">
        <div className="head">
          <div>
            <div className="title">VAGABOND</div>
            <div className="meta">
              <span className="tagpill" style={{background:TAG_COLORS.ocean.hex, color:TAG_COLORS.ocean.fg}}>seinen</span>
              <span className="tagpill" style={{background:TAG_COLORS.coral.hex, color:TAG_COLORS.coral.fg}}>action</span>
              <span className="metatxt">5 chunks · 330p · 72%</span>
            </div>
          </div>
          <div className="actions">
            <span className="iconbtn"><Ico name="bars" size={12}/></span>
            <span className="iconbtn"><Ico name="eye"  size={12}/></span>
            <span className="cta"><Ico name="plus" size={12}/>Read</span>
          </div>
        </div>
        <div className="chunks">
          {[
            {n:'Vol.01 — prologue', c:'42 pages',  type:'ZIP'},
            {n:'Vol.01 — arc A',    c:'86 pages',  type:'Folder', sel:true},
            {n:'Vol.02 — arc B',    c:'120 pages', type:'PDF'},
            {n:'Vol.03 — finale',   c:'64 pages',  type:'CBZ'},
          ].map((ch,i)=>(
            <div key={i} className={'chunk '+(ch.sel?'selected':'')}>
              <div className="thumb"/>
              <div className="body">
                <div className="name">{ch.n}</div>
                <div className="count">{ch.type} · {ch.c}</div>
              </div>
              <span className="badge">{String(i+1).padStart(2,'0')}</span>
              <Ico name="dots" size={13}/>
            </div>
          ))}
          <div className="addchunk"><Ico name="plus" size={11}/>Add chunk</div>
        </div>
      </div>
    </div>
  );
}

function ViewerMock({showSidebar=true}){
  return (
    <div className="mock-viewer">
      {/* 上部ホームボタン（実アプリの Home アイコン） */}
      <div className="top">
        <span className="homebtn"><Ico name="arrow" size={11}/></span>
        <span className="spacer"/>
        <span className="homebtn"><Ico name="edit" size={11}/></span>
        <span className="homebtn"><Ico name="expand" size={11}/></span>
      </div>
      <div className="pages">
        {/* 右→左読み: 先に R（次ページ）、続いて L */}
        <div className="pg R">
          <div className="panel-mini" style={{top:'8%', left:'10%', right:'10%', height:'40%'}}/>
          <div className="panel-mini" style={{top:'52%', left:'10%', right:'10%', height:'40%'}}/>
        </div>
        <div className="pg L">
          <div className="panel-mini" style={{top:'8%', left:'10%', right:'10%', height:'30%'}}/>
          <div className="panel-mini" style={{top:'42%', left:'10%', width:'38%', height:'22%'}}/>
          <div className="panel-mini" style={{top:'42%', right:'10%', width:'38%', height:'22%'}}/>
          <div className="panel-mini" style={{top:'68%', left:'10%', right:'10%', height:'24%'}}/>
        </div>
        {/* v0.5.0 — ビューア内チャンク編集サイドバー（右スライドイン） */}
        {showSidebar && (
          <div className="side-sheet">
            <div className="ss-head">
              <span>CHUNKS · 4</span>
              <Ico name="x" size={11}/>
            </div>
            {[
              {n:'Vol.01 — prologue', type:'ZIP · 42p'},
              {n:'Vol.01 — arc A',    type:'Folder · 86p', sel:true},
              {n:'Vol.02 — arc B',    type:'PDF · 120p'},
              {n:'Vol.03 — finale',   type:'CBZ · 64p'},
            ].map((c,i)=>(
              <div key={i} className={'ss-row '+(c.sel?'selected':'')}>
                <span className="idx">{String(i+1).padStart(2,'0')}</span>
                <div>
                  <div className="nm">{c.n}</div>
                  <div className="mt">{c.type}</div>
                </div>
              </div>
            ))}
            <div className="ss-add"><Ico name="plus" size={11}/><span>ADD CHUNK</span></div>
          </div>
        )}
      </div>
      {/* ページバー */}
      <div className="bar">
        <span className="navbtn"><Ico name="caret" size={10}/></span>
        <span className="chunkname">Vol.01 — arc A</span>
        <div className="progress">
          <span className="tick" style={{right:'20%'}}/>
          <span className="tick" style={{right:'50%'}}/>
          <span className="tick" style={{right:'80%'}}/>
          <i/>
          <span className="handle"/>
        </div>
        <span className="pgnum">42 / 86</span>
        <span className="navbtn"><Ico name="caret" size={10} style={{transform:'rotate(180deg)'}}/></span>
      </div>
    </div>
  );
}

function BrowserMock(){
  const rows = [
    {n:'vol_01.zip',      t:'ZIP',    d:'2026-04-12', sel:true},
    {n:'vol_02.zip',      t:'ZIP',    d:'2026-04-10'},
    {n:'vol_03_raw',      t:'Folder', d:'2026-04-05'},
    {n:'chapter_05',      t:'Folder', d:'2026-04-03'},
    {n:'extras.pdf',      t:'PDF',    d:'2026-03-29'},
    {n:'covers_hi.cbz',   t:'CBZ',    d:'2026-03-22'},
    {n:'interview.pdf',   t:'PDF',    d:'2026-03-18'},
    {n:'scan_a01',        t:'Folder', d:'2026-03-12'},
    {n:'scan_a02',        t:'Folder', d:'2026-03-12'},
  ];
  return (
    <div className="mock-browser">
      {/* 左: ドライブ & クイックアクセス */}
      <div className="drives">
        <div className="h">Drives</div>
        <div className="d active"><Ico name="folder" size={11}/>C:</div>
        <div className="d"><Ico name="folder" size={11}/>D:</div>
        <div className="h">Quick</div>
        <div className="d"><Ico name="folder" size={11}/>Desktop</div>
        <div className="d"><Ico name="folder" size={11}/>Downloads</div>
        <div className="d"><Ico name="folder" size={11}/>Documents</div>
        <div className="d"><Ico name="folder" size={11}/>Pictures</div>
      </div>
      {/* 右: メイン */}
      <div className="main">
        <div className="crumbs">
          <Ico name="arrow" size={10}/>
          <span>C:</span><span className="sep">/</span>
          <span>Users</span><span className="sep">/</span>
          <span>manga</span><span className="sep">/</span>
          <span className="active">vol_01</span>
          <span className="spacer"/>
          <span className="search"><Ico name="search" size={10}/>search</span>
          <span className="vmode">
            <span className="on"><Ico name="list" size={10}/></span>
            <span><Ico name="expand" size={10}/></span>
          </span>
        </div>
        <div className="cols">
          <span>Name ▾</span><span>Type</span><span>Modified</span>
        </div>
        <div className="files">
          {rows.map((r,i)=>(
            <div key={i} className={'f '+(r.sel?'sel':'')}>
              <span className="n"><Ico name={r.t==='Folder'?'folder':(r.t==='PDF'?'file':'archive')} size={11}/>{r.n}</span>
              <span className="t">{r.t}</span>
              <span className="d">{r.d}</span>
            </div>
          ))}
        </div>
        <div className="footer">
          <span className="pill">Select this ZIP</span>
          <span className="spacer"/>
          <span className="muted">9 items</span>
        </div>
      </div>
    </div>
  );
}

// ビューア機能詳細モック（ViewerSec 用、全機能を見せる）
function ViewerShowcaseMock(){
  return (
    <div className="mock-viewer-full">
      {/* 見開き + チャンク編集サイドバー */}
      <ViewerMock showSidebar={true}/>
      {/* 機能ラベル */}
      <div className="vlabel l-top"   style={{top:'8%',   left:0}}>
        <span className="dot"/><span>ホームへ戻る</span>
      </div>
      <div className="vlabel l-top2"  style={{top:'8%',   right:0}}>
        <span>チャンク編集 · フルスクリーン</span><span className="dot"/>
      </div>
      <div className="vlabel l-right" style={{top:'38%',  right:0}}>
        <span>チャンク追加 · 並び替え · 削除</span><span className="dot"/>
      </div>
      <div className="vlabel l-left"  style={{top:'48%',  left:0}}>
        <span className="dot"/><span>右→左 · 見開き2ページ</span>
      </div>
      <div className="vlabel l-bot"   style={{bottom:'6%', left:0}}>
        <span className="dot"/><span>チャンク境界 · 現チャンク名 · RTL進捗</span>
      </div>
    </div>
  );
}

// full-cell mocks (screenshot section)
function PlaylistMockFull(){ return <div style={{height:'100%'}}><PlaylistMock/></div>;}
function ViewerMockFull(){   return <div style={{height:'100%'}}><ViewerMock/></div>;}
function BrowserMockFull(){  return <div style={{height:'100%'}}><BrowserMock/></div>;}

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
