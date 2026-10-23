// Construcción de la pestaña Social Listening — COLOMBIA PRIMERO.
// Todas las cifras principales salen de geo.co (menciones cuyo país es Colombia). Otros mercados y
// "país no identificado" solo aparecen como contexto secundario y con nota explícita. Nada se traslada
// automáticamente al consumidor colombiano.

const NB = ' ';
const fmt = (n, d = 1) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: d });

export function resolver(ctx) {
  const get = (p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
  const render = (tpl) => String(tpl).replace(/\{\{([^}|]+)(\|(\w+))?\}\}/g, (_, p, __, f) => {
    const v = get(p.trim());
    if (v == null || Number.isNaN(v)) throw new Error(`Valor no disponible: ${p}`);
    if (f === 'pct') return fmt(v, 1) + NB + '%';
    if (f === 'int') return Math.round(v).toLocaleString('es-CO');
    return String(v);
  });
  const test = (gate = []) => gate.every(([p, op, val]) => { const v = get(p); return op === '>=' ? v >= val : op === '>' ? v > val : op === '<' ? v < val : v === val; });
  return { get, render, test };
}
const safe = (render, tpl) => { try { return render(tpl); } catch (e) { console.warn('  · bloque omitido:', e.message); return null; } };
const stat = (v) => (v ? { n: v.consumerN ?? v.n ?? 0, share: v.consumerShare ?? v.share ?? 0 } : { n: 0, share: 0 });

