import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Excerpt, Segment, Sentiment } from '../lib/types';
import { dateLong, int, pct } from '../lib/format';
import { Counter } from '../motion/Counter';
import { ClampQuote, Collapsible, SoWhat, Source } from '../components/bits';
import { SentimentStrip } from '../charts/charts';
import { PageHeader } from '../components/PageHeader';

const DISCARD_LABEL: Record<string, string> = {
  sin_producto: 'No menciona el producto (llegó por el tema del hilo o por otra palabra clave)',
  figurado: 'Uso figurado o modismo ("manda huevo", "a huevo", apodos)',
  videojuego: 'Videojuegos y streams (Roblox, Minecraft…)',
  vacio: 'Sin texto: solo emojis o símbolos',
  comercial: 'Publicaciones comerciales o promocionales sin voz de consumidor',
  mencion_lateral: 'Textos largos donde el producto aparece de pasada',
  spam: 'Spam',
};
const KIND_LABEL = { 'tensión': 'Tensión', necesidad: 'Necesidad', motivador: 'Motivador' } as const;

function Quotes({ items }: { items: Excerpt[] }) {
  if (!items.length) return <p className="quotes__none">Sin extractos publicables para este bloque.</p>;
  return (
    <ul className="quotes">
      {items.map((e, i) => <li key={i}><q>{e.text}</q><span className="quotes__meta">{e.platform}{e.month ? `, ${e.month}` : ''}</span></li>)}
    </ul>
  );
}

