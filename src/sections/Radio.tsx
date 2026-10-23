import type { Metric, Segment } from '../lib/types';
import { pct } from '../lib/format';
import { Panel, SoWhat, Stat } from '../components/bits';
import { BarList, DaypartGrid } from '../charts/charts';
import { PageHeader } from '../components/PageHeader';
import { byAffinity, byPen, clean, inSentence, relevant, without } from '../lib/select';

const prisaTag = (m: Metric & { prisa?: boolean }) => ({ ...m, label: m.prisa ? `${m.label} (PRISA)` : m.label });

export function Radio({ s }: { s: Segment }) {
  const r = s.radio;
  const daily = r.frequency.find((f) => /Todos los días/i.test(f.label));
  const topReach = byPen(r.stations, 8).map((m) => prisaTag(r.stations.find((x) => x.label === m.label) ?? m));
  const topAff = without(byAffinity(r.stations, 6, 3).filter((m) => (m.aff ?? 0) >= 100), topReach.slice(0, 3)).map((m) => prisaTag(r.stations.find((x) => x.label === m.label) ?? m));
  const programs = clean(r.programs).slice(0, 6);
  const places = byPen(r.places, 4);
  const devices = byPen(r.devices, 4);
  const genres = relevant(r.genres, 6);
  const reasons = byPen(r.reasons, 5);
  const best = r.best;
  const topDevice = devices[0];
  const topPlace = places[0];

  const answer = best
    ? `${pct(r.reach?.pen)} escucha radio; su mejor momento es ${best.day} ${best.slot} h, donde llega a ${pct(best.pen)} con índice ${best.aff}.`
    : `${pct(r.reach?.pen)} escucha radio en algún formato.`;

  const summary: { title?: string; body: string }[] = [];
  if (best && best.aff < 100) summary.push({ title: 'Cuándo pautar', body: `${best.day} ${best.slot} h es su franja más fuerte, aunque está por debajo de la población (índice ${best.aff}): ahí la radio aporta alcance más que afinidad.` });
  if (best && best.aff >= 100) summary.push({ title: 'Cuándo pautar', body: `${best.day} ${best.slot} h concentra la escucha con afinidad (índice ${best.aff}): es la franja prioritaria; el resto de la jornada sirve para frecuencia, no para alcance.` });
  if (topAff[0]) summary.push({ title: 'Dónde está la afinidad', body: `${topAff[0].label} (índice ${topAff[0].aff}) reúne al segmento por encima de la población aunque no sea la más escuchada: complementa a las emisoras de mayor alcance.` });
  if (programs[0]) summary.push({ title: 'Qué contenido lo retiene', body: `${programs[0].label} (índice ${programs[0].aff}) es la programación que más lo diferencia: integraciones de marca en ese tipo de contenido tienen más afinidad que un spot genérico.` });
  if (topPlace && topDevice) summary.push({ title: 'En qué contexto', body: `Escucha sobre todo ${inSentence(topPlace.label)} y por ${inSentence(topDevice.label)}: el formato y la duración del mensaje deben pensarse para ese contexto.` });

  return (
    <article className="page">
      <PageHeader n="03" question="¿Cuándo puedo alcanzarlo?" answer={answer} lede="Hábitos de escucha TGI: cuánto, cuándo, qué emisoras y qué contenidos." source="TGI" />

      <div className="stats stats--row hero-stats">
        <Stat label="Escucha radio en algún formato" m={r.reach} />
        <Stat label="Radio AM/FM (últimos 30 días)" m={r.amfm} />
        <Stat label="Radio online (últimos 30 días)" m={r.online} />
        <Stat label="Escucha radio todos los días" m={daily} />
      </div>

      <Panel title="Jornada de radio" source="TGI" className="panel--wide" note="Penetración por día y franja (valores TGI reales). Recuadro magenta: la franja de mayor afinidad entre las que tienen al menos 60 % de la penetración máxima.">
        <DaypartGrid days={r.dayparts} best={best} />
      </Panel>

      <div className="grid grid--2 grid--top">
        <Panel title="Emisoras más escuchadas" source="TGI" note="Oyentes en los últimos 30 días.">
          <BarList items={topReach} />
        </Panel>
        <div className="stack">
          <Panel title="Emisoras con mayor afinidad" source="TGI" note="Índice más alto con al menos 3 % de penetración; excluye las tres de mayor alcance.">
            <BarList items={topAff} />
          </Panel>
          <Panel title="Para qué usa la radio" source="TGI">
            <BarList items={reasons} />
          </Panel>
        </div>
      </div>

      <div className="grid grid--2 grid--top">
        <div className="stack">
          <Panel title="Programación que prefiere" source="TGI" note="Elige y escucha regularmente; ordenada por afinidad con al menos 5 % de penetración.">
            <BarList items={programs} />
          </Panel>
          <Panel title="Música que prefiere" source="TGI">
            <BarList items={genres} />
          </Panel>
        </div>
        <Panel title="Dónde y cómo escucha" source="TGI">
          <h4 className="panel__sub">Lugares</h4>
          <BarList items={places} />
          <h4 className="panel__sub">Aparatos</h4>
          <BarList items={devices} />
        </Panel>
      </div>

      <SoWhat source="TGI" items={summary.slice(0, 4)} />
    </article>
  );
}
