import type { Metric, Sentiment } from '../lib/types';
import { int, pct } from '../lib/format';
import { Aff } from '../components/bits';

const tipFor = (m: Metric) => `${m.label}|Penetración ${pct(m.pen)}${m.aff != null ? `|Índice ${int(m.aff)} (100 = población)` : ''}`;

/** Barras horizontales: magnitud (penetración) + índice de afinidad como chip. Una sola serie. */
export function BarList({ items, max, tone = 'tgi', showAff = true }: { items: Metric[]; max?: number; tone?: 'tgi' | 'social' | 'brand'; showAff?: boolean }) {
  const top = max ?? Math.max(...items.map((i) => i.pen), 1);
  return (
    <ul className={`bars bars--${tone}`}>
      {items.map((m) => (
        <li key={m.label} className="bars__row" data-tip={tipFor(m)} tabIndex={0}>
          <span className="bars__label">{m.label}</span>
          <span className="bars__track"><span className="bars__fill" style={{ width: `${(m.pen / top) * 100}%` }} /></span>
          <span className="bars__value num">{pct(m.pen)}</span>
          {showAff && <Aff value={m.aff} compact />}
        </li>
      ))}
    </ul>
  );
}

/** Columnas de edad con línea de referencia del índice 100 dibujada en el chip. */
export function AgeColumns({ items }: { items: Metric[] }) {
  const top = Math.max(...items.map((i) => i.pen), 1);
  return (
    <div className="cols" role="list">
      {items.map((m) => (
        <div key={m.label} className="cols__col" role="listitem" data-tip={tipFor(m)} tabIndex={0}>
          <span className="cols__value num">{pct(m.pen)}</span>
          <span className="cols__track"><span className={`cols__fill ${(m.aff ?? 100) >= 108 ? 'is-over' : ''}`} style={{ height: `${(m.pen / top) * 100}%` }} /></span>
          <span className="cols__label num">{m.label}</span>
          <Aff value={m.aff} compact />
        </div>
      ))}
    </div>
  );
}

/** Barra 100 % (partes de un todo), etiquetas directas, 2px de separación entre partes. */
export function Proportion({ items, labels = true }: { items: Metric[]; labels?: boolean }) {
  const total = items.reduce((s, i) => s + i.pen, 0) || 1;
  return (
    <div className="prop">
      <div className="prop__bar">
        {items.map((m, i) => (
          <span key={m.label} className={`prop__seg prop__seg--${i % 4}`} style={{ flexGrow: m.pen / total }} data-tip={tipFor(m)} tabIndex={0} />
        ))}
      </div>
      {labels && (
        <ul className="prop__legend">
          {items.map((m, i) => (
            <li key={m.label}><i className={`prop__key prop__key--${i % 4}`} aria-hidden /><span>{m.label}</span><b className="num">{pct(m.pen)}</b><Aff value={m.aff} compact /></li>
          ))}
        </ul>
      )}
    </div>
  );
}

const S_ORDER: Sentiment[] = ['POSITIVO', 'MIXTO', 'NEUTRO', 'NEGATIVO'];
const S_LABEL: Record<Sentiment, string> = { POSITIVO: 'Positivo', MIXTO: 'Mixto', NEUTRO: 'Neutro', NEGATIVO: 'Negativo' };

