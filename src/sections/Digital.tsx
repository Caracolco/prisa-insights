import type { Segment } from '../lib/types';
import { pct } from '../lib/format';
import { Panel, SoWhat, Stat } from '../components/bits';
import { BarList } from '../charts/charts';
import { PageHeader } from '../components/PageHeader';
import { byAffinity, byPen, clean, relevant } from '../lib/select';

export function Digital({ s }: { s: Segment }) {
  const d = s.digital;
  const intense = d.internetFrequency.find((f) => /Más de una vez al día/i.test(f.label));
  const periods = clean(d.internetPeriods);
  const bestPeriod = byAffinity(d.internetPeriods, 1, 20)[0];
  const social = byPen(d.social, 6);
  const socialAff = byAffinity(d.social, 1, 5)[0];
  const apps = relevant(d.apps, 6);
  const video = byPen(s.video.platforms, 5);
  const videoTypes = relevant(s.video.types, 5);
  const podcast = s.audio.podcast;
  const podTopics = relevant(podcast.topics, 5, 3);
  const music = byPen(s.audio.music, 3);
  const netActs = relevant(d.activities, 6);
  const tech = relevant(s.opinions.all.filter((o) => o.category === 'TECNOLOGÍA'), 6);

  const answer = `${intense ? `${pct(intense.pen)} se conecta varias veces al día` : 'Se conecta a diario'}; su red principal es ${social[0]?.label ?? '—'}${socialAff && socialAff.label !== social[0]?.label ? ` y donde más se diferencia es ${socialAff.label} (índice ${socialAff.aff})` : ''}.`;

  const summary: { title?: string; body: string }[] = [];
  if (bestPeriod) summary.push({ title: 'Cuándo está conectado', body: `${bestPeriod.label} h es la franja de internet con más afinidad (índice ${bestPeriod.aff}): ahí conviene concentrar la pauta digital.` });
  if (socialAff) summary.push({ title: 'Red para diferenciarse', body: `${social[0]?.label} da la cobertura; ${socialAff.label} (índice ${socialAff.aff}) es donde el segmento pesa más que la población.` });
  if (podcast.listens) summary.push({ title: 'Audio digital', body: `${pct(podcast.listens.pen)} escucha podcast (índice ${podcast.listens.aff})${podTopics[0] ? `; el tema con mejor combinación de escala y afinidad es ${podTopics[0].label.toLowerCase()}` : ''}.` });
  const techMax = Math.max(0, ...tech.map((t) => t.aff ?? 0));
  if (tech[0] && techMax < 100) summary.push({ title: 'Relación con la tecnología', body: 'Ninguna actitud tecnológica supera a la población: lo digital es una herramienta, no una pasión. Mensajes simples y prácticos, sin jerga.' });
  if (tech[0] && techMax >= 100) summary.push({ title: 'Relación con la tecnología', body: `“${tech[0].label}” (${pct(tech[0].pen)}, índice ${tech[0].aff}) define el tono para hablarle de lo digital.` });

  return (
    <article className="page">
      <PageHeader n="05" question="¿Cómo se comporta conectado?" answer={answer} lede="Uso de internet, redes, apps, video y audio digital según TGI." source="TGI" />

      <div className="stats stats--row hero-stats">
        <Stat label="Se conecta más de una vez al día" m={intense} />
        <Stat label={`Usa ${social[0]?.label ?? 'su red principal'} (últimos 7 días)`} m={social[0]} />
        <Stat label={`Paga ${video[0]?.label ?? 'video'}`} m={video[0]} />
        <Stat label="Acostumbra escuchar podcast" m={podcast.listens} />
      </div>

      <div className="grid grid--2">
        <Panel title="Franjas de conexión" source="TGI" note="Uso de internet por franja horaria.">
          <BarList items={periods} />
        </Panel>
        <Panel title="Redes sociales" source="TGI" note="Accedió en los últimos 7 días.">
          <BarList items={social} />
        </Panel>
      </div>

      <div className="grid grid--2">
        <Panel title="Apps que usa" source="TGI" note="Seleccionadas por escala y afinidad.">
          <BarList items={apps} />
        </Panel>
        <Panel title="Qué hace en internet" source="TGI">
          <BarList items={netActs} />
        </Panel>
      </div>

      <div className="grid grid--2 grid--top">
        <Panel title="Video" source="TGI">
          <h4 className="panel__sub">Plataformas con suscripción paga</h4>
          <BarList items={video} />
          {videoTypes.length > 0 && <><h4 className="panel__sub">Videos que ve en línea</h4><BarList items={videoTypes} /></>}
        </Panel>
        <div className="stack">
          <Panel title="Audio digital" source="TGI">
            {podTopics.length > 0 && <><h4 className="panel__sub">Temas de podcast</h4><BarList items={podTopics} /></>}
            {music.length > 0 && <><h4 className="panel__sub">Música en streaming (suscripción paga)</h4><BarList items={music} /></>}
          </Panel>
          {tech.length > 0 && (
            <Panel title="Actitudes frente a la tecnología" source="TGI" note="Opiniones de tecnología seleccionadas por escala y afinidad.">
              <BarList items={tech} />
            </Panel>
          )}
        </div>
      </div>

      <SoWhat source="TGI" items={summary.slice(0, 4)} />
    </article>
  );
}
