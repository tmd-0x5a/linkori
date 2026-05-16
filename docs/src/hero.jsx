// Hero — manga page-flip animation
const { useState: useS, useEffect: useE, useRef: useR, useContext: useC } = React;

function MangaBook(){
  const [page, setPage] = useS(0);
  useE(()=>{
    const id = setInterval(()=> setPage(p => (p+1) % 4), 2800);
    return ()=> clearInterval(id);
  },[]);

  // 4 spreads of faux manga layouts
  const spreads = [
    { key:'a', layout:'l1', sfx:{ja:'ゴゴゴ', en:'BZZT'} },
    { key:'b', layout:'l2', sfx:{ja:'バッ！', en:'WHAM'} },
    { key:'c', layout:'l3', sfx:{ja:'シーン', en:'...'} },
    { key:'d', layout:'l1', sfx:{ja:'パラ', en:'FLIP'} },
  ];

  return (
    <div className="hero-visual">
      <span className="hero-crosshair tl">VIEWER 01</span>
      <span className="hero-crosshair tr">RTL · SPREAD</span>
      <span className="hero-crosshair bl">0.4.0</span>
      <span className="hero-crosshair br">P. {String(page*2+1).padStart(2,'0')}</span>

      <div className="flip">
        <div className="flip-spine"/>
        {/* Back page (always visible) */}
        <div className="flip-page" style={{transform:'translateX(1%) rotateY(0deg)'}}>
          <div className="face">
            <FauxPage layout={spreads[(page+1)%4].layout} scene="scene-c" sfx={spreads[(page+1)%4].sfx.ja}/>
          </div>
        </div>
        {/* Flipping page */}
        <div className="flip-page flipper">
          <FlipperInner page={page} spreads={spreads}/>
        </div>
      </div>
    </div>
  );
}

function FlipperInner({page, spreads}){
  const [flipping, setFlipping] = useS(false);
  useE(()=>{
    setFlipping(true);
    const t = setTimeout(()=> setFlipping(false), 1200);
    return ()=> clearTimeout(t);
  }, [page]);

  return (
    <div style={{
      position:'absolute', inset:0,
      transformOrigin:'left center',
      transformStyle:'preserve-3d',
      transition: flipping ? 'transform 1.2s cubic-bezier(.5,.05,.3,1)' : 'none',
      transform: flipping ? 'rotateY(-180deg)' : 'rotateY(0deg)',
      boxShadow:'0 30px 60px -30px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.06)',
      borderRadius:'6px',
      overflow:'hidden',
    }}>
      <div className="face">
        <FauxPage layout={spreads[page].layout} scene="scene-a" sfx={spreads[page].sfx.ja}/>
      </div>
      <div className="face back">
        <FauxPage layout={spreads[(page+1)%4].layout} scene="scene-d" sfx={spreads[(page+1)%4].sfx.ja}/>
      </div>
    </div>
  );
}

function FauxPage({layout='l1', scene='scene-a', sfx='ゴゴゴ'}){
  // panel layouts
  const P = (extra='')=> <div className={'panel '+extra}/>;
  if(layout==='l1') return (
    <div className={'panels l1 '}>
      <div>{P(scene)}{P('scene-b')}</div>
      {P('scene-c')}
      <div style={{position:'relative'}}>
        {P('scene-d')}
        <span className="sfx" style={{bottom:'14px', left:'14px'}}>{sfx}</span>
      </div>
    </div>
  );
  if(layout==='l2') return (
    <div className={'panels l2 '}>
      <div>{P(scene)}{P('scene-d')}</div>
      <div>{P('scene-b')}{P('scene-c')}{P('scene-a')}</div>
    </div>
  );
  return (
    <div className={'panels l3 '}>
      {P(scene)}
      <div>{P('scene-c')}{P('scene-d')}</div>
      <div style={{position:'relative'}}>
        {P('scene-b')}
        <span className="sfx" style={{top:'10px', right:'14px'}}>{sfx}</span>
      </div>
    </div>
  );
}

function Hero(){
  const { lang } = useC(LangCtx);
  const rootRef = useR(null);
  useReveal(rootRef);

  return (
    <section className="hero" ref={rootRef}>
      <div className="hero-grid">
        <div>
          <div className="hero-badge reveal">
            <span className="pill">NEW</span>
            {COPY.hero.badge[lang]}
          </div>
          <h1 className="reveal" style={{'--d':'80ms'}}>
            <span className="h1-line">{COPY.hero.line1[lang]}</span>
            <span className="h1-line accent">{COPY.hero.line3[lang]}</span>
          </h1>
          <p className="hero-lede reveal" style={{'--d':'160ms'}}>{COPY.hero.lede[lang]}</p>
          <div className="hero-ctas reveal" style={{'--d':'240ms'}}>
            <DownloadAnchor className="btn-primary">
              <Ico name="dl" size={18}/>
              <span>{COPY.hero.cta[lang]}</span>
            </DownloadAnchor>
            <a className="btn-ghost" href="https://github.com/tmd-0x5a/linkori" target="_blank" rel="noopener">
              <Ico name="gh" size={16}/>{COPY.hero.ghost[lang]}
            </a>
          </div>
          <div className="reveal" style={{'--d':'280ms', fontSize: 11, color: 'var(--fg-mute)', marginTop: 8}}>
            {COPY.download.note[lang]}
          </div>
          <div className="hero-meta reveal" style={{'--d':'320ms'}}>
            <span><b>OS</b> {COPY.hero.meta1[lang]}</span>
            <span><b>ARCH</b> {COPY.hero.meta3[lang]}</span>
            <span><b>SIZE</b> ~14 MB</span>
            <span style={{ width: '100%' }}><b>LICENSE</b> {COPY.hero.meta2[lang]}</span>
          </div>
        </div>
        <div className="reveal" style={{'--d':'200ms'}} data-par="0.6">
          <img src="icon.png" alt="Linkori Icon" style={{ maxWidth: '320px', width: '100%', height: 'auto', display: 'block', margin: '0 auto' }} />
        </div>
      </div>
      <div className="scroll-cue">
        <span>{COPY.hero.scroll[lang]}</span>
        <span className="line"/>
      </div>
    </section>
  );
}

window.Hero = Hero;
