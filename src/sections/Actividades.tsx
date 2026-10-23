import type { Metric, Segment } from '../lib/types';
import { pct } from '../lib/format';
import { Aff, Panel, SoWhat } from '../components/bits';
import { BarList } from '../charts/charts';
import { PageHeader } from '../components/PageHeader';
import { byAffinity, inSentence, lower, relevant, without } from '../lib/select';

// Territorios de opinión que se leen por separado (una opinión por territorio, sin repetir las de arriba)
const TERRITORIES: [string, string][] = [
  ['COMPRAS', 'Compras'], ['COMIDA', 'Alimentación'], ['FINANZAS', 'Dinero'], ['TECNOLOGÍA', 'Tecnología'],
  ['SALUD', 'Salud'], ['VIAJES', 'Viajes'], ['HOGAR', 'Hogar'], ['DEPORTE', 'Ejercicio'],
];

export function Actividades({ s }: { s: Segment }) {
  const a = s.activities;
  const leisure = relevant(a.leisure, 8);
  const sports = relevant(a.sports, 3, 3);
  const vacations = relevant(a.vacations, 3, 3);
  const lodging = relevant(a.lodging, 2, 3);
  const games = relevant(a.games, 3, 3);

  const distinctive = s.opinions.distinctive.slice(0, 8);
  const shared = without(s.opinions.shared, distinctive).slice(0, 6);
  const shown = [...distinctive, ...shared];
  const territories = TERRITORIES.map(([cat, name]) => {
    const pick = relevant(without(s.opinions.all.filter((o) => o.category === cat), shown), 1, 5)[0];
    return pick ? { cat: name, m: pick } : null;
  }).filter(Boolean) as { cat: string; m: Metric }[];

  const topLeisureAff = byAffinity(a.leisure, 1, 10)[0];
  const topOp = distinctive[0];
  const topVac = vacations[0];
  const strongOp = topOp && (topOp.aff ?? 0) >= 110;
  const answer = topOp
    ? `Su tiempo libre gira en torno a ${inSentence(leisure[0]?.label ?? '')} y ${inSentence(leisure[1]?.label ?? '')}; ${strongOp ? 'lo que más lo distingue es que' : 'en opiniones está cerca del promedio, aunque destaca que'} “${lower(topOp.label)}”.`
    : `Su tiempo libre gira en torno a ${inSentence(leisure[0]?.label ?? '')} y ${inSentence(leisure[1]?.label ?? '')}.`;

  const summary: { title?: string; body: string }[] = [];
  if (topLeisureAff && (topLeisureAff.aff ?? 0) >= 110) summary.push({ title: 'Territorio de ocio diferencial', body: `${topLeisureAff.label} (${pct(topLeisureAff.pen)}, índice ${topLeisureAff.aff}) es donde el segmento se aparta más de la población: patrocinios y contenidos en ese territorio llegan con afinidad.` });
  if (topOp && !strongOp) summary.push({ title: 'Sin una actitud extrema', body: `Ninguna opinión lo separa con fuerza de la población (la más alta llega a índice ${topOp.aff}): háblale desde valores amplios y concretos, no desde un rasgo de nicho.` });
  if (topOp && strongOp) summary.push({ title: 'Una actitud para el mensaje', body: `“${topOp.label}” (índice ${topOp.aff}) es su rasgo más diferencial: úsalo como tensión o promesa en lugar de hablarle en genérico.` });
  if (shared[0]) summary.push({ title: 'Lo que comparte con la mayoría', body: `“${shared[0].label}” (${pct(shared[0].pen)}) es un piso común: sirve de punto de entrada, no de diferenciación.` });
  if (topVac) summary.push({ title: 'Momento de desconexión', body: `En vacaciones elige ${inSentence(topVac.label)} (${pct(topVac.pen)}, índice ${topVac.aff}): una ocasión concreta para activar marcas fuera de la rutina.` });

  return (
    <article className="page">
      <PageHeader n="02" question="¿Cómo vive y qué piensa?" answer={answer} lede="Actividades y opiniones TGI seleccionadas por escala y afinidad a la vez: no solo lo más común, también lo que lo diferencia." source="TGI" />

      <section className="block">
        <h2 className="block__title">Actividades</h2>
        <div className="grid grid--2 grid--top">
          <div className="stack">
            <Panel title="Tiempo libre" source="TGI" note="Ordenadas por la combinación de penetración y afinidad.">
              <BarList items={leisure} />
            </Panel>
            {games.length > 0 && (
              <Panel title="Juegos que acostumbra" source="TGI">
                <BarList items={games} />
              </Panel>
            )}
          </div>
          <Panel title="Deporte y viajes" source="TGI">
            {sports.length > 0 && <><h4 className="panel__sub">Deportes que practica</h4><BarList items={sports} /></>}
            {vacations.length > 0 && <><h4 className="panel__sub">Tipo de vacaciones</h4><BarList items={vacations} /></>}
            {lodging.length > 0 && <><h4 className="panel__sub">Dónde se aloja</h4><BarList items={lodging} /></>}
          </Panel>
        </div>
      </section>

      <section className="block">
        <h2 className="block__title">Opiniones y actitudes</h2>
        <div className="grid grid--2">
          <Panel title="Lo que lo distingue" source="TGI" note="Afinidad > 100 y penetración ≥ 5 %; una por tema y máximo dos por categoría.">
            {distinctive.length ? <BarList items={distinctive} /> : <p className="panel__note">Ninguna opinión supera a la población con escala suficiente.</p>}
          </Panel>
          <Panel title="Lo que comparte con la mayoría" source="TGI" note="Opiniones con mayor penetración y afinidad cercana o superior a 100, distintas de las anteriores.">
            <BarList items={shared} />
          </Panel>
        </div>
        {territories.length > 0 && (
          <Panel title="Una opinión por territorio" source="TGI" className="panel--wide">
            <ul className="ops">
              {territories.map((t) => (
                <li key={t.cat} data-tip={`${t.m.label}|${pct(t.m.pen)} totalmente de acuerdo|Índice ${t.m.aff}`} tabIndex={0}>
                  <span className="ops__cat">{t.cat}</span>
                  <span className="ops__label">{t.m.label} <span className="num" style={{ color: 'var(--text-2)' }}>({pct(t.m.pen)})</span></span>
                  <Aff value={t.m.aff} compact />
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </section>

      <SoWhat source="TGI" items={summary.slice(0, 4)} />
    </article>
  );
}
