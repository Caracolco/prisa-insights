// Construye los datos que consume la web y el contexto del chat a partir de:
//   data/processed/tgi/<segmento>.json         (npm run data:tgi)
//   data/processed/social/<producto>.metrics.json + data-quality.json (npm run data:social)
//   data/editorial/*.json                      (redacción; los números se resuelven aquí)
// Salidas:
//   public/data/segments.json                  índice de segmentos
//   public/data/segments/<id>.json             datos por página para el frontend
//   data/processed/context/<id>.audience-context.json   contexto compacto para /api/ask
//   public/data/data-quality.json              calidad de Social Listening (solo agregados)
import * as fs from 'node:fs';
import path from 'node:path';
import { ROOT, SEGMENTS, PRISA_BRANDS, writeJson } from './lib/config.mjs';
import { buildSocial, buildCross } from './lib/social-builder.mjs';

const TGI = path.join(ROOT, 'data/processed/tgi');
const SOCIAL = path.join(ROOT, 'data/processed/social');
const PUB = path.join(ROOT, 'public/data');
const CTX = path.join(ROOT, 'data/processed/context');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const exists = (f) => fs.existsSync(f);

const socialEditorial = readJson(path.join(ROOT, 'data/editorial/social-insights.json'));
const crossEditorial = readJson(path.join(ROOT, 'data/editorial/cross-insights.json'));
const quality = exists(path.join(SOCIAL, 'data-quality.json')) ? readJson(path.join(SOCIAL, 'data-quality.json')) : null;
const metricsByProduct = {};
for (const s of SEGMENTS.filter((x) => x.product)) {
  const f = path.join(SOCIAL, `${s.product}.metrics.json`);
  if (exists(f)) metricsByProduct[s.product] = readJson(f);
}

const r1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
const pick = (i) => ({ label: i.short ?? clean(i.label), pen: r1(i.pen), aff: i.aff == null ? null : Math.round(i.aff), ...(i.group ? { group: i.group } : {}) });
const clean = (s) => String(s).replace(/^Entrevistado:\s*/, '').replace(/^(Totalmente de acuerdo|Accedió-U7d|Espera vivir-P12m|Elijo, me gusta y escucho siempre\/ regularmente|HOSPEDA|TOTAL|GUSTA HACER):\s*/i, '').replace(/\s*\(completa-incompleta\)/i, '').replace(/\s*\(ENTR\)\/ 15-17 \(JF\)/, '').trim();
const score = (i) => (i.aff - 100) * Math.sqrt(i.pen);

