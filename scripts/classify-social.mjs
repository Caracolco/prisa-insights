// Clasifica la caché local de Social Listening:
//   relevancia (RELEVANTE / NO_RELEVANTE / DUDOSO) -> duplicados -> voz -> sentimiento -> temáticas
// Salidas:
//   data/raw-cache/classified-<producto>.jsonl   (LOCAL, con textos, para auditoría; no se versiona)
//   data/raw-cache/audit/<producto>-sample.json   (muestras aleatorias para auditoría manual)
//   data/processed/social/<producto>.metrics.json (SOLO agregados + extractos anonimizados)
//   data/processed/social/data-quality.json
import * as fs from 'node:fs';
import path from 'node:path';
import { ROOT, SEGMENTS, writeJson } from './lib/config.mjs';
import { classifyRelevance, voiceOf, dedupeKey } from './lib/social-rules.mjs';
import { classifySentiment, topicsOf, TOPICS, POLITICAL } from './lib/social-semantics.mjs';
import { anonymize } from './lib/anonymize.mjs';
import { SIGNALS, OCCASIONS, UNSAFE_EXCERPT } from './lib/signals.mjs';

const CACHE = path.join(ROOT, 'data/raw-cache');
const SEED = Number(process.env.AUDIT_SEED ?? 11);
const OUT = path.join(ROOT, 'data/processed/social');
fs.mkdirSync(path.join(CACHE, 'audit'), { recursive: true });

const quality = { generatedAt: new Date().toISOString(), method: 'reglas contextuales auditadas (scripts/lib/social-rules.mjs, social-semantics.mjs, signals.mjs)', products: {} };

