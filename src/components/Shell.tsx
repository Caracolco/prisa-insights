import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { SegmentIndexItem } from '../lib/types';
import { millions, pct } from '../lib/format';

export const PAGES = [
  { id: 'perfil', n: '01', name: 'Perfil', question: '¿Quién es?' },
  { id: 'actividades', n: '02', name: 'Actividades y opiniones', question: '¿Cómo vive y qué piensa?' },
  { id: 'radio', n: '03', name: 'Consumo de radio', question: '¿Cuándo puedo alcanzarlo?' },
  { id: 'marcas', n: '04', name: 'Marcas PRISA', question: '¿Dónde tengo mejor oportunidad?' },
  { id: 'digital', n: '05', name: 'Hábitos digitales', question: '¿Cómo se comporta conectado?' },
  { id: 'social', n: '06', name: 'Social Listening', question: '¿Qué está diciendo espontáneamente?' },
  { id: 'sintetica', n: '07', name: 'Audiencia Sintética', question: '¿Qué quiero preguntarle?' },
] as const;
export type PageId = (typeof PAGES)[number]['id'];

export function Sidebar({ page, onPage, open, onClose }: { page: PageId; onPage: (p: PageId) => void; open: boolean; onClose: () => void }) {
  return (
    <>
      <nav className={`side theme-dark ${open ? 'is-open' : ''}`} aria-label="Secciones">
        <div className="side__brand">
          <span className="side__mark" aria-hidden>
            <svg viewBox="0 0 32 32" width="28" height="28"><path d="M3 17h5l3-8 4 15 3-10 2 5h9" fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span><b>PRISA</b> Insights</span>
        </div>
        <p className="side__hint">La lectura avanza de quién es a qué hacer.</p>
        <ol className="side__list">
          {PAGES.map((p) => (
            <li key={p.id}>
              <button className={`side__item ${p.id === page ? 'is-active' : ''}`} aria-current={p.id === page ? 'page' : undefined} onClick={() => { onPage(p.id); onClose(); }}>
                <span className="side__text"><span className="side__name">{p.name}{p.id === 'sintetica' && <span className="tag-proto">Prototipo</span>}</span><span className="side__q">{p.question}</span></span>
              </button>
            </li>
          ))}
        </ol>
        <p className="side__foot">Fuentes: TGI Colombia 2026 R2 y Social Listening de julio a octubre de 2026</p>
      </nav>
      {open && <button className="side__scrim" aria-label="Cerrar menú" onClick={onClose} />}
    </>
  );
}

export function TopBar({ segments, current, onSegment, onMenu }: { segments: SegmentIndexItem[]; current: SegmentIndexItem | undefined; onSegment: (id: string) => void; onMenu: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);
  return (
    <header className="top">
      <button className="top__menu" onClick={onMenu} aria-label="Abrir secciones">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      <div className="seg" ref={ref}>
        <span className="label">Audiencia</span>
        <button className="seg__btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className="seg__name">{current?.name ?? 'Cargando…'}</span>
          {current && <span className="seg__meta num">{millions(current.size000)} personas ({pct(current.share)})</span>}
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
        </button>
        {open && (
          <ul className="seg__list" role="listbox" aria-label="Elegir audiencia">
            {segments.map((s) => (
              <li key={s.id}>
                <button role="option" aria-selected={s.id === current?.id} className={`seg__opt ${s.id === current?.id ? 'is-active' : ''}`} onClick={() => { onSegment(s.id); setOpen(false); }}>
                  <span>{s.name}</span>
                  <span className="seg__opt-meta num">{millions(s.size000)}{s.hasSocial && <em className="seg__social">Social</em>}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <SignalLine seed={current?.id ?? ''} />
    </header>
  );
}

/** Línea de señal: se redibuja una vez cada vez que cambia el segmento (no es un loop). */
function SignalLine({ seed }: { seed: string }) {
  const reduce = useReducedMotion();
  const h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
  const pts = Array.from({ length: 48 }, (_, i) => {
    const x = (i / 47) * 400; const y = 14 + Math.sin(i * 0.55 + h) * 5 * Math.sin((i / 47) * Math.PI) + Math.sin(i * 1.7 + h * 0.3) * 2.5;
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="signal" viewBox="0 0 400 28" preserveAspectRatio="none" aria-hidden>
      <motion.path key={seed} d={pts} fill="none" stroke="var(--brand)" strokeWidth="1.5" initial={reduce ? false : { pathLength: 0, opacity: 0.2 }} animate={{ pathLength: 1, opacity: 0.9 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
