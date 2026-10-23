import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Answer, Segment } from '../lib/types';
import { askAudience } from '../ai/client';
import { Source } from '../components/bits';
import { PageHeader } from '../components/PageHeader';

type Turn = { q: string; a: Answer | null };

/** Representación abstracta del segmento: un núcleo de datos. Solo se anima mientras responde. */
function Orb({ busy, seed }: { busy: boolean; seed: string }) {
  const reduce = useReducedMotion();
  const h = [...seed].reduce((a, c) => (a * 33 + c.charCodeAt(0)) % 997, 11);
  const nodes = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2 + h * 0.01; const r = 54 + ((i * 37 + h) % 5) * 9;
    return { x: 100 + Math.cos(a) * r, y: 100 + Math.sin(a) * r, k: i % 3 };
  });
  return (
    <motion.svg className="orb" viewBox="0 0 200 200" aria-hidden animate={busy && !reduce ? { scale: [1, 1.04, 1] } : { scale: 1 }} transition={{ duration: 1.1, repeat: busy ? 2 : 0, ease: 'easeInOut' }}>
      <defs>
        <radialGradient id="orb-core" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#E6007E" stopOpacity="0.75" /><stop offset="55%" stopColor="#E6007E" stopOpacity="0.12" /><stop offset="100%" stopColor="#E6007E" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#orb-core)" />
      {[38, 62, 86].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgba(233,234,236,.12)" strokeDasharray="2 5" />)}
      {nodes.map((n, i) => (
        <g key={i}>
          <line x1="100" y1="100" x2={n.x} y2={n.y} stroke="rgba(233,234,236,.07)" />
          <circle cx={n.x} cy={n.y} r={n.k === 0 ? 2.6 : 1.8} fill={n.k === 0 ? 'var(--tgi)' : n.k === 1 ? 'var(--social)' : 'rgba(233,234,236,.7)'} />
        </g>
      ))}
      <circle cx="100" cy="100" r="14" fill="#E6007E" />
    </motion.svg>
  );
}

function AnswerCard({ a }: { a: Answer }) {
  const [open, setOpen] = useState(false);
  const tgi = a.evidence.filter((e) => e.source === 'TGI');
  const soc = a.evidence.filter((e) => e.source === 'SOCIAL');
  return (
    <div className={`ans ${a.grounded ? '' : 'ans--empty'}`}>
      <p className="ans__text">{a.answer}</p>
      <div className="ans__meta">
        {a.source && <Source kind={a.source} />}
        {a.confidence && <span className={`ans__conf ans__conf--${a.confidence}`}>Confianza {a.confidence}</span>}
        {a.evidence.length > 0 && <button className="ans__ev" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? 'Ocultar evidencia' : 'Ver evidencia'}</button>}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="ans__evbody" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            {tgi.length > 0 && <div className="ans__group"><h4 className="ans__h ans__h--tgi">TGI</h4><ul>{tgi.map((e, i) => <li key={i}><span>{e.label}</span><b className="num">{e.value}</b></li>)}</ul></div>}
            {soc.length > 0 && <div className="ans__group"><h4 className="ans__h ans__h--social">Social Listening</h4><ul>{soc.map((e, i) => <li key={i}><span>{e.label}</span><b className="num">{e.value}</b></li>)}</ul></div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sintetica({ s }: { s: Segment }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setTurns([]); }, [s.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns]);

  const send = async (q: string) => {
    const question = q.trim(); if (!question || busy) return;
    setText(''); setBusy(true);
    setTurns((t) => [...t, { q: question, a: null }]);
    const a = await askAudience(s, question);
    setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a } : x)));
    setBusy(false);
  };
  const last = turns.at(-1)?.a;
  const chips = last?.suggestions?.length ? last.suggestions : s.suggestions;

  return (
    <article className="page page--terminal">
      <PageHeader n="07" question="¿Qué quiero preguntarle?" answer="Pregúntale a esta audiencia." lede="Prototipo. Responde como representación del segmento, solo con evidencia de TGI y, cuando existe, de Social Listening en Colombia. No es una persona: no tiene nombre, edad ni historia propia." source={s.social ? 'TGI + SOCIAL' : 'TGI'} />
      <div className="term">
        <aside className="term__side theme-dark">
          <Orb busy={busy} seed={s.id} />
          <p className="term__who"><b>{s.name}</b><span>{(s.size000 / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M personas representadas</span></p>
          <p className="term__mode">Prototipo: respuestas construidas desde los datos del segmento, sin inteligencia artificial. La conversación libre es una fase posterior.</p>
        </aside>
        <section className="term__chat" aria-live="polite">
          {turns.length === 0 && <p className="term__empty">Elige una pregunta o escribe la tuya.</p>}
          <ol className="term__turns">
            {turns.map((t, i) => (
              <li key={i} className="turn">
                <p className="turn__q">{t.q}</p>
                {t.a ? <AnswerCard a={t.a} /> : <p className="turn__wait">Consultando los datos del segmento…</p>}
              </li>
            ))}
          </ol>
          <div ref={endRef} />
          <div className="chips" role="list" aria-label="Preguntas sugeridas">
            {last && !last.grounded && <span className="chips__lead">Sí puedo contarte sobre…</span>}
            {chips.slice(0, last ? 4 : 8).map((c) => <button key={c} role="listitem" className="chip" onClick={() => send(c)} disabled={busy}>{c}</button>)}
          </div>
          <form className="ask" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <label className="sr-only" htmlFor="ask-input">Tu pregunta</label>
            <input id="ask-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Pregúntale algo a “${s.name}”`} maxLength={400} autoComplete="off" />
            <button type="submit" disabled={busy || !text.trim()}>Preguntar</button>
          </form>
        </section>
      </div>
    </article>
  );
}