export function buildSocial({ product, m, editorial, quality }) {
  const ed = editorial[product];
  const R = editorial.rules;
  const val = quality?.validation?.final ?? {};
  const co = m.geo.co;
  const ctx = { ...co, otros: m.geo.otros, sinpais: m.geo.sin_pais, total: m.geo.total, validation: { ...val, mascotasAlimentacionPct: (val.mascotasAlimentacion?.pollo ?? 0) * 100 }, derived: {} };
  const { get, render, test } = resolver(ctx);
  for (const [k, [a, op, b]] of Object.entries(ed.derived ?? {})) {
    const A = get(a); const B = typeof b === 'number' ? b : get(b);
    const isPct = /share|pct/i.test(k);
    ctx.derived[k] = op === '/' ? (B ? (A / B) * (isPct ? 100 : 1) : 0) : A * B;
  }
  const baseOk = co.consumerN >= R.minBaseColombia;
  const used = new Set();
  const fresh = (arr, n) => { const out = []; for (const e of arr ?? []) { if (used.has(e.text)) continue; used.add(e.text); out.push(e); if (out.length === n) break; } return out; };
  const geoSplit = (ref) => ({ co: stat(get(ref)), otros: stat(get('otros.' + ref)), sinpais: stat(get('sinpais.' + ref)) });

  // 5 preguntas de calidad (sobre Colombia)
  const qualityCheck = (block, n, share) => {
    const answers = { supported: n >= R.minNColombia, scale: n >= 100 || share >= 3, different: true, new: block.quality?.new ?? true, decision: block.quality?.decision ?? true };
    if (block.compareOtros) answers.different = share >= stat(get('otros.' + block.metric)).share * 1.5;
    const fails = Object.values(answers).filter((x) => !x).length;
    return { answers, fails, publish: fails < 3 && answers.supported && test(block.gate) };
  };

  // 1. Qué está diciendo el consumidor (Colombia)
  const headline = baseOk && test(ed.headline.gate) ? { title: ed.headline.title, body: safe(render, ed.headline.body) } : null;

  // 2. Temáticas (Colombia), con el contexto de otros mercados al lado
  const topics = Object.values(co.topics).filter((t) => !(R.topicsExcluded ?? []).includes(t.id) && t.consumerN >= R.minNColombia && t.consumerShare >= 2).sort((a, b) => b.consumerN - a.consumerN).slice(0, 6)
    .map((t) => ({ id: t.id, name: t.name, n: t.consumerN, share: t.consumerShare, sentiment: t.sentimentConsumer, otrosShare: m.geo.otros.topics[t.id]?.consumerShare ?? null, excerpts: fresh(t.excerpts, 2) }));
  // Voces destacadas: una por temática, evitando textos muy parecidos entre sí (Jaccard de palabras)
  const words = (t) => new Set(t.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const opening = (t) => t.toLowerCase().split(/\s+/).slice(1, 6).join(' '); // mismas plantillas de un autor ("X en la mañana en Cali")
  const similar = (a, b) => { if (opening(a) === opening(b)) return true; const A = words(a), B = words(b); const i = [...A].filter((w) => B.has(w)).length; return i / Math.max(1, Math.min(A.size, B.size)) > 0.4; };
  const voices = [];
  for (const t of topics) for (const e of t.excerpts) { if (voices.length < 3 && !voices.some((v) => similar(v.text, e.text))) { voices.push(e); break; } }

  // 3. Tensiones, necesidades y motivadores (Colombia)
  const tensions = ed.tensions.map((b) => { const s = stat(get(b.metric)); return { id: b.id, kind: b.kind, title: b.title, ...s, body: safe(render, b.body), evidence: fresh(get(b.metric)?.excerpts, 3), check: qualityCheck(b, s.n, s.share) }; })
    .filter((b) => b.body && b.check.publish).slice(0, 5);

  // 4. Ocasiones de consumo (Colombia)
  const occAll = Object.values(co.occasions).sort((a, b) => b.n - a.n);
  const occasions = occAll.filter((o) => o.n >= R.minNOccasionColombia).map((o) => ({ id: o.id, name: o.name, n: o.n, share: o.share, otrosShare: m.geo.otros.occasions[o.id]?.share ?? null, excerpts: fresh(o.excerpts, 1) }));
  const occasionsWeak = occAll.filter((o) => o.n > 0 && o.n < R.minNOccasionColombia).map((o) => o.name);

  // 5. Usos inesperados (Colombia)
  const unexpectedUses = (ed.unexpectedUses ?? []).map((b) => { const g = geoSplit(b.metric); return { id: b.id, title: b.title, body: b.body, geo: g, colombia: g.co.n >= R.minNColombia }; })
    .filter((b) => b.colombia || b.geo.otros.n + b.geo.sinpais.n >= R.minNOtros);

  // Insights consolidados (Colombia)
  const insights = ed.insights.map((b) => { const s = stat(get(b.metric)); return { id: b.id, title: b.title, seeing: safe(render, b.seeing), why: b.why, ...s, evidence: fresh(get(b.metric)?.excerpts, 3), check: qualityCheck(b, s.n, s.share) }; })
    .filter((b) => b.seeing && b.check.publish).slice(0, 3);

  // 6. Señales emergentes (con geografía, precisión y confianza explícitas)
  const emergent = (ed.emergent ?? []).map((b) => {
    const g = geoSplit(b.metric); const precision = get(b.precision) ?? null;
    const total = g.co.n + g.otros.n + g.sinpais.n;
    const est = (n) => (precision ? Math.round(n * precision) : null);
    const purchase = b.purchaseMetric ? geoSplit(b.purchaseMetric) : null;
    const mostlyOutside = g.co.n < R.minNColombia && g.otros.n + g.sinpais.n >= R.minNOtros;
    const evidence = [...fresh(get(b.metric)?.excerpts, 1), ...fresh(get('otros.' + b.metric)?.excerpts, 2), ...fresh(get('sinpais.' + b.metric)?.excerpts, 1)];
    return {
      id: b.id, status: b.status, title: b.title, body: b.body, confidence: b.confidence, precision,
      detected: { co: g.co.n, otros: g.otros.n, sinpais: g.sinpais.n, total },
      estimated: { co: est(g.co.n), otros: est(g.otros.n), sinpais: est(g.sinpais.n), total: est(total) },
      share: { co: g.co.share, otros: g.otros.share, sinpais: g.sinpais.share, total: stat(get('total.' + b.metric)).share },
      shareEstimated: precision ? Math.round(stat(get('total.' + b.metric)).share * precision * 10) / 10 : null,
      purchase: purchase ? { co: purchase.co.n, otros: purchase.otros.n, sinpais: purchase.sinpais.n } : null,
      geoNote: mostlyOutside
        ? `Esta conversación aparece con fuerza fuera de Colombia (${g.otros.n.toLocaleString('es-CO')} menciones en otros países y ${g.sinpais.n.toLocaleString('es-CO')} sin país identificado), pero todavía tiene poca evidencia en Colombia (${g.co.n} menciones).`
        : null,
      evidence,
    };
  }).filter((b) => b.detected.total >= R.minNColombia);

  // Contexto de otros mercados (secundario)
  const outside = (ed.outside ?? []).map((b) => { const o = stat(get('otros.' + b.metricOtros)); const c = stat(get(b.metricCo)); return { id: b.id, title: b.title, body: safe(render, b.body), otros: o, co: c }; })
    .filter((b) => b.body && b.otros.n >= R.minNOtros && b.otros.share > b.co.share);

  // 7. Sentimiento: lectura exploratoria (no KPI)
  const brands = ed.brands.filter((b) => b.basedOn.every((ref) => stat(get(ref)).n >= R.minNColombia)).map((b) => ({ title: b.title, body: safe(render, b.body) })).filter((b) => b.body).slice(0, 3);
  const q = quality?.products?.[product];
  const strat = quality?.validation?.sentimentStratified?.[product];
  return {
    product, market: 'Colombia', baseOk,
    period: m.period,
    headline, voices,
    volume: { original: m.totals.original, relevant: m.totals.relevantes, doubtful: m.totals.dudosos, discarded: m.totals.noRelevantes, duplicates: m.totals.duplicados, co: co.consumerN, otros: m.geo.otros.consumerN, sinpais: m.geo.sin_pais.consumerN, coRelevant: co.relevantN },
    otherCountries: m.otherCountries,
    months: co.months,
    topics, tensions, occasions, occasionsWeak, unexpectedUses, insights, emergent, outside, brands,
    sentiment: { status: 'exploratorio', counts: co.sentiment, accuracy: val.sentimiento?.[product] ?? null, stratified: strat ?? null },
    accuracy: { relevance: val.relevancia?.[product], sentiment: val.sentimiento?.[product], topics: val.tematicas?.[product] },
    signals: Object.fromEntries(Object.entries(co.signals).map(([k, v]) => [k, { n: v.n, share: v.share }])),
    discardReasons: q ? Object.fromEntries(Object.entries(q.razonesDescarte).map(([k, v]) => [k, v.n])) : {},
    derived: ctx.derived,
  };
}

export function buildCross({ product, items, m, cross }) {
  const out = [];
  const co = m.geo.co;
  for (const c of cross.items.filter((x) => x.product === product)) {
    const ti = items.find((i) => i.short === c.tgi);
    if (!ti) { console.warn(`  · cruce ${c.id}: variable TGI "${c.tgi}" no encontrada`); continue; }
    const sv = c.social.split('.').reduce((o, k) => o?.[k], co);
    const n = sv?.consumerN ?? sv?.n ?? 0; const share = sv?.consumerShare ?? sv?.share ?? 0;
    if (ti.pen < cross.rules.minPen || n < cross.rules.minN || share < cross.rules.minShare) { console.warn(`  · cruce ${c.id} omitido (TGI ${ti.pen}% / social CO n=${n}, ${share}%)`); continue; }
    const { render } = resolver({ tgi: { pen: ti.pen, aff: ti.aff }, social: { share, n } });
    out.push({ id: c.id, title: c.title, market: 'Colombia', tgi: { label: ti.short, pen: Math.round(ti.pen * 10) / 10, aff: Math.round(ti.aff), says: render(c.tgiSays) }, social: { n, share, observes: render(c.socialObserves) }, reading: c.reading });
  }
  return out;
}