function main() {
const index = [];
const workerData = { segments: {}, contexts: {} };
for (const seg of SEGMENTS) {
  const f = path.join(TGI, `${seg.id}.json`);
  if (!exists(f)) { console.warn(`! Falta ${f}`); continue; }
  const tgi = readJson(f);
  const items = tgi.items;
  const by = (pred) => items.filter(pred);
  const path2 = (i) => (i.sub ? `${i.cat}: ${i.sub}` : i.cat);
  const sub = (prefix) => by((i) => path2(i).startsWith(prefix));
  const one = (prefix, re) => items.find((i) => path2(i).startsWith(prefix) && re.test(i.label));

  // ------------------------------------------------------------------ PERFIL
  const gender = sub('DATOS BÁSICOS: GÉNERO').map(pick);
  const age = sub('DATOS BÁSICOS: RANGO DE EDAD').map((i) => ({ ...pick(i), label: clean(i.label).replace('12-17', '12–17').replace(/(\d+)-(\d+)/, '$1–$2') }));
  const marital = sub('DATOS BÁSICOS: ESTADO CIVIL').filter((i) => !/^(Separado\/a|Divorciado\/a)$/.test(i.label)).map(pick);
  const nse = sub('INFORMACIÓN GEOGRÁFICA Y NSE: ESTRATO').map((i) => ({ ...pick(i), label: `Estrato ${i.label.replace(', ', ' y ')}` }));
  const region = sub('INFORMACIÓN GEOGRÁFICA Y NSE: REGIONES').map(pick);
  const education = sub('EDUCACIÓN').filter((i) => /\(completa-incompleta\)|Sin estudios/i.test(i.label)).map((i) => ({ ...pick(i), label: clean(i.label).replace('Técnico Superior/ universitaria corta duración', 'Técnico o tecnológico').replace('Universitario 4 años o más', 'Universitario').replace('Maestría/ doctorado/ posgrado/ MBA', 'Posgrado').replace('Sin estudios formales', 'Sin estudios') }));
  const emp = Object.fromEntries(sub('EMPLEO').map((i) => [clean(i.label), pick(i)]));
  const household = {
    head: pickOr(one('DATOS BÁSICOS: POSICIÓN EN EL HOGAR', /Jefe/)),
    buyer: pickOr(one('DATOS BÁSICOS: COMPRADOR DEL HOGAR', /Entrevistado/)),
    caretaker: pickOr(one('DATOS BÁSICOS: RESPONSABLE', /Sí/)),
  };
  const housing = sub('ESTRUCTURA Y CARACTERÍSTICAS').map((i) => ({ ...pick(i), label: clean(i.label).replace('Arrendada/ alquilada/ rentada', 'Arrendada') }));
  const plans = selectPlans(sub('EVENTOS EN LA VIDA'));
  const profile = { gender, age, marital, nse, region, education, employment: emp, household, housing, plans };
  profile.narrative = profileNarrative(profile, tgi);

  // ------------------------------------------------------- ACTIVIDADES Y OPINIONES
  const activities = {
    leisure: topList(sub('ACTIVIDADES RECREATIVAS'), 10),
    sports: topList(sub('DEPORTES PRACTICADOS'), 8),
    vacations: topList(sub('VACACIONES').filter((i) => !/Otros tipos/.test(i.label)), 6),
    lodging: topList(sub('HOTELES'), 5),
    games: topList(sub('JUEGOS-OFFLINE + ONLINE: TIPOS'), 6),
  };
  const opinionItems = by((i) => i.sec === 'opinions' && i.el.includes('Totalmente de acuerdo') && i.short);
  const opinions = { all: opinionItems.map((i) => ({ ...pick(i), category: i.dcat })), distinctive: selectOpinions(opinionItems), shared: opinionItems.filter((i) => i.aff >= 95).sort((a, b) => b.pen - a.pen).filter(uniqueGroup()).slice(0, 6).map(pick) };

  // ------------------------------------------------------------------ RADIO
  const daypartItems = sub('HÁBITOS DE ESCUCHAR RADIO: PERIODOS');
  const dayparts = ['Lunes a Viernes', 'Sábados', 'Domingos'].map((d) => ({
    day: d === 'Lunes a Viernes' ? 'L–V' : d === 'Sábados' ? 'Sábado' : 'Domingo',
    slots: ['06:00-11:59', '12:00-14:59', '15:00-19:59', '20:00-23:59', '00:00-05:59'].map((h) => {
      const i = daypartItems.find((x) => x.label === `${d}: ${h}`);
      return { slot: h.replace(/:00|:59/g, '').replace('-', '–'), pen: r1(i?.pen), aff: i ? Math.round(i.aff) : null };
    }),
  }));
  const cells = dayparts.flatMap((d) => d.slots.map((s) => ({ ...s, day: d.day })));
  const maxPen = Math.max(...cells.map((c) => c.pen ?? 0));
  const best = cells.filter((c) => c.pen >= 0.6 * maxPen).sort((a, b) => b.aff - a.aff)[0];
  const stations = by((i) => i.cat === 'EMISORAS').map((i) => ({ ...pick(i), label: titleCase(i.label), prisa: PRISA_BRANDS.some((b) => i.label === b.tgi || i.label.startsWith(b.tgi)) })).sort((a, b) => b.pen - a.pen);
  const radio = {
    reach: pickOr(one('Consumo total radio', /./)),
    total30d: pickOr(one('CONSUMO DE RADIO: CONSUMO TOTAL-RADIO (OFFLINE + ONLINE)', /./)),
    amfm: pickOr(one('CONSUMO DE RADIO: CONSUMO TOTAL-AM/FM', /./)),
    online: pickOr(one('CONSUMO DE RADIO: CONSUMO TOTAL-RADIO (ONLINE)', /./)),
    dayparts, best,
    stations: stations.slice(0, 12),
    programs: topList(sub('PREFERENCIAS DE PROGRAMACIÓN RADIO'), 8, { minPen: 5, by: 'aff' }),
    genres: topList(sub('PREFERENCIAS GÉNEROS DE MÚSICA'), 8),
    places: topList(sub('HÁBITOS DE ESCUCHAR RADIO: LUGARES'), 5),
    devices: topList(sub('HÁBITOS DE ESCUCHAR RADIO: APARATOS'), 5),
    frequency: sub('HÁBITOS DE ESCUCHAR RADIO: FRECUENCIA').map(pick),
    reasons: topList(sub('ACTITUDES FRENTE A LA PUBLICIDAD'), 5),
  };

  // ------------------------------------------------------------ MARCAS PRISA
  const prisaBrands = PRISA_BRANDS.map((b) => {
    const i = items.find((x) => x.cat === 'EMISORAS' && (x.label === b.tgi || x.label.startsWith(b.tgi)));
    return i ? { id: b.id, name: b.name, pen: r1(i.pen), aff: Math.round(i.aff), s000: i.s000 } : null;
  }).filter(Boolean).sort((a, b) => b.aff - a.aff);
  const prisa = { brands: prisaBrands, total: pickOr(one('ALCANCE TOTAL PRISA MEDIA', /./)), bestAffinity: prisaBrands[0], bestReach: [...prisaBrands].sort((a, b) => b.pen - a.pen)[0] };

  // ------------------------------------------------------------------ DIGITAL
  const digital = {
    social: topList(sub('REDES SOCIALES').filter((i) => !/Otro sitio/.test(i.label)), 10),
    apps: topList(sub('APLICACIONES PARA SMARTPHONES Y TABLETS'), 10),
    internetPeriods: sub('HÁBITOS DE INTERNET: PERÍODOS').filter((i) => !/CUALQUIER/.test(i.label)).map((i) => ({ ...pick(i), label: i.label.replace(/:00|:59/g, '').replace('-', '–') })),
    internetFrequency: sub('HÁBITOS DE INTERNET: FRECUENCIA').map(pick),
    activities: topList(sub('ACTIVIDADES DE INTERNET'), 10),
  };
  // TGI mide streaming de video de dos formas: suscripción paga y "visto ayer"
  const stripPrefix = (re) => (m) => ({ ...m, label: m.label.replace(re, '') });
  const video = {
    platforms: topList(sub('SERVICIOS DE VIDEO STREAMING').filter((i) => /^Suscripción paga/.test(i.label)), 10).map(stripPrefix(/^Suscripción paga:\s*/)),
    watchedYesterday: topList(sub('SERVICIOS DE VIDEO STREAMING').filter((i) => /^Visto-Ayer/.test(i.label)), 10).map(stripPrefix(/^Visto-Ayer:\s*/)),
    types: topList(sub('VIDEOS ONLINE'), 10),
  };
  const audio = { music: topList(sub('STREAMING DE MÚSICA'), 6), podcast: { listens: pickOr(one('PODCAST: ACOSTUMBRA', /Sí/)), topics: topList(sub('PODCAST: TEMAS'), 8) } };
  const contentThemes = [...sub('PODCAST: TEMAS'), ...sub('VIDEOS ONLINE'), ...sub('PREFERENCIAS DE PROGRAMACIÓN RADIO')]
    .filter((i) => i.pen >= 5 && i.aff >= 100).sort((a, b) => score(b) - score(a)).slice(0, 8)
    .map((i) => ({ ...pick(i), source: i.cat.startsWith('PODCAST') ? 'Podcast' : i.cat.startsWith('VIDEOS') ? 'Video online' : 'Radio' }));

  // ---------------------------------------------------------- SOCIAL + CRUCES
  const m = seg.product ? metricsByProduct[seg.product] : null;
  const social = m ? buildSocial({ product: seg.product, m, editorial: socialEditorial, quality }) : null;
  const cross = social ? buildCross({ product: seg.product, items, m, cross: crossEditorial }) : [];

  const out = {
    id: seg.id, name: seg.name, product: seg.product ?? null,
    survey: tgi.survey, definition: seg.definitionLabel ?? tgi.definition, definitionTgi: tgi.definition, sourceFile: tgi.sourceFile,
    size000: Math.round(tgi.segment000), universe000: Math.round(tgi.universe000), share: r1((tgi.segment000 / tgi.universe000) * 100),
    profile, activities, opinions, radio, prisa, digital, video, audio, contentThemes, social, cross,
    suggestions: buildSuggestions(seg, { opinions, plans, prisa, radio, social }),
  };
  writeJson(path.join(PUB, 'segments', `${seg.id}.json`), out, false);
  const actx = audienceContext(out);
  writeJson(path.join(CTX, `${seg.id}.audience-context.json`), actx);
  workerData.segments[seg.id] = out; workerData.contexts[seg.id] = actx;
  index.push({ id: seg.id, name: seg.name, variables: tgi.items.length, size000: out.size000, share: out.share, hasSocial: Boolean(social), product: seg.product ?? null });
  console.log(`✓ ${seg.id}: perfil, radio, PRISA, digital${social ? `, social CO n=${social.volume.co} (${social.insights.length} insights, ${social.tensions.length} tensiones/motivadores, ${social.occasions.length} ocasiones, ${social.emergent.length} emergentes, ${social.outside.length} contexto otros, ${cross.length} cruces)` : ''}`);
}
const products = Object.values(quality?.products ?? {});
const stats = { variables: Math.max(...index.map((x) => x.variables)), mentions: products.reduce((a, p) => a + p.totalOriginal, 0), relevant: products.reduce((a, p) => a + p.relevantes, 0) };
writeJson(path.join(PUB, 'segments.json'), { generatedAt: new Date().toISOString(), stats, segments: index });
if (quality) writeJson(path.join(PUB, 'data-quality.json'), quality);
// Paquete para el Worker (/api/ask): mismos datos agregados que la web, sin textos originales
writeJson(path.join(ROOT, 'worker/generated/data.json'), workerData, false);
}

