import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Segment, SegmentIndex } from './lib/types';
import { loadIndex, loadSegment, prefetchAll } from './lib/data';
import { PAGES, Sidebar, TopBar, type PageId } from './components/Shell';
import { Cover } from './sections/Cover';
import { Perfil } from './sections/Perfil';
import { Social } from './sections/Social';
import { Sintetica } from './sections/Sintetica';
import { Actividades } from './sections/Actividades';
import { Radio } from './sections/Radio';
import { Marcas } from './sections/Marcas';
import { Digital } from './sections/Digital';
import { TipLayer } from './charts/Tip';

// Ruta en el hash: #/<pagina>/<segmento>
function readHash(): { page: PageId; seg: string | null } {
  const [, p, s] = location.hash.split('/');
  const page = (PAGES.find((x) => x.id === p)?.id ?? 'perfil') as PageId;
  return { page, seg: s || null };
}

export default function App() {
  const reduce = useReducedMotion();
  const initial = readHash();
  const [entered, setEntered] = useState(Boolean(location.hash));
  const [index, setIndex] = useState<SegmentIndex | null>(null);
  const [page, setPage] = useState<PageId>(initial.page);
  const [segId, setSegId] = useState<string | null>(initial.seg);
  const [segment, setSegment] = useState<Segment | null>(null);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIndex().then((ix) => {
      setIndex(ix);
      setSegId((cur) => cur ?? (ix.segments.find((s) => s.hasSocial)?.id ?? ix.segments[0].id));
      prefetchAll(ix.segments.map((s) => s.id));
    }).catch((e) => setError(String(e.message ?? e)));
  }, []);

  useEffect(() => {
    if (!segId) return;
    let alive = true;
    loadSegment(segId).then((s) => alive && setSegment(s)).catch((e) => setError(String(e.message ?? e)));
    return () => { alive = false; };
  }, [segId]);

  useEffect(() => {
    if (!entered || !segId) return;
    const h = `#/${page}/${segId}`;
    if (location.hash !== h) history.replaceState(null, '', h);
  }, [page, segId, entered]);

  const current = useMemo(() => index?.segments.find((s) => s.id === segId), [index, segId]);

  if (error) return <div className="fatal"><h1>No se pudieron cargar los datos</h1><p>{error}</p></div>;
  if (!entered) return index ? <Cover segments={index.segments} onEnter={() => setEntered(true)} /> : <div className="boot" aria-busy="true" />;

  const key = `${page}:${segment?.id ?? 'x'}`;
  return (
    <motion.div className="app" initial={reduce ? false : { opacity: 0, scale: 0.985, filter: 'blur(4px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
      <div className="app-bg" aria-hidden />
      <Sidebar page={page} onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }} open={menu} onClose={() => setMenu(false)} />
      <div className="main">
        {index && <TopBar segments={index.segments} current={current} onSegment={setSegId} onMenu={() => setMenu(true)} />}
        <main className="content" id="contenido">
          <AnimatePresence mode="wait">
            {segment && (
              <motion.div key={key}
                initial={reduce ? false : { opacity: 0, y: 12, filter: 'blur(3px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(3px)' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
                {page === 'perfil' && <Perfil s={segment} />}
                {page === 'social' && <Social s={segment} />}
                {page === 'sintetica' && <Sintetica s={segment} />}
                {page === 'actividades' && <Actividades s={segment} />}
                {page === 'radio' && <Radio s={segment} />}
                {page === 'marcas' && <Marcas s={segment} />}
                {page === 'digital' && <Digital s={segment} />}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      <TipLayer />
    </motion.div>
  );
}