function Reveal({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="evid">
      <button className="evid__btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? 'Ocultar' : label}</button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="evid__body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Social({ s }: { s: Segment }) {
  const so = s.social;
  if (!so) {
    return (
      <article className="page">
        <PageHeader n="06" question="¿Qué está diciendo espontáneamente?" answer="No existe una escucha social específica para esta audiencia." lede="Las escuchas disponibles son de consumo de huevo y de consumo de pollo. No mezclamos esa conversación con otros segmentos: lo que dicen quienes hablan de huevo no representa a esta audiencia." source="SOCIAL" />
        <div className="empty">
          <p>Para ver Social Listening, elige <b>Consumidor de huevo diario</b> o <b>Consumidor de pollo 2+ veces por semana</b> en el selector de audiencia.</p>
        </div>
      </article>
    );
  }
  const discards = Object.entries(so.discardReasons).sort((a, b) => b[1] - a[1]);
  const totalSent = (['POSITIVO', 'NEGATIVO', 'NEUTRO', 'MIXTO'] as Sentiment[]).reduce((a, k) => a + (so.sentiment.counts[k] ?? 0), 0) || 1;
  const sp = (k: Sentiment) => ((so.sentiment.counts[k] ?? 0) / totalSent) * 100;

  return (
    <article className="page page--social">
      <PageHeader n="06" question="¿Qué está diciendo espontáneamente?" answer={so.headline?.title ?? `Conversación colombiana sobre ${so.product}`} lede={so.headline?.body} source="SOCIAL" />

      {/* 1. Qué está diciendo realmente el consumidor */}
      <section className="say" aria-label="Lo que dicen los consumidores">
        <div className="say__base">
          <span className="market">Colombia</span>
          <p><b className="num"><Counter value={so.volume.co} decimals={0} /></b> menciones de consumidores colombianos que hablan realmente de {so.product}, entre el {dateLong(so.period.from)} y el {dateLong(so.period.to)}.</p>
          <p className="say__ctx">Contexto que no entra en las cifras: {int(so.volume.otros)} menciones de otros países y {int(so.volume.sinpais)} sin país identificado.</p>
          <Reveal label="Cómo se depuró la conversación">
            <div className="dq">
              <div>
                <h4>De {int(so.volume.original)} menciones leídas a {int(so.volume.relevant)} relevantes</h4>
                <ul className="dq__list">
                  {discards.map(([k, v]) => <li key={k}><span>{DISCARD_LABEL[k] ?? k}</span><b className="num">{int(v)}</b></li>)}
                  <li><span>Duplicados y reposts idénticos</span><b className="num">{int(so.volume.duplicates)}</b></li>
                  <li><span>Dudosos (no entran en los conteos)</span><b className="num">{int(so.volume.doubtful)}</b></li>
                </ul>
              </div>
              <div>
                <h4>Precisión medida en lectura manual</h4>
                <ul className="dq__list">
                  {so.accuracy.relevance != null && <li><span>Relevancia</span><b className="num">{pct(so.accuracy.relevance * 100)}</b></li>}
                  {so.accuracy.topics != null && <li><span>Temáticas</span><b className="num">{pct(so.accuracy.topics * 100)}</b></li>}
                  {so.accuracy.sentiment != null && <li><span>Sentimiento (exploratorio)</span><b className="num">{pct(so.accuracy.sentiment * 100)}</b></li>}
                </ul>
                <p className="dq__note">Solo cuentan las menciones cuyo país es Colombia. Las que no traen país no se asumen colombianas. Otros países con más menciones: {Object.entries(so.otherCountries).map(([c, n]) => `${c} (${int(n)})`).join(', ')}.</p>
              </div>
            </div>
          </Reveal>
        </div>
        {so.voices.length > 0 && (
          <ul className="say__voices">
            {so.voices.map((v, i) => <li key={i}><ClampQuote text={v.text} lines={3} /><span>{v.platform}</span></li>)}
          </ul>
        )}
      </section>

      {/* 2. Temáticas */}
      <section className="block">
        <h2 className="block__title">De qué habla</h2>
        <p className="block__lede">Temáticas descubiertas en la conversación colombiana; una mención puede tener hasta tres. A la derecha, cuánto pesa la misma temática fuera de Colombia.</p>
        <ol className="tlist">
          {so.topics.map((t) => (
            <li key={t.id} className="tlist__row" data-tip={`${t.name}|${pct(t.share)} de la conversación colombiana, ${int(t.n)} menciones${t.otrosShare != null ? `|Otros países: ${pct(t.otrosShare)}` : ''}`} tabIndex={0}>
              <span className="tlist__share display num"><Counter value={t.share} suffix={' %'} /></span>
              <span className="tlist__body">
                <span className="tlist__name">{t.name}</span>
                <span className="tlist__bar"><i style={{ width: `${Math.min(100, (t.share / (so.topics[0]?.share || 1)) * 100)}%` }} /></span>
                {t.excerpts[0] && <ClampQuote className="tlist__quote" text={t.excerpts[0].text} />}
              </span>
              <span className="tlist__ctx num">{int(t.n)} menciones{t.otrosShare != null && <em>Fuera de Colombia: {pct(t.otrosShare)}</em>}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 3. Tensiones y necesidades */}
      {so.tensions.length > 0 && (
        <section className="block">
          <h2 className="block__title">Tensiones, necesidades y motivadores</h2>
          <ul className={`tensions tensions--n${so.tensions.length}`}>
            {so.tensions.map((t) => (
              <li key={t.id} className={`tension tension--${t.kind === 'motivador' ? 'motive' : 'tension'}`}>
                <span className="tension__kind">{KIND_LABEL[t.kind]}</span>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
                <span className="tension__n num">{int(t.n)} menciones en Colombia ({pct(t.share)})</span>
                <Reveal label="Ver extractos"><Quotes items={t.evidence} /></Reveal>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. Ocasiones de consumo */}
      <section className="block">
        <h2 className="block__title">Cuándo aparece</h2>
        <p className="block__lede">Ocasiones de consumo que la conversación colombiana nombra explícitamente.</p>
        {so.occasions.length > 0 ? (
          <ul className="occ">
            {so.occasions.map((o) => (
              <li key={o.id} className="occ__item" data-tip={`${o.name}|${int(o.n)} menciones en Colombia (${pct(o.share)})${o.otrosShare != null ? `|Otros países: ${pct(o.otrosShare)}` : ''}`} tabIndex={0}>
                <span className="occ__n display num">{int(o.n)}</span>
                <span className="occ__name">{o.name}</span>
                {o.excerpts[0] && <q className="occ__quote">{o.excerpts[0].text}</q>}
              </li>
            ))}
          </ul>
        ) : <p className="nosignal">Ninguna ocasión alcanza 10 menciones en Colombia.</p>}
        {so.occasionsWeak.length > 0 && <p className="occ__weak">Con poca evidencia en Colombia (menos de 10 menciones): {so.occasionsWeak.join(', ').toLowerCase()}.</p>}
      </section>

      {/* 5. Usos inesperados y hallazgos */}
      <section className="block">
        <h2 className="block__title">Lo que no esperábamos</h2>
        {so.insights.length > 0 ? (
          <ol className="insights">
            {so.insights.map((u) => (
              <li key={u.id} className="insight">
                <span className="insight__status">Hallazgo en Colombia</span>
                <h3 className="insight__title display">{u.title}</h3>
                <div className="insight__cols">
                  <div><h4>Qué estamos viendo</h4><p>{u.seeing}</p></div>
                  <div><h4>Por qué importa</h4><p>{u.why}</p></div>
                </div>
                <div className="insight__ev">
                  <span className="insight__metric"><b className="display num">{int(u.n)}</b> menciones en Colombia ({pct(u.share)})</span>
                  <Reveal label="Ver evidencia"><Quotes items={u.evidence} /></Reveal>
                </div>
              </li>
            ))}
          </ol>
        ) : <p className="nosignal">No hay hallazgos inesperados con evidencia suficiente en Colombia.</p>}
        {so.unexpectedUses.filter((x) => x.colombia).length === 0 && <p className="nosignal">No encontramos usos no alimentarios con evidencia suficiente en Colombia.</p>}
      </section>

      {/* 6. Señales emergentes */}
      {so.emergent.length > 0 && (
        <section className="block">
          <h2 className="block__title">Señales emergentes</h2>
          <p className="block__lede">Conversaciones con evidencia todavía insuficiente para un hallazgo. Se muestran con su precisión, su geografía y su nivel de confianza.</p>
          {so.emergent.map((e) => (
            <article key={e.id} className="emerg">
              <header className="emerg__head">
                <span className="emerg__status">{e.status}</span>
                <span className="emerg__conf">Confianza {e.confidence}</span>
              </header>
              <h3 className="emerg__title display">{e.title}</h3>
              <p className="emerg__body">{e.body}</p>
              {e.geoNote && <p className="emerg__geo">{e.geoNote}</p>}
              <div className="emerg__scroll">
                <table className="emerg__table">
                  <caption className="sr-only">Menciones detectadas y estimadas por geografía</caption>
                  <thead><tr><th scope="col"><span className="sr-only">Medida</span></th><th scope="col">Colombia</th><th scope="col">Otros países</th><th scope="col">Sin país</th><th scope="col">Total</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">Detectadas</th><td className="num">{int(e.detected.co)}</td><td className="num">{int(e.detected.otros)}</td><td className="num">{int(e.detected.sinpais)}</td><td className="num">{int(e.detected.total)}</td></tr>
                    {e.precision != null && <tr><th scope="row">Estimadas con {pct(e.precision * 100)} de precisión</th><td className="num">{int(e.estimated.co)}</td><td className="num">{int(e.estimated.otros)}</td><td className="num">{int(e.estimated.sinpais)}</td><td className="num">{int(e.estimated.total)}</td></tr>}
                    <tr><th scope="row">Sobre la conversación relevante</th><td className="num">{pct(e.share.co)}</td><td className="num">{pct(e.share.otros)}</td><td className="num">{pct(e.share.sinpais)}</td><td className="num">{pct(e.share.total)}{e.shareEstimated != null && <em> (≈{pct(e.shareEstimated)} corregido)</em>}</td></tr>
                    {e.purchase && <tr><th scope="row">Con compra explícita</th><td className="num">{int(e.purchase.co)}</td><td className="num">{int(e.purchase.otros)}</td><td className="num">{int(e.purchase.sinpais)}</td><td className="num">{int(e.purchase.co + e.purchase.otros + e.purchase.sinpais)}</td></tr>}
                  </tbody>
                </table>
              </div>
              <ul className="emerg__cards" aria-label="Menciones por mercado">
                {([['Colombia', 'co'], ['Otros países', 'otros'], ['Sin país identificado', 'sinpais'], ['Total', 'total']] as const).map(([name, k]) => (
                  <li key={k} className="emerg__card">
                    <strong>{name}</strong>
                    <span>Detectadas <b className="num">{int(e.detected[k])}</b></span>
                    {e.precision != null && <span>Estimadas <b className="num">{int(e.estimated[k])}</b></span>}
                    <span>Sobre la conversación <b className="num">{pct(e.share[k])}</b></span>
                    {e.purchase && k !== 'total' && <span>Compra explícita <b className="num">{int(e.purchase[k])}</b></span>}
                    {e.purchase && k === 'total' && <span>Compra explícita <b className="num">{int(e.purchase.co + e.purchase.otros + e.purchase.sinpais)}</b></span>}
                  </li>
                ))}
              </ul>
              <Reveal label="Ver ejemplos anonimizados"><Quotes items={e.evidence} /></Reveal>
            </article>
          ))}
        </section>
      )}

      {/* Contexto secundario: otros mercados */}
      {so.outside.length > 0 && (
        <section className="block block--quiet">
          <Collapsible summary={<><h2 className="block__title">Fuera de Colombia</h2><span className="fold__hint">Contexto de otros mercados</span></>}>
            <p className="block__lede">Contexto de otros mercados. No se traslada al consumidor colombiano.</p>
            <ul className="outside">
              {so.outside.map((o) => <li key={o.id}><strong>{o.title}</strong><span>{o.body}</span></li>)}
            </ul>
          </Collapsible>
        </section>
      )}

      {/* 7. Sentimiento: lectura exploratoria */}
      <section className="block block--quiet">
        <Collapsible summary={<h2 className="block__title">Tono de la conversación <span className="tag-explor">Lectura exploratoria</span></h2>}>
        <div className="senti">
          <SentimentStrip counts={so.sentiment.counts} />
          <p className="senti__read">En Colombia predominan las menciones informativas o sin valoración ({pct(sp('NEUTRO'))}); entre las que sí valoran, pesan más las negativas ({pct(sp('NEGATIVO'))}) que las positivas ({pct(sp('POSITIVO'))}).</p>
          <p className="senti__note">No es un indicador: en una auditoría independiente la clasificación coincidió con la lectura humana en {so.sentiment.stratified ? pct(so.sentiment.stratified.agreement * 100) : '–'} de una muestra estratificada (≈{so.sentiment.accuracy != null ? pct(so.sentiment.accuracy * 100) : '–'} ponderado por la distribución real), por debajo del 80 % requerido. La ironía y las quejas sin adjetivos siguen siendo difíciles de leer automáticamente.</p>
        </div>
        </Collapsible>
      </section>

      {/* Cruces TGI + Social */}
      {s.cross.length > 0 && (
        <section className="block">
          <h2 className="block__title">Lo que declara TGI frente a lo que dice la conversación</h2>
          <p className="block__lede">Solo cuando ambas fuentes tienen evidencia: TGI Colombia y conversación social colombiana.</p>
          <ul className="cross">
            {s.cross.map((c) => (
              <li key={c.id} className="cross__item">
                <Source kind="TGI + SOCIAL" />
                <h3>{c.title}</h3>
                <dl className="cross__pair">
                  <div className="cross__tgi"><dt>TGI dice</dt><dd>{c.tgi.says}</dd></div>
                  <div className="cross__social"><dt>Social observa</dt><dd>{c.social.observes}</dd></div>
                  <div className="cross__read"><dt>Lectura</dt><dd>{c.reading}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SoWhat source={s.cross.length ? 'TGI + SOCIAL' : 'SOCIAL'} items={so.brands} />
    </article>
  );
}