for (const seg of SEGMENTS.filter((s) => s.social)) {
  const product = seg.product;
  const src = path.join(CACHE, `social-${product}.jsonl`);
  if (!fs.existsSync(src)) { console.warn(`! Falta ${src}. Ejecuta npm run data:social:import`); continue; }
  const lines = fs.readFileSync(src, 'utf8').trim().split('\n');
  const out = fs.createWriteStream(path.join(CACHE, `classified-${product}.jsonl`), 'utf8');

  const q = { segment: seg.id, sourceFile: seg.social, totalOriginal: lines.length, relevantes: 0, noRelevantes: 0, dudosos: 0, duplicados: 0, duplicadosPorClase: {}, razonesDescarte: {}, razonesDuda: {} };
  const seen = new Map();
  const rel = [];
  for (const line of lines) {
    const rec = JSON.parse(line);
    const c = classifyRelevance(rec, product);
    // Duplicados / reposts idénticos (texto normalizado ≥ 20 caracteres)
    const key = dedupeKey(c.t);
    let dup = false;
    if (key.length >= 20) { if (seen.has(key)) dup = true; else seen.set(key, rec.id); }
    if (dup) {
      q.duplicados++; q.duplicadosPorClase[c.rel] = (q.duplicadosPorClase[c.rel] || 0) + 1;
      out.write(JSON.stringify({ id: rec.id, rel: c.rel, dup: true }) + '\n');
      continue;
    }
    if (c.rel === 'NO_RELEVANTE') { q.noRelevantes++; q.razonesDescarte[c.code] = (q.razonesDescarte[c.code] || { n: 0, ejemplo: c.reason }); q.razonesDescarte[c.code].n++; }
    if (c.rel === 'DUDOSO') { q.dudosos++; q.razonesDuda[c.code] = (q.razonesDuda[c.code] || { n: 0, ejemplo: c.reason }); q.razonesDuda[c.code].n++; }
    const row = { id: rec.id, rel: c.rel, code: c.code, reason: c.reason, t: c.t };
    if (c.rel === 'RELEVANTE') {
      q.relevantes++;
      const voice = voiceOf(rec);
      const s = classifySentiment(c.t, rec.text, voice);
      const topics = topicsOf(c.t, rec.text, product);
      Object.assign(row, { voice, ...s, topics, political: POLITICAL.test(c.t), author: rec.author, type: rec.type, platform: rec.platform, created: rec.created, country: rec.country || null, eng: rec.interactions + rec.comments + rec.shares, raw: rec.text, title: rec.title });
      rel.push(row);
    }
    out.write(JSON.stringify(row) + '\n');
  }
  await new Promise((r) => out.end(r));

  // ------------------------------------------------------------- métricas agregadas POR GEOGRAFÍA
  // Colombia es el mercado principal. Solo se usa el país que trae la mención: sin país = "no identificado"
  // (nunca se asume Colombia). Otros mercados = contexto secundario.
  // Tope por autor identificado: evita que una cuenta prolífica domine una temática u ocasión.
  // Las menciones sin autor (p. ej. comentarios de Facebook) no se pueden agrupar y se conservan.
  const AUTHOR_CAP = 3;
  const perAuthor = {}; let capped = 0;
  const relCapped = [...rel].sort((a, b) => String(a.created).localeCompare(String(b.created))).filter((r) => {
    if (!r.author) return true;
    perAuthor[r.author] = (perAuthor[r.author] || 0) + 1;
    if (perAuthor[r.author] > AUTHOR_CAP) { capped++; return false; }
    return true;
  });
  q.topeAutor = { maxPorAutor: AUTHOR_CAP, mencionesExcluidas: capped };
  const geoOf = (r) => (!r.country ? 'sin_pais' : String(r.country).toLowerCase() === 'co' ? 'co' : 'otros');
  const blocks = { co: [], otros: [], sin_pais: [] };
  for (const r of relCapped) blocks[geoOf(r)].push(r);
  const geo = {
    co: computeBlock(product, blocks.co),
    otros: computeBlock(product, blocks.otros),
    sin_pais: computeBlock(product, blocks.sin_pais),
    total: computeBlock(product, relCapped),
  };
  geo.co.toneCandidates = toneCandidates(blocks.co);
  const consumer = rel.filter((r) => r.voice === 'consumidor');
  const metrics = {
    product, segment: seg.id, generatedAt: quality.generatedAt,
    period: { from: minOf(rel.map((r) => r.created)), to: maxOf(rel.map((r) => r.created)) },
    totals: { original: q.totalOriginal, relevantes: q.relevantes, dudosos: q.dudosos, noRelevantes: q.noRelevantes, duplicados: q.duplicados },
    otherCountries: Object.fromEntries(Object.entries(by(blocks.otros, (r) => String(r.country).toUpperCase())).sort((a, b) => b[1] - a[1]).slice(0, 6)),
    geo,
  };
  writeJson(path.join(OUT, `${product}.metrics.json`), metrics);
  q.porGeografia = Object.fromEntries(Object.entries(geo).map(([k, v]) => [k, { relevantes: v.relevantN, vozConsumidor: v.consumerN }]));
  quality.products[product] = q;

  // ------------------------------------------------------------- muestras de auditoría (LOCAL)
  const all = fs.readFileSync(path.join(CACHE, `classified-${product}.jsonl`), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => !r.dup);
  const sample = {
    relevantes: rand(all.filter((r) => r.rel === 'RELEVANTE'), 50, SEED),
    noRelevantes: rand(all.filter((r) => r.rel === 'NO_RELEVANTE' && r.code !== 'vacio'), 30, SEED + 1),
    sentimiento: rand(consumer, 30, SEED + 2),
    tematicas: rand(rel.filter((r) => r.topics.length), 30, SEED + 3),
  };
  const slim = (r) => ({ id: r.id, rel: r.rel, reason: r.reason, sentiment: r.sentiment, confidence: r.confidence, sreason: r.reason, topics: r.topics, voice: r.voice, t: (r.t || '').slice(0, 400) });
  writeJson(path.join(CACHE, 'audit', `${product}-sample.json`), Object.fromEntries(Object.entries(sample).map(([k, v]) => [k, v.map(slim)])));
  // Muestra ESTRATIFICADA de sentimiento (voz del consumidor): misma cantidad por clase cuando existe
  const strat = [];
  for (const [i, s] of ['POSITIVO', 'NEGATIVO', 'NEUTRO', 'MIXTO'].entries()) strat.push(...rand(consumer.filter((r) => r.sentiment === s), Math.ceil(50 / 4), SEED + 20 + i));
  writeJson(path.join(CACHE, 'audit', `${product}-sentiment-strat.json`), strat.slice(0, 52).map((r) => ({ ...slim(r), geo: geoOf(r) })));
  console.log(`✓ ${product}: ${q.totalOriginal} originales · ${q.relevantes} relevantes · ${q.dudosos} dudosos · ${q.noRelevantes} no relevantes · ${q.duplicados} duplicados`);
  console.log('  voz del consumidor por geografía', JSON.stringify(q.porGeografia));
}
const auditPath = path.join(ROOT, 'data/editorial/audit-log.json');
if (fs.existsSync(auditPath)) quality.validation = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
writeJson(path.join(OUT, 'data-quality.json'), quality);