/** Anillo de sentimiento (polaridad): orden fijo positivo → mixto → neutro → negativo, con etiquetas. */
export function SentimentRing({ counts, size = 168 }: { counts: Partial<Record<Sentiment, number>>; size?: number }) {
  const total = S_ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0) || 1;
  const r = size / 2 - 12; const c = 2 * Math.PI * r; const gap = 3;
  let acc = 0;
  return (
    <div className="ring">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={S_ORDER.map((k) => `${S_LABEL[k]} ${pct(((counts[k] ?? 0) / total) * 100)}`).join(', ')}>
        <defs>
          <pattern id="mix-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--pos)" /><rect width="3" height="6" fill="var(--neg)" />
          </pattern>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="14" />
        {S_ORDER.map((k) => {
          const v = counts[k] ?? 0; if (!v) return null;
          const len = (v / total) * c;
          const el = (
            <circle key={k} className={`ring__arc ring__arc--${k.toLowerCase()}`} cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="14"
              stroke={k === 'MIXTO' ? 'url(#mix-hatch)' : undefined}
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`} strokeDashoffset={-acc} transform={`rotate(-90 ${size / 2} ${size / 2})`}
              data-tip={`${S_LABEL[k]}|${pct((v / total) * 100)} · ${int(v)} menciones`} tabIndex={0} />
          );
          acc += len; return el;
        })}
      </svg>
      <ul className="ring__legend">
        {S_ORDER.map((k) => (
          <li key={k}><i className={`ring__key ring__key--${k.toLowerCase()}`} aria-hidden /><span>{S_LABEL[k]}</span><b className="num">{pct(((counts[k] ?? 0) / total) * 100)}</b></li>
        ))}
      </ul>
    </div>
  );
}

/** Mini barras de sentimiento dentro de una temática (100 %). */
export function SentimentStrip({ counts }: { counts: Partial<Record<Sentiment, number>> }) {
  const total = S_ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0) || 1;
  return (
    <span className="sstrip" aria-label={S_ORDER.map((k) => `${S_LABEL[k]} ${pct(((counts[k] ?? 0) / total) * 100)}`).join(', ')}>
      {S_ORDER.map((k) => (counts[k] ? <i key={k} className={`sstrip__seg ring__key--${k.toLowerCase()}`} style={{ flexGrow: (counts[k] ?? 0) / total }} data-tip={`${S_LABEL[k]}|${pct(((counts[k] ?? 0) / total) * 100)}`} /> : null))}
    </span>
  );
}

/** Volumen mensual: barras finas. */
export function MonthBars({ months }: { months: Record<string, number> }) {
  const entries = Object.entries(months).filter(([k]) => k).sort(([a], [b]) => a.localeCompare(b));
  const top = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="mbars">
      {entries.map(([k, v]) => (
        <span key={k} className="mbars__col" data-tip={`${new Date(k + '-01T00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}|${int(v)} menciones relevantes`} tabIndex={0}>
          <span className="mbars__fill" style={{ height: `${(v / top) * 100}%` }} />
          <span className="mbars__label">{new Date(k + '-01T00:00').toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}</span>
        </span>
      ))}
    </div>
  );
}

/** Jornada de radio: días × franjas. Intensidad = penetración real TGI; chip = índice. Marca la mejor franja. */
export function DaypartGrid({ days, best }: { days: { day: string; slots: { slot: string; pen: number; aff: number }[] }[]; best: { day: string; slot: string } | null }) {
  const max = Math.max(...days.flatMap((d) => d.slots.map((s) => s.pen ?? 0)), 1);
  const slots = days[0]?.slots.map((s) => s.slot) ?? [];
  return (
    <div className="dgrid" role="table" aria-label="Escucha de radio por día y franja horaria">
      <div className="dgrid__row dgrid__row--head" role="row">
        <span role="columnheader" />
        {slots.map((s) => <span key={s} role="columnheader" className="dgrid__slot num">{s} h</span>)}
      </div>
      {days.map((d) => (
        <div key={d.day} className="dgrid__row" role="row">
          <span role="rowheader" className="dgrid__day">{d.day}</span>
          {d.slots.map((s) => {
            const isBest = best && best.day === d.day && best.slot === s.slot;
            return (
              <span key={s.slot} role="cell" tabIndex={0} className={`dgrid__cell ${isBest ? 'is-best' : ''}`}
                style={{ ['--a' as string]: String(0.08 + 0.92 * ((s.pen ?? 0) / max)) }}
                data-tip={`${d.day} ${s.slot} h|${pct(s.pen)} escucha radio en esta franja|Índice ${int(s.aff)}${isBest ? '|Mejor franja: máxima afinidad con escala' : ''}`}>
                <b className="num">{pct(s.pen)}</b>
                {s.pen > 0 ? <Aff value={s.aff} compact /> : <span className="aff">sin dato</span>}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