// =================================================================== helpers
function pickOr(i) { return i ? pick(i) : null; }
function titleCase(s) { return s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()).replace('Los40', 'Los40').replace(/^La Fm$/, 'La FM').replace(/^Blu$/, 'Blu'); }
function topList(arr, n, { minPen = 3, by = 'pen' } = {}) {
  return arr.filter((i) => i.pen >= minPen).sort((a, b) => (by === 'aff' ? b.aff - a.aff : b.pen - a.pen)).slice(0, n).map(pick);
}
function uniqueGroup() { const seen = new Set(); return (i) => { const g = i.group ?? i.el; if (seen.has(g)) return false; seen.add(g); return true; }; }
function selectOpinions(arr) {
  // Regla del modelo Power BI: afinidad > 100 y pen ≥ 5 % (prioridad pen ≥ 8 %);
  // score = (afinidad − 100) × √pen × peso; máx 1 por grupo y 2 por categoría; máx 8.
  const cand = arr.filter((i) => i.aff > 100 && i.pen >= 5).map((i) => ({ i, s: (i.aff - 100) * Math.sqrt(i.pen) * (i.weight ?? 1) * (i.pen >= 8 ? 1.25 : 1) }));
  cand.sort((a, b) => b.s - a.s);
  const groups = new Set(); const cats = {}; const out = [];
  for (const { i } of cand) {
    if (groups.has(i.group)) continue;
    if ((cats[i.dcat] || 0) >= 2) continue;
    groups.add(i.group); cats[i.dcat] = (cats[i.dcat] || 0) + 1;
    out.push({ ...pick(i), category: i.dcat });
    if (out.length === 8) break;
  }
  return out;
}
function selectPlans(arr) {
  // Máx 5 eventos P12m: pen ≥ 3 % (prioridad afinidad ≥ 100 y pen ≥ 5 %); score = afinidad × √pen; máx 1 por grupo.
  const cand = arr.filter((i) => i.short && i.pen >= 3).map((i) => ({ i, s: i.aff * Math.sqrt(i.pen) * (i.aff >= 100 && i.pen >= 5 ? 1.3 : 1) })).sort((a, b) => b.s - a.s);
  const groups = new Set(); const out = [];
  for (const { i } of cand) { if (groups.has(i.group)) continue; groups.add(i.group); out.push(pick(i)); if (out.length === 5) break; }
  return out;
}