// ------------------------------------------------------------------ helpers
function pct(a, b) { return b ? Math.round((a / b) * 1000) / 10 : 0; }
function minOf(a) { return a.filter(Boolean).sort()[0] ?? null; }
function maxOf(a) { return a.filter(Boolean).sort().at(-1) ?? null; }
function rand(arr, n, seed) {
  let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const copy = [...arr]; const outA = [];
  while (outA.length < n && copy.length) outA.push(copy.splice(Math.floor(r() * copy.length), 1)[0]);
  return outA;
}
// Ordena por cuánta evidencia de la temática trae el texto (no por popularidad): evita chistes virales
function rankByMatch(rows, re) {
  return rows.map((r) => ({ r, k: (r.t.match(re) || []).length })).filter((x) => x.k > 0)
    .sort((a, b) => b.k - a.k || Math.abs(a.r.t.length - 160) - Math.abs(b.r.t.length - 160)).map((x) => x.r);
}
function pickExcerpts(rows, n, keepOrder = false) {
  // Extractos de voz de consumidor: claros, de longitud media, priorizando interacción; anonimizados
  return rows
    .filter((r) => r.raw && r.raw.length >= 40 && r.raw.length <= 420 && r.confidence >= 0.55 && !UNSAFE_EXCERPT.test(r.t) && !/jaja|😂|🤣/.test(r.t + r.raw))
    .sort((a, b) => (keepOrder ? 0 : b.eng - a.eng || a.raw.length - b.raw.length))
    .slice(0, n * 3)
    .map((r) => ({ text: anonymize(r.raw), sentiment: r.sentiment, platform: r.platform, month: (r.created || '').slice(0, 7) }))
    .filter((e) => e.text.length >= 30)
    .slice(0, n);
}

// Pool de ejemplos por tono (solo Colombia): voz de consumidor con su sentimiento registrado, texto completo
// (sin recorte), anonimizado, sin contenido político ni inseguro. Solo contexto cualitativo: no altera conteos.
function toneCandidates(rows, n = 40) {
  return Object.fromEntries(['POSITIVO', 'NEUTRO', 'NEGATIVO', 'MIXTO'].map((s) => [s, rows
    .filter((r) => r.voice === 'consumidor' && r.sentiment === s && !r.political && r.raw && r.raw.length >= 40 && r.raw.length <= 220 && r.confidence >= 0.55 && !UNSAFE_EXCERPT.test(r.t) && !/jaja|😂|🤣/.test(r.t + r.raw))
    .sort((a, b) => a.raw.length - b.raw.length || String(a.created).localeCompare(String(b.created)))
    .slice(0, n)
    .map((r) => ({ text: anonymize(r.raw), sentiment: r.sentiment, platform: r.platform, month: (r.created || '').slice(0, 7) }))]));
}

// Bloque de métricas para un conjunto de menciones relevantes (una geografía)
function computeBlock(product, rel) {
  const consumer = rel.filter((r) => r.voice === 'consumidor');
  const topics = {};
  for (const tp of TOPICS.filter((t) => t.products.includes(product))) {
    const cons = consumer.filter((r) => r.topics.includes(tp.id));
    topics[tp.id] = {
      id: tp.id, name: tp.name,
      consumerN: cons.length, consumerShare: pct(cons.length, consumer.length),
      sentimentConsumer: by(cons, (r) => r.sentiment),
      political: cons.filter((r) => r.political).length,
      excerpts: pickExcerpts(rankByMatch(cons, new RegExp(tp.re, 'gi')), 6, true),
    };
  }
  const occasions = {};
  for (const oc of OCCASIONS.filter((o) => o.products.includes(product))) {
    const rows = consumer.filter((r) => oc.test(r.t, product));
    occasions[oc.id] = { id: oc.id, name: oc.name, n: rows.length, share: pct(rows.length, consumer.length), excerpts: pickExcerpts(rows, 4) };
  }
  return {
    relevantN: rel.length, consumerN: consumer.length,
    voices: by(rel, (r) => r.voice),
    platforms: by(consumer, (r) => r.platform),
    months: by(consumer, (r) => (r.created || '').slice(0, 7)),
    sentiment: by(consumer, (r) => r.sentiment),
    acts: by(consumer, (r) => r.act),
    topics, occasions,
    signals: computeSignals(product, consumer),
  };
}

// Señales específicas para insights (todas medidas, nunca supuestas) — ver scripts/lib/signals.mjs
function computeSignals(product, consumer) {
  const N = consumer.length;
  const sig = {};
  for (const def of SIGNALS.filter((d) => d.products.includes(product))) {
    const rows = def.topic ? consumer.filter((r) => r.topics.includes(def.topic) && (!def.political || r.political)) : consumer.filter((r) => def.test(r.t, product));
    sig[def.id] = { n: rows.length, share: pct(rows.length, N), sentiment: by(rows, (r) => r.sentiment), excerpts: pickExcerpts(rows, 6) };
  }
  return sig;
}
function by(arr, f) { return arr.reduce((o, x) => { const k = f(x); o[k] = (o[k] || 0) + 1; return o; }, {}); }
