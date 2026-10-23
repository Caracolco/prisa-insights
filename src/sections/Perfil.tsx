import type { Segment } from '../lib/types';
import { pct } from '../lib/format';
import { Counter } from '../motion/Counter';
import { Aff, Panel, SoWhat, Stat } from '../components/bits';
import { AgeColumns, BarList, Proportion } from '../charts/charts';
import { PageHeader } from '../components/PageHeader';

export function Perfil({ s }: { s: Segment }) {
  const p = s.profile;
  const emp = p.employment;
  const works = emp['TRABAJA']; const notWorking = emp['No trabaja'];
  const regions = [...p.region].sort((a, b) => b.pen - a.pen);
  return (
    <article className="page">
      <PageHeader n="01" question="¿Quién es?" answer={p.narrative.headline} lede={p.narrative.sub} facts={p.narrative.facts.map((f) => f.text)} source="TGI" />

      <div className="hero-stats">
        <div className="hero-stats__main">
          <span className="label">Tamaño del segmento</span>
          <span className="hero-stats__big display"><Counter value={s.size000 / 1000} suffix=" M" /></span>
          <span className="hero-stats__sub">de personas: <Counter value={s.share} suffix={" %"} /> de la población</span>
          <span className="hero-stats__def">Definición TGI: {s.definition}</span>
        </div>
        <Proportion items={p.gender} />
      </div>

      <div className="grid grid--2">
        <Panel title="Edad" source="TGI" note="Barras resaltadas: grupos donde el segmento pesa más que en la población (índice ≥ 108).">
          <AgeColumns items={p.age} />
        </Panel>
        <Panel title="Nivel socioeconómico" source="TGI" note="Estratos medidos por TGI. El índice compara con la población total.">
          <Proportion items={p.nse} />
          <h4 className="panel__sub">Región</h4>
          <BarList items={regions} />
        </Panel>
      </div>

      <div className="grid grid--3">
        <Panel title="Rol en el hogar" source="TGI">
          <div className="stats">
            <Stat label="Hace las compras del hogar" m={p.household.buyer} />
            <Stat label="Jefe de familia" m={p.household.head} />
            <Stat label="Responsable del cuidado del hogar" m={p.household.caretaker} />
          </div>
        </Panel>
        <Panel title="Trabajo y estudios" source="TGI">
          <div className="stats">
            <Stat label="Trabaja" m={works} note={emp['Trabajo tiempo completo'] ? `${pct(emp['Trabajo tiempo completo'].pen)} tiempo completo` : undefined} />
            <Stat label="No trabaja" m={notWorking} />
          </div>
          <h4 className="panel__sub">Nivel educativo más alto</h4>
          <BarList items={p.education.filter((e) => e.pen >= 1)} />
        </Panel>
        <Panel title="Vida en pareja y vivienda" source="TGI">
          <BarList items={p.marital} />
          <h4 className="panel__sub">Vivienda</h4>
          <Proportion items={p.housing} />
        </Panel>
      </div>

      {p.plans.length > 0 && (
        <Panel title="Lo que viene: planes para los próximos 12 meses" source="TGI" className="panel--wide"
          note="Selección: penetración ≥ 3 %, prioriza afinidad ≥ 100 con escala ≥ 5 %; un plan por tema (vivienda, pareja, trabajo…).">
          <ol className="plans">
            {p.plans.map((m, i) => (
              <li key={m.label} className="plans__item" data-tip={`${m.label}|${pct(m.pen)} lo espera en los próximos 12 meses|Índice ${m.aff}`} tabIndex={0}>
                <span className="plans__rank num">{i + 1}</span>
                <span className="plans__label">{m.label}</span>
                <span className="plans__pen display"><Counter value={m.pen} suffix={" %"} /></span>
                <Aff value={m.aff} />
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <SoWhat source="TGI" items={p.narrative.soWhat.map((body) => ({ body }))} />
    </article>
  );
}