const PLAN_TERRITORY = {
  VIVIENDA: 'vivienda, crédito y hogar', REFORMA: 'mejoras y equipamiento del hogar', NEGOCIO: 'emprendimiento y finanzas',
  VIAJE: 'viajes y turismo', AUTO: 'movilidad y vehículo', HIJOS_EDU: 'educación de los hijos', HIJOS_CASA: 'nueva etapa del hogar',
  HIJOS_BODA: 'celebraciones familiares', HIJO_NAC: 'maternidad y paternidad', JUBIL: 'retiro y finanzas personales',
  POSGRADO: 'formación y carrera', EST_BASICA: 'educación', TRABAJO: 'empleo y formación', PAREJA: 'vida en pareja y celebraciones',
  NIETO: 'familia extendida', INDEP: 'independencia y primer hogar',
};

function profileNarrative(p, tgi) {
  const fem = p.gender.find((g) => /Femenino/.test(g.label));
  const masc = p.gender.find((g) => /Masculino/.test(g.label));
  const genderLead = fem.pen >= 55 ? `Mayoría femenina (${fmt(fem.pen)} %)` : masc.pen >= 55 ? `Mayoría masculina (${fmt(masc.pen)} %)` : `Equilibrio de género (${fmt(fem.pen)} % mujeres)`;
  // Rango de edad: bandas contiguas con mayor afinidad que juntas reúnen ≥ 40 % del segmento
  const ages = p.age;
  let bestRange = null;
  for (let a = 0; a < ages.length; a++) for (let b = a; b < ages.length; b++) {
    const slice = ages.slice(a, b + 1); const pen = slice.reduce((s, x) => s + x.pen, 0);
    if (pen < 40) continue;
    const affW = slice.reduce((s, x) => s + x.aff * x.pen, 0) / pen;
    const cand = { from: slice[0].label.split('–')[0], to: slice.at(-1).label.split('–').at(-1).replace('+', ''), pen, aff: affW, plus: slice.at(-1).label.includes('+'), width: b - a };
    if (!bestRange || cand.aff - cand.width * 2 > bestRange.aff - bestRange.width * 2) bestRange = cand;
  }
  const ageText = bestRange.plus ? `de ${bestRange.from} años o más` : `de ${bestRange.from} a ${bestRange.to} años`;
  const topRegion = [...p.region].sort((a, b) => b.aff - a.aff)[0];
  const topNse = [...p.nse].sort((a, b) => b.aff - a.aff)[0];
  const head = p.household.head; const buyer = p.household.buyer;
  const plan = p.plans[0];
  const facts = [];
  facts.push({ k: 'gender', text: genderLead });
  facts.push({ k: 'age', text: `${fmt(bestRange.pen)} % tiene ${ageText.replace(/^de /, '')} (índice ${Math.round(bestRange.aff)})` });
  if (topRegion.aff >= 108) facts.push({ k: 'region', text: `Sobre-representado en ${topRegion.label} (índice ${topRegion.aff})` });
  if (topNse.aff >= 105) facts.push({ k: 'nse', text: `${topNse.label}: ${fmt(topNse.pen)} % (índice ${topNse.aff})` });
  if (head) facts.push({ k: 'head', text: `${fmt(head.pen)} % es jefe de hogar` });
  const headline = `${genderLead.replace(/ \(.*\)/, '')} ${ageText}${topRegion.aff >= 108 ? `, con más peso en ${topRegion.label}` : ''}.`;
  const sizeM = tgi.segment000 / 1000;
  const sub = `${fmt(sizeM, 1)} millones de personas: ${fmt((tgi.segment000 / tgi.universe000) * 100)} % de la población que mide TGI.`;
  const soWhat = [];
  if (buyer && buyer.pen >= 50) soWhat.push(`Habla con quien decide: ${fmt(buyer.pen)} % hace las compras del hogar${head ? ` y ${fmt(head.pen)} % es jefe de familia` : ''}.`);
  else if (head && head.pen >= 50) soWhat.push(`${fmt(head.pen)} % es jefe de familia: los mensajes de hogar llegan a quien decide.`);
  if (plan) soWhat.push(`Su próximo año tiene agenda: “${plan.label}” (${fmt(plan.pen)} %, índice ${plan.aff}) abre conversación sobre ${PLAN_TERRITORY[plan.group] ?? 'nuevas decisiones'}.`);
  if (bestRange.aff >= 108) soWhat.push(`Ajusta códigos y referentes a personas ${ageText}: es donde el segmento se concentra más que la población.`);
  return { headline, sub, facts, soWhat };
}
function fmt(n, d = 1) { return n == null ? '–' : Number(n).toLocaleString('es-CO', { minimumFractionDigits: d === 0 ? 0 : 0, maximumFractionDigits: d }); }

