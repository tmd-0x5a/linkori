// Root app
const { useState: aS } = React;

function App(){
  const [lang, setLang] = aS('ja');
  useMouseParallax();

  return (
    <LangCtx.Provider value={{lang, setLang}}>
      <div className="bg-fabric"/>
      <div className="bg-spot"/>
      <div className="bg-noise"/>

      <Nav/>
      <main>
        <Hero/>
        <Ticker/>
        <Overview/>
        <Screens/>
        <PlaylistSec/>
        <ChunksSec/>
        <BrowserSec/>
        <ViewerSec/>
        <NewSec/>
        <FormatsSec/>
        <ShortcutsSec/>
        <DownloadSec/>
      </main>
      <Footer/>
      <Tweaks/>
    </LangCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
