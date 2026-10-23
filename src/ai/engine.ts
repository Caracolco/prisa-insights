// Motor DETERMINÍSTICO de la Audiencia Sintética.
// Responde SOLO con datos del segmento (TGI + Social Listening procesados). No inventa:
// si una pregunta no tiene evidencia, lo dice y sugiere preguntas que sí la tienen.
// Se usa en el navegador (modo demo) y en el Worker como respaldo del LLM.
import type { Answer, EvidenceItem, Metric, Segment, SourceKind } from '../lib/types';
import { pct } from '../lib/format';

type Intent = {
  id: string;
  match: RegExp;
  needsSocial?: boolean;
  build: (s: Segment, q: string) => Omit<Answer, 'mode' | 'suggestions' | 'grounded'> | null;
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();
const ev = (source: 'TGI' | 'SOCIAL', label: string, value: string): EvidenceItem => ({ source, label, value });
const metricEv = (m: Metric | null | undefined, prefix = ''): EvidenceItem[] => (m ? [ev('TGI', prefix + m.label, `${pct(m.pen)}${m.aff != null ? ` · índice ${m.aff}` : ''}`)] : []);
const vsPop = (aff: number | null) => (aff == null ? '' : aff >= 115 ? 'mucho más que la población' : aff >= 105 ? 'más que la población' : aff <= 85 ? 'menos que la población' : aff <= 95 ? 'algo menos que la población' : 'en línea con la población');
const list = (arr: Metric[], n = 3) => arr.slice(0, n).map((m) => `${m.label} (${pct(m.pen)})`).join(', ');
const affinityLeaders = (arr: Metric[], minPen = 3, n = 3) => arr.filter((m) => m.pen >= minPen && (m.aff ?? 0) >= 105).sort((a, b) => (b.aff ?? 0) - (a.aff ?? 0)).slice(0, n);
const conf = (minPen: number): Answer['confidence'] => (minPen >= 10 ? 'alta' : minPen >= 4 ? 'media' : 'baja');
const productOf = (s: Segment) => s.social?.product ?? s.product ?? '';

const PERSONAL = /\b(como te llamas|tu nombre|cuantos anos tienes|tu edad|donde vives tu|donde trabajas|tu trabajo|tu esposo|tu esposa|tus hijos|eres real|eres una persona|quien eres tu)\b/;

const OPINION_TOPICS: { re: RegExp; cats: string[]; label: string; social?: string }[] = [
  { re: /saludable|nutri|dieta|proteina|alimentacion|comer bien|calorias/, cats: ['COMIDA'], label: 'la alimentación', social: 'nutricion' },
  { re: /salud|medic|enferm/, cats: ['SALUD'], label: 'la salud' },
  { re: /compra|precio|oferta|marca|gasto|gastar/, cats: ['COMPRAS'], label: 'las compras', social: 'precio' },
  { re: /ahorro|dinero|plata|finanz|deuda|credito/, cats: ['FINANZAS'], label: 'el dinero' },
  { re: /tecnolog|celular|internet|digital/, cats: ['TECNOLOGÍA'], label: 'tecnología' },
  { re: /viaj|vacacion|turismo/, cats: ['VIAJES'], label: 'viajes' },
  { re: /ejercicio|deporte|gimnasio|gym/, cats: ['DEPORTE'], label: 'ejercicio y deporte' },
  { re: /hogar|casa|famil/, cats: ['HOGAR', 'ESTILO DE VIDA'], label: 'hogar y familia', social: 'familia' },
  { re: /vida|valores|futuro|trabajo|carrera/, cats: ['ESTILO DE VIDA'], label: 'estilo de vida' },
  { re: /celebra|fiesta|navidad/, cats: ['CELEBRACIONES'], label: 'celebraciones' },
  { re: /carro|auto|vehiculo|moto/, cats: ['AUTOMÓVILES'], label: 'automóviles' },
];

const INTENTS: Intent[] = [
  {
    id: 'social', needsSocial: true,
    match: /redes (dicen|opinan|hablan)|que dice(n)? (la gente|en redes|las redes)|conversacion|social listening|escucha social|en redes sobre|dicen (de|sobre) el (huevo|pollo)/,
    build: (s) => {
      const so = s.social!;
      const top = so.topics.slice(0, 3);
      const unexpected = so.insights[0];
      return {
        answer: `${so.headline?.title ?? ''} En la conversación espontánea colombiana sobre ${so.product} lo que más aparece es ${top.map((t) => `${t.name.toLowerCase()} (${pct(t.share)})`).join(', ')}.${unexpected ? ` Y algo que no esperábamos: ${unexpected.title.charAt(0).toLowerCase() + unexpected.title.slice(1)}` : ''}`,
        evidence: [ev('SOCIAL', 'Menciones relevantes de consumidores en Colombia', so.volume.co.toLocaleString('es-CO')), ...top.map((t) => ev('SOCIAL', t.name, `${pct(t.share)} · ${t.n.toLocaleString('es-CO')} menciones`)), ...(unexpected ? [ev('SOCIAL', unexpected.title, `${unexpected.n.toLocaleString('es-CO')} menciones en Colombia`)] : [])],
        source: 'SOCIAL', confidence: 'media',
      };
    },
  },
  {
    id: 'consumoProducto', needsSocial: true,
    match: /como (consumes|comes|preparas|cocinas|te gusta)|(consumes|comes|preparas) (el |los )?(huevo|pollo)|recetas?|desayuno|forma de comer/,
    build: (s) => {
      const so = s.social!;
      const rec = so.topics.find((t) => t.id === 'recetas');
      const des = so.occasions.find((t) => t.id === 'desayuno');
      const ant = so.topics.find((t) => t.id === 'antojo');
      const ex = rec?.excerpts[0];
      const parts = [`Este segmento se define en TGI por su consumo: ${s.definition.toLowerCase()}.`];
      if (rec) parts.push(`Cuando en Colombia se habla espontáneamente de ${so.product}, ${pct(rec.share)} de lo que se dice es sobre cómo prepararlo${des ? ` y ${des.n} menciones lo ubican en el desayuno` : ''}${ant ? `; ${pct(ant.share)} lo asocia con antojo` : ''}.`);
      return {
        answer: parts.join(' '),
        evidence: [ev('TGI', 'Definición del segmento', s.definition), ...(rec ? [ev('SOCIAL', rec.name, `${pct(rec.share)} · ${rec.n.toLocaleString('es-CO')} menciones`)] : []), ...(des ? [ev('SOCIAL', `Ocasión: ${des.name}`, `${des.n} menciones`)] : []), ...(ant ? [ev('SOCIAL', ant.name, pct(ant.share))] : []), ...(ex ? [ev('SOCIAL', 'Extracto anonimizado', `“${ex.text}”`)] : [])],
        source: 'TGI + SOCIAL', confidence: rec ? 'media' : 'baja',
      };
    },
  },
  {
    id: 'preocupaciones',
    match: /preocupa|al comprar|te molesta|te frena|barrera|que (te )?importa al comprar|que buscas al comprar|desconfi/,
    build: (s) => {
      const tgi = s.opinions.all.filter((o) => o.category === 'COMPRAS').sort((a, b) => b.pen - a.pen).slice(0, 3);
      const tens = s.social?.tensions.filter((t) => t.kind === 'tensión').slice(0, 3) ?? [];
      if (!tgi.length && !tens.length) return null;
      const a = [`Al comprar, lo que más declaramos en este segmento es: ${tgi.map((o) => `“${o.label.toLowerCase()}” (${pct(o.pen)})`).join(', ')}.`];
      if (tens.length) a.push(`En la conversación colombiana, las tensiones con el ${s.social!.product} son: ${tens.map((t) => t.title.toLowerCase()).join('; ')}.`);
      return {
        answer: a.join(' '),
        evidence: [...tgi.flatMap((o) => metricEv(o)), ...tens.map((t) => ev('SOCIAL', t.title, `${t.n.toLocaleString('es-CO')} menciones · ${pct(t.share)}`))],
        source: tens.length ? 'TGI + SOCIAL' : 'TGI', confidence: 'media',
      };
    },
  },
  {
    id: 'horario',
    match: /a que hora|que hora|cuando (escuchas|oyes|me escuchas|debo|deberia)|horario|franja|momento del dia|en que momento|manana|tarde|noche/,
    build: (s) => {
      const b = s.radio.best; if (!b) return null;
      const cells = s.radio.dayparts.flatMap((d) => d.slots.map((x) => ({ ...x, day: d.day }))).sort((x, y) => y.pen - x.pen).slice(0, 3);
      const net = [...s.digital.internetPeriods].sort((x, y) => (y.aff ?? 0) - (x.aff ?? 0))[0];
      return {
        answer: `Por radio, el mejor momento para hablarnos es ${b.day} ${b.slot} h: ahí escucha ${pct(b.pen)} del segmento, con índice ${b.aff} (${vsPop(b.aff)}). Las franjas con más audiencia son ${cells.map((c) => `${c.day} ${c.slot} h (${pct(c.pen)})`).join(', ')}.${net ? ` En internet nuestra franja más afín es ${net.label} h (${pct(net.pen)}, índice ${net.aff}).` : ''}`,
        evidence: [ev('TGI', `Radio ${b.day} ${b.slot} h`, `${pct(b.pen)} · índice ${b.aff}`), ...cells.map((c) => ev('TGI', `Radio ${c.day} ${c.slot} h`, `${pct(c.pen)} · índice ${c.aff}`)), ...metricEv(net, 'Internet ')],
        source: 'TGI', confidence: 'alta',
      };
    },
  },
  {
    id: 'prisa',
    match: /prisa|caracol|los ?40|besame|tropicana|radioacktiva|marca.*(afin|cercana|conecta)|(afin|cercana).*marca/,
    build: (s) => {
      const br = s.prisa.brands; if (!br.length) return null;
      // La afinidad solo cuenta con escala: marcas con al menos 5 % de alcance en el segmento
      const scaled = br.filter((b) => b.pen >= 5); const byAff = [...(scaled.length ? scaled : br)].sort((a, b) => b.aff - a.aff); const byPen = [...br].sort((a, b) => b.pen - a.pen);
      const niche = br.filter((b) => b.pen < 5 && b.aff > byAff[0].aff).sort((a, b) => b.aff - a.aff)[0];
      return {
        answer: `Con escala suficiente, la marca PRISA más afín es ${byAff[0].name} (índice ${byAff[0].aff}, ${pct(byAff[0].pen)} la escuchó en el último mes). ${byPen[0].name === byAff[0].name ? 'También es la de mayor alcance.' : `La de mayor alcance es ${byPen[0].name} (${pct(byPen[0].pen)}).`}${niche ? ` ${niche.name} tiene índice ${niche.aff}, pero llega a pocos (${pct(niche.pen)}).` : ''}${s.prisa.total ? ` En total, ${pct(s.prisa.total.pen)} del segmento está en contacto con PRISA Media.` : ''}`,
        evidence: [...br.map((b) => ev('TGI', `${b.name} (oyentes 30 días)`, `${pct(b.pen)} · índice ${b.aff}`)), ...metricEv(s.prisa.total)],
        source: 'TGI', confidence: conf(byAff[0].pen),
      };
    },
  },
  {
    id: 'emisoras',
    match: /emisora|estacion|que radio|cual radio|escuchas (en )?radio|radio escuchas|frecuencia/,
    build: (s) => {
      const st = s.radio.stations; if (!st.length) return null;
      const lead = affinityLeaders(st, 3);
      return {
        answer: `Las emisoras que más escuchamos son ${list(st, 3)}.${lead.length ? ` Donde más nos diferenciamos de la población es en ${lead.map((m) => `${m.label} (índice ${m.aff})`).join(', ')}.` : ''}${s.radio.reach ? ` En total, ${pct(s.radio.reach.pen)} consume radio en algún formato.` : ''}`,
        evidence: [...st.slice(0, 4).flatMap((m) => metricEv(m)), ...lead.flatMap((m) => metricEv(m)), ...metricEv(s.radio.reach)],
        source: 'TGI', confidence: 'alta',
      };
    },
  },
  {
    id: 'programas',
    match: /programa|programacion|que te gusta oir|noticias|deportivo|musica en radio/,
    build: (s) => s.radio.programs.length ? {
      answer: `Los programas de radio que más nos distinguen de la población son ${s.radio.programs.slice(0, 4).map((m) => `${m.label.toLowerCase()} (${pct(m.pen)}, índice ${m.aff})`).join(', ')}.`,
      evidence: s.radio.programs.slice(0, 5).flatMap((m) => metricEv(m)), source: 'TGI', confidence: conf(s.radio.programs[0].pen),
    } : null,
  },
  {
    id: 'medios',
    match: /medios|que consumes|consumo de medios|donde te encuentro|canales|como te informas/,
    build: (s) => ({
      answer: `${s.radio.reach ? `${pct(s.radio.reach.pen)} escucha radio en algún formato. ` : ''}En redes, lo más usado es ${list(s.digital.social, 3)}. En video por suscripción, ${list(s.video.platforms, 2)}.${s.audio.podcast.listens ? ` ${pct(s.audio.podcast.listens.pen)} acostumbra escuchar podcast.` : ''}`,
      evidence: [...metricEv(s.radio.reach), ...s.digital.social.slice(0, 3).flatMap((m) => metricEv(m)), ...s.video.platforms.slice(0, 2).flatMap((m) => metricEv(m)), ...metricEv(s.audio.podcast.listens, 'Podcast: ')],
      source: 'TGI', confidence: 'alta',
    }),
  },
  {
    id: 'redesUso',
    match: /redes sociales|que redes|tiktok|instagram|facebook|youtube|whatsapp|linkedin|\bx\b|twitter|apps?|aplicacion/,
    build: (s, q) => {
      const named = s.digital.social.concat(s.digital.apps).find((m) => q.includes(norm(m.label).split(' ')[0]));
      const lead = affinityLeaders(s.digital.social, 5, 2);
      return {
        answer: named
          ? `${named.label}: ${pct(named.pen)} del segmento lo usa (índice ${named.aff}, ${vsPop(named.aff)}).`
          : `Las redes que más usamos son ${list(s.digital.social, 4)}.${lead.length ? ` Sobre-indexamos en ${lead.map((m) => `${m.label} (índice ${m.aff})`).join(' y ')}.` : ''} Entre las apps destacan ${list(s.digital.apps, 3)}.`,
        evidence: named ? metricEv(named) : [...s.digital.social.slice(0, 4).flatMap((m) => metricEv(m)), ...s.digital.apps.slice(0, 3).flatMap((m) => metricEv(m))],
        source: 'TGI', confidence: 'alta',
      };
    },
  },
  {
    id: 'video',
    match: /video|netflix|series|peliculas|streaming|disney|prime|television|tv/,
    build: (s) => ({
      answer: `Pagamos sobre todo ${list(s.video.platforms, 3)}${s.video.watchedYesterday[0] ? `; lo más visto ayer fue ${list(s.video.watchedYesterday, 2)}` : ""}. Los tipos de video online que más vemos son ${list(s.video.types, 3)}.`,
      evidence: [...s.video.platforms.slice(0, 3).flatMap((m) => metricEv(m)), ...s.video.types.slice(0, 3).flatMap((m) => metricEv(m))],
      source: 'TGI', confidence: 'alta',
    }),
  },
  {
    id: 'podcast',
    match: /podcast/,
    build: (s) => s.audio.podcast.listens ? {
      answer: `${pct(s.audio.podcast.listens.pen)} del segmento acostumbra escuchar podcast (índice ${s.audio.podcast.listens.aff}). Los temas que más escuchamos: ${list(s.audio.podcast.topics, 4)}.`,
      evidence: [...metricEv(s.audio.podcast.listens, 'Podcast: '), ...s.audio.podcast.topics.slice(0, 4).flatMap((m) => metricEv(m, 'Podcast: '))],
      source: 'TGI', confidence: conf(s.audio.podcast.listens.pen),
    } : null,
  },
  {
    id: 'contenidos',
    match: /contenido|temas|te interesa|intereses|que te gusta ver/,
    build: (s) => s.contentThemes.length ? {
      answer: `Los contenidos donde más nos diferenciamos de la población son ${s.contentThemes.slice(0, 4).map((m) => `${m.label.toLowerCase()} en ${m.source?.toLowerCase()} (índice ${m.aff})`).join(', ')}.`,
      evidence: s.contentThemes.slice(0, 5).map((m) => ev('TGI', `${m.source}: ${m.label}`, `${pct(m.pen)} · índice ${m.aff}`)),
      source: 'TGI', confidence: conf(Math.min(...s.contentThemes.slice(0, 4).map((m) => m.pen))),
    } : null,
  },
  {
    id: 'planes',
    match: /planes|planea|proximos 12|proximo ano|que vas a hacer|futuro|metas|piensas comprar|vas a comprar/,
    build: (s) => s.profile.plans.length ? {
      answer: `Para los próximos 12 meses, lo que más planeamos es ${s.profile.plans.slice(0, 3).map((m) => `${m.label.toLowerCase()} (${pct(m.pen)}, índice ${m.aff})`).join(', ')}.`,
      evidence: s.profile.plans.flatMap((m) => metricEv(m, 'Próximos 12 meses: ')), source: 'TGI', confidence: conf(s.profile.plans[0].pen),
    } : null,
  },
  {
    id: 'actividades',
    match: /tiempo libre|actividades|que haces|hobbies|pasatiempos|deporte|vacaciones|fin de semana/,
    build: (s) => ({
      answer: `En nuestro tiempo libre nos gusta ${list(s.activities.leisure, 3).toLowerCase()}. ${s.activities.sports[0] ? `El deporte que más practicamos es ${s.activities.sports[0].label.toLowerCase()} (${pct(s.activities.sports[0].pen)}).` : ''}${s.activities.vacations[0] ? ` En vacaciones preferimos ${s.activities.vacations[0].label.toLowerCase()} (${pct(s.activities.vacations[0].pen)}).` : ''}`,
      evidence: [...s.activities.leisure.slice(0, 3).flatMap((m) => metricEv(m)), ...metricEv(s.activities.sports[0], 'Deporte: '), ...metricEv(s.activities.vacations[0], 'Vacaciones: ')],
      source: 'TGI', confidence: 'alta',
    }),
  },
  {
    id: 'perfil',
    match: /quien(es)? (eres|son)|como eres|perfil|edad|genero|mujer|hombre|estrato|donde viven|region|educacion|estudios|trabajas\b|ocupacion/,
    build: (s) => ({
      answer: `Somos ${s.profile.narrative.headline.charAt(0).toLowerCase() + s.profile.narrative.headline.slice(1)} ${s.profile.narrative.sub} No soy una persona: soy una representación de ese grupo construida con TGI.`,
      evidence: [...s.profile.gender.flatMap((m) => metricEv(m)), ...[...s.profile.age].sort((a, b) => (b.aff ?? 0) - (a.aff ?? 0)).slice(0, 2).flatMap((m) => metricEv(m, 'Edad ')), ...[...s.profile.region].sort((a, b) => (b.aff ?? 0) - (a.aff ?? 0)).slice(0, 1).flatMap((m) => metricEv(m, 'Región: '))],
      source: 'TGI', confidence: 'alta',
    }),
  },
  {
    id: 'opinion',
    match: /que (piensas|opinas|crees|valoras)|opinion|actitud|te importa|como ves/,
    build: (s, q) => {
      const t = OPINION_TOPICS.find((x) => x.re.test(q));
      const pool = t ? s.opinions.all.filter((o) => t.cats.includes(o.category ?? '')) : s.opinions.distinctive;
      if (!pool.length) return null;
      const top = [...pool].sort((a, b) => b.pen - a.pen).slice(0, 3);
      const distinct = [...pool].filter((o) => (o.aff ?? 0) >= 105 && o.pen >= 5).sort((a, b) => (b.aff ?? 0) - (a.aff ?? 0))[0];
      const so = t?.social && s.social ? s.social.topics.find((x) => x.id === t.social) ?? null : null;
      const parts = [`Sobre ${t?.label ?? 'nuestra forma de vivir'}, lo que más compartimos es: ${top.map((o) => `“${o.label.toLowerCase()}” (${pct(o.pen)})`).join(', ')}.`];
      if (distinct && !top.includes(distinct)) parts.push(`Donde más nos diferenciamos: “${distinct.label.toLowerCase()}” (índice ${distinct.aff}).`);
      if (so) parts.push(`Y no es solo lo que declaramos: en la conversación colombiana, ${pct(so.share)} de lo que se dice sobre ${s.social!.product} trata de ${so.name.toLowerCase()}.`);
      return {
        answer: parts.join(' '),
        evidence: [...top.flatMap((o) => metricEv(o)), ...(distinct && !top.includes(distinct) ? metricEv(distinct) : []), ...(so ? [ev('SOCIAL', so.name, `${pct(so.share)} · ${so.n.toLocaleString('es-CO')} menciones`)] : [])],
        source: so ? 'TGI + SOCIAL' : 'TGI', confidence: conf(top[0].pen),
      };
    },
  },
];

export function ask(segment: Segment, question: string): Answer {
  const q = norm(question);
  const suggestions = pickSuggestions(segment, question);
  if (!q) return noEvidence(segment, suggestions);
  if (PERSONAL.test(q)) {
    return {
      answer: 'No soy una persona y no tengo nombre, edad ni historia propia: soy una representación del segmento construida con datos agregados. Puedo contarte qué hace, piensa y consume este grupo.',
      evidence: [], source: null, confidence: null, suggestions, grounded: true, mode: 'demo',
    };
  }
  // Producto distinto al de la audiencia: no hay datos de esa relación (no se mezclan escuchas)
  const named = q.match(/\b(huevos?|pollos?)\b/)?.[1]?.replace(/s$/, '');
  if (named && named !== productOf(segment)) {
    return { answer: `No tengo evidencia sobre la relación de esta audiencia con el ${named}: ${segment.product ? `su escucha social es de ${segment.product} y` : ''} TGI no mide su consumo de ${named} en estos datos.`.replace(':  TGI', ': TGI'), evidence: [], source: null, confidence: null, suggestions, grounded: false, mode: 'demo' };
  }
  for (const intent of INTENTS) {
    if (!intent.match.test(q)) continue;
    if (intent.needsSocial && !segment.social) {
      return { answer: 'No existe una escucha social específica para esta audiencia, así que no puedo hablar de lo que dice en redes. Sí puedo contarte lo que declara en TGI.', evidence: [], source: null, confidence: null, suggestions, grounded: true, mode: 'demo' };
    }
    const r = intent.build(segment, q);
    if (r && r.evidence.length) return { ...r, answer: r.answer.replace(/[ \t\r\n]+/g, ' ').trim(), suggestions, grounded: true, mode: 'demo' };
  }
  return noEvidence(segment, suggestions);
}

function noEvidence(segment: Segment, suggestions: string[]): Answer {
  return { answer: 'No tengo evidencia suficiente para responder eso con los datos disponibles.', evidence: [], source: null, confidence: null, suggestions: suggestions.length ? suggestions : segment.suggestions.slice(0, 4), grounded: false, mode: 'demo' };
}

function pickSuggestions(segment: Segment, asked: string): string[] {
  const a = norm(asked);
  return segment.suggestions.filter((s) => norm(s) !== a).slice(0, 4);
}

export const sourceLabel = (s: SourceKind | null) => s ?? '';
export { productOf };
