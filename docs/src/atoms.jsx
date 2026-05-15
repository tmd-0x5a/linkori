// Shared atoms — icons, nav, buttons, etc.
const { useContext } = React;

// Simple stroke icons (keep it consistent)
const Ico = ({name, size=18}) => {
  const s = { width:size, height:size, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:1.6, strokeLinecap:"round", strokeLinejoin:"round" };
  const paths = {
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
    list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    folder: <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    archive: <><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><line x1="10" y1="12" x2="14" y2="12"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    move: <><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></>,
    dots: <><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></>,
    cal: <><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    split: <><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 01-9 9"/></>,
    undo: <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></>,
    compass: <><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    bars: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    arrow: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    expand: <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>,
    dl: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    gh: <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>,
    arrowR: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    split2: <><path d="M6 3v12"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><path d="M18 8v7a3 3 0 01-3 3H9"/></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    caret: <polyline points="6 9 12 15 18 9"/>,
    trash:<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></>,
    sliders:<><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  };
  return <svg {...s}>{paths[name]}</svg>;
};

const DownloadAnchor = ({ className, children, href, style }) => {
  const { lang } = useContext(LangCtx);
  const [dl, setDl] = React.useState(false);
  
  const handleClick = () => {
    if(dl) return;
    setDl(true);
    setTimeout(() => setDl(false), 2200);
  };

  return (
    <a href={href || "https://github.com/tmd-0x5a/linkori/releases/latest/download/Linkori_0.5.0_x64-setup.zip"}
       className={`${className} ${dl ? 'dl-active' : ''}`}
       style={{...style, transition: 'all 0.2s ease-out'}}
       onClick={handleClick}>
      {dl ? (
        <span style={{display:'inline-flex', alignItems:'center', gap:8, animation: 'dl-fade .2s ease-out'}}>
          <Ico name="check" size={16}/> {lang === 'ja' ? 'ダウンロード開始...' : 'Starting...'}
        </span>
      ) : (
        <span style={{display:'inline-flex', alignItems:'center', gap:8, animation: 'dl-fade .2s ease-out'}}>{children}</span>
      )}
    </a>
  );
};

function Nav(){
  const { lang, setLang } = useContext(LangCtx);
  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="nav-brand"><span className="dot"/>Linkori</div>
        <div className="nav-links">
          <a href="#features">{COPY.nav.features[lang]}</a>
          <a href="#playlist">{COPY.nav.playlist[lang]}</a>
          <a href="#viewer">{COPY.nav.viewer[lang]}</a>
          <a href="#shortcuts">{COPY.nav.shortcuts[lang]}</a>
        </div>
        <div className="nav-lang">
          <button className={lang==='ja'?'active':''} onClick={()=>setLang('ja')}>JA</button>
          <button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button>
        </div>
        <DownloadAnchor className="nav-cta"><Ico name="dl" size={14}/><span>{COPY.nav.download[lang]}</span></DownloadAnchor>
      </div>
    </nav>
  );
}

function Ticker(){
  const { lang } = useContext(LangCtx);
  const items = COPY.ticker.items;
  const doubled = [...items, ...items, ...items, ...items];
  return (
    <div className="ticker">
      <div className="ticker-row">
        {doubled.map((it, i)=>(
          <span key={i}><i className="dotx"/>{it[lang]}</span>
        ))}
      </div>
    </div>
  );
}

window.Ico = Ico;
window.DownloadAnchor = DownloadAnchor;
window.Nav = Nav;
window.Ticker = Ticker;
