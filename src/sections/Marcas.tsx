import type { Segment } from '../lib/types';
import { pct } from '../lib/format';
import { Panel, SoWhat, Stat } from '../components/bits';
import { Counter } from '../motion/Counter';
import { PageHeader } from '../components/PageHeader';
import { scaleWord } from '../lib/select';

const MIN_SCALE = 5; // penetración mínima para considerar una afinidad "con escala"

export function Marcas({ s }: { s: Segment }) {
  // Las cinco marcas, siempre. Afinidad = criterio principal; penetración = escala.
  const brands = [...s.prisa.brands].sort((a, b) => b.aff - a.aff || b.pen - a.pen);
  const measured = brands.filter((b) => b.pen > 0);
  const scaled = measured.filter((b) => b.pen >= MIN_SCALE);
  const bestAff = scaled[0] ?? measured[0];
  const bestReach = [...measured].sort((a, b) => b.pen - a.pen)[0];
  const niche = measured.filter((b) => b.pen < MIN_SCALE && b.aff >= 110 && b.name !== bestAff?.name).sort((a, b) => b.aff - a.aff)[0];
  const absent = brands.filter((b) => b.pen === 0);
  // Posición de cada marca entre las emisoras del segmento (por alcance)
  const rankOf = (name: string) => {
    const i = s.radio.stations.findIndex((st) => st.prisa && name.toUpperCase().startsWith(st.label.toUpperCase().split(' ')[0]));
    return i >= 0 ? i + 1 : null;
  };

  const answer = bestAff && bestReach
    ? bestAff.aff < 100
      ? `Ninguna marca PRISA con escala supera a la población en este segmento; ${bestAff.name} es la mejor posicionada (índice ${bestAff.aff})${bestReach.name === bestAff.name ? ` y la de mayor alcance (${pct(bestAff.pen)})` : `, y ${bestReach.name} la de mayor alcance (${pct(bestReach.pen)})`}.`
      : bestAff.name === bestReach.name
      ? `${bestAff.name} concentra la oportunidad: es la marca PRISA más afín (índice ${bestAff.aff}) y la de mayor alcance (${pct(bestAff.pen)}).`
      : `${bestAff.name} es la marca PRISA con mayor afinidad (índice ${bestAff.aff}); ${bestReach.name} aporta el mayor alcance (${pct(bestReach.pen)}).`
    : 'No hay audiencia PRISA medida para este segmento.';

  const reads: { k: string; v: string }[] = [];
  if (bestAff) reads.push({ k: 'Mayor afinidad con escala', v: `${bestAff.name}: índice ${bestAff.aff} con ${pct(bestAff.pen)} de penetración (${scaleWord(bestAff.pen)}).` });
  if (bestReach && bestReach.name !== bestAff?.name) reads.push({ k: 'Mayor alcance', v: `${bestReach.name}: ${pct(bestReach.pen)} del segmento, índice ${bestReach.aff}.` });
  if (niche) reads.push({ k: 'Oportunidad de nicho', v: `${niche.name}: índice ${niche.aff} pero solo ${pct(niche.pen)} de penetración; útil para mensajes específicos, no para cobertura.` });
  if (absent.length) reads.push({ k: 'Sin audiencia medida', v: `${absent.map((b) => b.name).join(' y ')}: TGI no registra oyentes en este segmento.` });

  const summary: { title?: string; body: string }[] = [];
  if (bestAff && bestAff.aff < 100) summary.push({ title: 'Marca ancla', body: `Ninguna marca PRISA supera a la población con escala; ${bestAff.name} es la mejor posicionada (índice ${bestAff.aff}) y la base natural del plan.` });
  if (bestAff && bestAff.aff >= 100) summary.push({ title: 'Marca ancla', body: `Construye el plan sobre ${bestAff.name}: es donde el segmento está por encima de la población con escala suficiente.` });
  if (bestReach && bestReach.name !== bestAff?.name) summary.push({ title: 'Cobertura', body: `Suma ${bestReach.name} para alcance: llega a más personas del segmento aunque su afinidad sea menor.` });
  if (niche) summary.push({ title: 'Nicho', body: `${niche.name} sirve para acciones dirigidas: alta afinidad, poca escala.` });
  if (s.prisa.total) summary.push({ title: 'Peso de PRISA', body: `PRISA Media en conjunto llega a ${pct(s.prisa.total.pen)} del segmento (índice ${s.prisa.total.aff}): ${s.prisa.total.aff != null && s.prisa.total.aff >= 100 ? 'el grupo está sobre-representado en esta audiencia' : 'el grupo no está sobre-representado; el valor está en marcas puntuales'}.` });

  return (
    <article className="page">
      <PageHeader n="04" question="¿Dónde tengo mejor oportunidad?" answer={answer} lede="Las cinco marcas PRISA evaluadas: afinidad como criterio principal y penetración como escala." source="TGI" />

      <div className={`stats stats--row hero-stats stats--n${1 + (bestAff ? 1 : 0) + (bestReach && bestReach.name !== bestAff?.name ? 1 : 0)}`}>
        <Stat label="Alcance total PRISA Media" m={s.prisa.total} />
        {bestAff && <Stat label={`${bestAff.name}: más afín con escala`} m={{ label: bestAff.name, pen: bestAff.pen, aff: bestAff.aff }} />}
        {bestReach && bestReach.name !== bestAff?.name && <Stat label={`${bestReach.name}: mayor alcance`} m={{ label: bestReach.name, pen: bestReach.pen, aff: bestReach.aff }} />}
      </div>

      <Panel title="Ranking por afinidad" source="TGI" className="panel--wide" note={`Índice 100 = igual que la población. Escala: alta ≥ 15 %, media 5–15 %, baja < 5 %. Posición = lugar de la emisora entre las más escuchadas por el segmento.`}>
        <ol className="brands">
          {brands.map((b, i) => {
            const rank = rankOf(b.name);
            return (
              <li key={b.id} className="brands__item" data-tip={`${b.name}|Penetración ${pct(b.pen)}|Índice ${b.aff}`} tabIndex={0}>
                <span className="brands__rank num">{i + 1}</span>
                <span className="brands__name">{b.name}</span>
                {b.pen > 0 ? (
                  <>
                    <span className="brands__aff display num"><Counter value={b.aff} decimals={0} /><small>índice</small></span>
                    <span className="brands__pen num">{pct(b.pen)} del segmento</span>
                    <span className="brands__scale">{scaleWord(b.pen)}{rank ? `, nº ${rank} en alcance` : ''}</span>
                  </>
                ) : <span className="brands__scale">Sin audiencia medida</span>}
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel title="Lectura de oportunidad" source="TGI" className="panel--wide">
        <ul className="reads">
          {reads.map((r) => <li key={r.k}><strong>{r.k}</strong><span>{r.v}</span></li>)}
        </ul>
      </Panel>

      <SoWhat source="TGI" items={summary.slice(0, 4)} />
    </article>
  );
}