// ----------------------------------------------------------------- chat
function buildSuggestions(seg, { opinions, plans, prisa, radio, social }) {
  const q = ['¿Qué emisoras escuchas más?', '¿A qué hora debería hablarte por radio?', '¿Qué marca PRISA te es más afín?', '¿Qué planeas para los próximos 12 meses?', '¿Qué redes sociales usas?', '¿Qué contenidos te interesan?'];
  if (opinions.distinctive[0]) q.push(`¿Qué piensas sobre ${opinionTopic(opinions.distinctive[0].category)}?`);
  if (social) q.splice(2, 0, `¿Qué dicen las redes sobre el ${social.product}?`, `¿Qué te preocupa al comprar ${social.product}?`);
  return q;
}
function opinionTopic(cat) {
  const map = { 'ESTILO DE VIDA': 'tu estilo de vida', COMPRAS: 'las compras', COMIDA: 'la alimentación', FINANZAS: 'el dinero', TECNOLOGÍA: 'la tecnología', VIAJES: 'los viajes', SALUD: 'la salud', DEPORTE: 'el ejercicio', OCIO: 'el ocio', CELEBRACIONES: 'las celebraciones', HOGAR: 'el hogar', 'CUIDADO PERSONAL': 'el cuidado personal', AUTOMÓVILES: 'los carros', BEBIDAS: 'las bebidas' };
  return map[cat] ?? 'tu día a día';
}
function audienceContext(o) {
  // Contexto COMPACTO para el LLM: solo lo necesario para responder con evidencia.
  const L = (arr, n = 6) => (arr ?? []).slice(0, n).map((x) => `${x.label}: ${x.pen}%${x.aff != null ? ` (índice ${x.aff})` : ''}`);
  return {
    segment: o.name, size: `${(o.size000 / 1000).toFixed(1)} M personas (${o.share}% de la población TGI)`, source: o.survey,
    profile: { headline: o.profile.narrative.headline, gender: L(o.profile.gender), age: L(o.profile.age, 7), nse: L(o.profile.nse), region: L(o.profile.region, 7), education: L(o.profile.education), household: [o.profile.household.head, o.profile.household.buyer].filter(Boolean).map((x) => `${x.label}: ${x.pen}%`) },
    activities: L(o.activities.leisure, 8), sports: L(o.activities.sports, 5), vacations: L(o.activities.vacations, 4),
    opinions: o.opinions.distinctive.map((x) => `${x.label}: ${x.pen}% (índice ${x.aff})`), sharedOpinions: L(o.opinions.shared, 5),
    futurePlans: L(o.profile.plans, 5),
    radio: { reach: o.radio.reach && `${o.radio.reach.pen}% escucha radio (índice ${o.radio.reach.aff})`, best: o.radio.best && `Mejor franja: ${o.radio.best.day} ${o.radio.best.slot} (${o.radio.best.pen}%, índice ${o.radio.best.aff})`, stations: L(o.radio.stations, 8), programs: L(o.radio.programs, 6), places: L(o.radio.places, 4) },
    prisaBrands: o.prisa.brands.map((b) => `${b.name}: ${b.pen}% (índice ${b.aff})`),
    digital: { social: L(o.digital.social, 8), apps: L(o.digital.apps, 6), internetPeriods: L(o.digital.internetPeriods, 5) },
    video: L(o.video.platforms, 6), podcast: { listens: o.audio.podcast.listens && `${o.audio.podcast.listens.pen}%`, topics: L(o.audio.podcast.topics, 6) },
    contentThemes: o.contentThemes.map((x) => `${x.label} (${x.source}): ${x.pen}% (índice ${x.aff})`),
    socialListening: o.social ? {
      market: 'Colombia (solo menciones con país Colombia; otros mercados = contexto)',
      headline: o.social.headline?.title, period: o.social.period, colombiaMentions: o.social.volume.co,
      topics: o.social.topics.map((t) => `${t.name}: ${t.share}% (${t.n} menciones en Colombia)`),
      tensions: o.social.tensions.map((t) => `${t.kind} — ${t.title}: ${t.body}`),
      occasions: o.social.occasions.map((x) => `${x.name}: ${x.n} menciones en Colombia`),
      insights: o.social.insights.map((u) => `${u.title} ${u.seeing}`),
      emergentSignals: o.social.emergent.map((e) => `[${e.status}] ${e.title} Detectadas: Colombia ${e.detected.co}, otros países ${e.detected.otros}, sin país ${e.detected.sinpais}. ${e.geoNote ?? ''}`),
      otherMarketsContext: o.social.outside.map((x) => `${x.title} ${x.body}`),
      sentiment: 'lectura exploratoria (precisión auditada por debajo del 80 %): no usar como KPI',
      excerpts: o.social.voices.map((e) => `“${e.text}”`),
    } : null,
    crossSourceInsights: o.cross.map((c) => `${c.title} TGI DICE: ${c.tgi.says} SOCIAL OBSERVA (Colombia): ${c.social.observes} LECTURA: ${c.reading}`),
  };
}

main();
