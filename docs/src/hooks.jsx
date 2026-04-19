// Reusable hooks
const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = React;

function useReveal(ref, opts={}){
  useEffect(()=>{
    const el = ref.current; if(!el) return;
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target) }
      });
    }, { threshold: opts.threshold ?? .15, rootMargin: opts.rootMargin ?? '0px 0px -60px 0px' });
    el.querySelectorAll('.reveal').forEach(n=>io.observe(n));
    if(el.classList.contains('reveal')) io.observe(el);
    return ()=>io.disconnect();
  },[]);
}

function useMouseParallax(){
  useEffect(()=>{
    let raf;
    const onMove = (e)=>{
      if(raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(()=>{
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty('--mx', x+'%');
        document.documentElement.style.setProperty('--my', y+'%');
        // float nodes
        document.querySelectorAll('[data-par]').forEach(n=>{
          const f = parseFloat(n.dataset.par || '0.4');
          const dx = (e.clientX - window.innerWidth/2) * f * .02;
          const dy = (e.clientY - window.innerHeight/2) * f * .02;
          n.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        });
      });
    };
    window.addEventListener('mousemove', onMove);
    return ()=> window.removeEventListener('mousemove', onMove);
  }, []);
}

function useScrollY(){
  const [y, setY] = useState(0);
  useEffect(()=>{
    let raf;
    const on = ()=>{
      if(raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(()=> setY(window.scrollY));
    };
    window.addEventListener('scroll', on, {passive:true});
    return ()=> window.removeEventListener('scroll', on);
  },[]);
  return y;
}

function useCardSpot(){
  useEffect(()=>{
    const handler = (e)=>{
      const t = e.currentTarget;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--px', (e.clientX - r.left)+'px');
      t.style.setProperty('--py', (e.clientY - r.top)+'px');
    };
    const nodes = document.querySelectorAll('.card.spot');
    nodes.forEach(n=> n.addEventListener('mousemove', handler));
    return ()=> nodes.forEach(n=> n.removeEventListener('mousemove', handler));
  });
}

window.useReveal = useReveal;
window.useMouseParallax = useMouseParallax;
window.useScrollY = useScrollY;
window.useCardSpot = useCardSpot;
