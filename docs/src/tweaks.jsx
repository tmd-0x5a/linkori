// Tweaks panel
const { useState: tS, useEffect: tE, useRef: tR } = React;

function Tweaks(){
  const [open, setOpen] = tS(false);
  const [active, setActive] = tS(false); // toggled by host

  const [theme, setTheme] = tS(window.TWEAKS?.theme || 'obsidian');
  const [density, setDensity] = tS(window.TWEAKS?.density || 'cozy');
  const [font, setFont] = tS(window.TWEAKS?.font || 'inter');
  const [accent, setAccent] = tS(window.TWEAKS?.accent || 'cyan');
  const [hero, setHero] = tS(window.TWEAKS?.hero || 'flip');

  // reflect classes on body
  tE(()=>{
    const b = document.body;
    b.className = b.className.split(' ').filter(c =>
      !c.startsWith('theme-') && !c.startsWith('density-') && !c.startsWith('font-') && !c.startsWith('accent-') && !c.startsWith('hero-')
    ).join(' ');
    b.classList.add(`theme-${theme}`, `density-${density}`, `font-${font}`, `accent-${accent}`, `hero-${hero}`);
  }, [theme, density, font, accent, hero]);

  // edit-mode handshake
  tE(()=>{
    const onMsg = (e)=>{
      if(e.data?.type==='__activate_edit_mode') { setActive(true); setOpen(true);}
      if(e.data?.type==='__deactivate_edit_mode'){ setActive(false); setOpen(false);}
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return ()=> window.removeEventListener('message', onMsg);
  },[]);

  // persist
  const persist = (patch)=>{
    window.parent?.postMessage({type:'__edit_mode_set_keys', edits:patch}, '*');
  };
  const setV = (k, v, setter)=>{ setter(v); persist({[k]:v}); };

  if(!active) return null;

  const themes = [['obsidian','紙'],['carbon','ivory'],['ink','墨'],['pulp','kraft']];
  const densities = [['compact','密'],['cozy','標準'],['roomy','疎']];
  const fonts = [['inter','Inter'],['grotesk','Grotesk'],['mono','Mono'],['jp','JP']];
  const accents = [
    ['forest','#1f6b46'],['ink','#1a1810'],['rust','#b8621a'],['indigo','#2c4a7a'],['plum','#6b2d4a']
  ];
  const heros = [['flip','めくり'],['stack','積'],['minimal','簡'],['bigtype','大']];

  return (
    <>
      <button className="tweak-fab" onClick={()=> setOpen(o=>!o)} title="Tweaks">
        <Ico name={open?'x':'sliders'} size={18}/>
      </button>
      {open && (
        <div className="tweak-panel">
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4}}>
            <div style={{fontFamily:'var(--display)', fontSize:13, fontWeight:600}}>Tweaks</div>
            <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--fg-mute)'}}>LINKORI</div>
          </div>

          <div className="tweak-group">
            <h4>テーマ</h4>
            <div className="tweak-options">
              {themes.map(([k,l])=>(
                <button key={k} className={theme===k?'active':''} onClick={()=>setV('theme',k,setTheme)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="tweak-group">
            <h4>アクセント</h4>
            <div className="swatches">
              {accents.map(([k,c])=>(
                <div key={k} className={'swatch '+(accent===k?'active':'')} style={{background:c}} onClick={()=>setV('accent',k,setAccent)}/>
              ))}
            </div>
          </div>

          <div className="tweak-group">
            <h4>フォント</h4>
            <div className="tweak-options">
              {fonts.map(([k,l])=>(
                <button key={k} className={font===k?'active':''} onClick={()=>setV('font',k,setFont)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="tweak-group">
            <h4>レイアウト密度</h4>
            <div className="tweak-options">
              {densities.map(([k,l])=>(
                <button key={k} className={density===k?'active':''} onClick={()=>setV('density',k,setDensity)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="tweak-group">
            <h4>ヒーロー</h4>
            <div className="tweak-options">
              {heros.map(([k,l])=>(
                <button key={k} className={hero===k?'active':''} onClick={()=>setV('hero',k,setHero)}>{l}</button>
              ))}
            </div>
          </div>

        </div>
      )}
    </>
  );
}
window.Tweaks = Tweaks;
