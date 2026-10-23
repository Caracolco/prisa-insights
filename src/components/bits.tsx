import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Metric, SourceKind } from '../lib/types';
import { Counter } from '../motion/Counter';
import { pct } from '../lib/format';
import { affTone, int } from '../lib/format';

const SOURCE_CLASS: Record<SourceKind, string> = { TGI: 'src--tgi', SOCIAL: 'src--social', 'TGI + SOCIAL': 'src--cross' };
const SOURCE_TEXT: Record<SourceKind, string> = { TGI: 'TGI', SOCIAL: 'Social Listening', 'TGI + SOCIAL': 'TGI + Social' };

/** Etiqueta de fuente: el color identifica la fuente, el texto la nombra (nunca color solo). */
export function Source({ kind }: { kind: SourceKind }) {
  return <span className={`src ${SOURCE_CLASS[kind]}`}><i aria-hidden />{SOURCE_TEXT[kind]}</span>;
}

/** Índice de afinidad TGI: 100 = igual que la población. */
export function Aff({ value, compact = false }: { value: number | null | undefined; compact?: boolean }) {
  if (value == null) return null;
  const tone = affTone(value);
  const arrow = tone === 'high' || tone === 'up' ? '▲' : tone === 'down' ? '▼' : '';
  return (
    <span className={`aff aff--${tone}`} title={`Índice de afinidad ${int(value)} (100 = igual que la población)`}>
      {arrow && <b aria-hidden>{arrow}</b>}
      <span className="num">{int(value)}</span>
      {!compact && <span className="sr-only"> índice de afinidad</span>}
    </span>
  );
}

export function Panel({ title, source, note, children, className = '' }: { title?: ReactNode; source?: SourceKind; note?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || source) && (
        <header className="panel__head">
          {title && <h3 className="panel__title">{title}</h3>}
          {source && <Source kind={source} />}
        </header>
      )}
      {children}
      {note && <p className="panel__note">{note}</p>}
    </section>
  );
}

/** Cierre de cada página: bloque "Resumen" */
export function SoWhat({ items, source }: { items: { title?: string; body: string }[]; source: SourceKind }) {
  if (!items.length) return null;
  return (
    <section className="sowhat" aria-labelledby="sowhat-title">
      <header className="sowhat__head">
        <h2 id="sowhat-title" className="sowhat__title">Resumen</h2>
        <Source kind={source} />
      </header>
      <ol className={`sowhat__list sowhat__list--n${items.length}`}>
        {items.map((it, i) => (
          <li key={i}>
            {it.title && <strong>{it.title}</strong>}
            <span>{it.body}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Cifra principal con etiqueta y chip de afinidad. */
export function Stat({ label, m, note }: { label: string; m: Metric | null | undefined; note?: string }) {
  if (!m) return null;
  return (
    <div className="stat" data-tip={`${label}|${pct(m.pen)} del segmento${m.aff != null ? `|Índice ${m.aff}` : ''}`} tabIndex={0}>
      <span className="stat__value display"><Counter value={m.pen} suffix={" %"} /></span>
      <span className="stat__label">{label}</span>
      <span className="stat__aff"><Aff value={m.aff} />{note && <em>{note}</em>}</span>
    </div>
  );
}

/** Cita limitada a 2 líneas; muestra "Ver más" solo si el texto no cabe. */
export function ClampQuote({ text, className = '', lines = 2 }: { text: string; className?: string; lines?: number }) {
  const ref = useRef<HTMLQuoteElement>(null);
  const [open, setOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const check = () => setOverflow(el.scrollHeight > el.clientHeight + 2);
    check();
    const ro = new ResizeObserver(check); ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  return (
    <span className={`clampq ${open ? 'is-open' : ''}`}>
      <q ref={ref} className={`${className} clampq__text`} style={{ WebkitLineClamp: open ? 'unset' : lines }}>{text}</q>
      {(overflow || open) && <button className="clampq__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? 'Ver menos' : 'Ver más'}</button>}
    </span>
  );
}

/** Bloque secundario plegable: abierto en escritorio, plegado por defecto en móvil. */
export function Collapsible({ summary, children, className = '' }: { summary: ReactNode; children: ReactNode; className?: string }) {
  const [open] = useState(() => typeof window === 'undefined' || !window.matchMedia('(max-width: 600px)').matches);
  return (
    <details className={`fold ${className}`} open={open}>
      <summary className="fold__sum">{summary}</summary>
      {children}
    </details>
  );
}
