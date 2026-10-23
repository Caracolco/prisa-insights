// Social Listening XLSX (export Brand24, hoja "Mentions") -> caché LOCAL data/raw-cache/social-<producto>.jsonl
// La caché queda fuera del repositorio (.gitignore). No se guardan nombres de autor: solo un hash
// para detectar reposts/duplicados. Los enlaces se conservan únicamente en la caché local.
import ExcelJS from 'exceljs';
import * as fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, SOURCES, SEGMENTS, writeJson } from './lib/config.mjs';

const CACHE = path.join(ROOT, 'data/raw-cache');
fs.mkdirSync(CACHE, { recursive: true });
const hash = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12);

const cell = (v) => {
  if (v == null) return null;
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString();
    return v.text ?? v.result ?? (v.richText ? v.richText.map((t) => t.text).join('') : null);
  }
  return v;
};
const num = (v) => (v == null || v === '' ? 0 : Number(v) || 0);

const profile = {};
for (const seg of SEGMENTS.filter((s) => s.social)) {
  const file = path.join(SOURCES.social, seg.social);
  if (!fs.existsSync(file)) { console.warn(`! No existe ${file}`); continue; }
  const out = fs.createWriteStream(path.join(CACHE, `social-${seg.product}.jsonl`), 'utf8');
  const wb = new ExcelJS.stream.xlsx.WorkbookReader(file, { sharedStrings: 'cache', hyperlinks: 'ignore', styles: 'ignore', worksheets: 'emit' });
  const p = { file: seg.social, sheets: [], rows: 0, types: {}, platforms: {}, languages: {}, countries: {}, brand24Sentiment: {}, minDate: null, maxDate: null, emptyText: 0 };
  for await (const ws of wb) {
    let header = null; let n = 0;
    p.sheets.push(ws.name);
    for await (const row of ws) {
      const vals = row.values.slice(1).map(cell);
      if (!header) { header = vals.map((h) => String(h ?? '').trim()); continue; }
      const r = Object.fromEntries(header.map((h, i) => [h, vals[i] ?? null]));
      n++;
      const text = String(r['Content of posts'] ?? '').trim();
      const rec = {
        id: String(r.id),
        type: r['Specific type'] ?? '',
        title: r.Title ? String(r.Title).trim() : '',
        text,
        context: r.Context ? String(r.Context).slice(0, 600) : '',
        created: r.Created ? String(r.Created) : null,
        platform: r['Domain group'] ?? r.Domain ?? '',
        domain: r.Domain ?? '',
        author: r.Author || r['Author id'] ? hash(r['Author id'] || r.Author) : null,
        isBrandAccount: Boolean(r['Facebook page category']),
        pageCategory: r['Facebook page category'] ?? null,
        b24Sentiment: r.Sentiment ?? null,
        keywords: r.Keywords ?? '',
        lang: r.Language ?? '',
        country: r.Country ?? '',
        interactions: num(r['Total interactions']),
        comments: num(r.comments), views: num(r.views), shares: num(r.shares) + num(r.retweet),
        likes: num(r.likes) + num(r.like) + num(r.love) + num(r.favs) + num(r.hearts),
        followers: num(r.followers) || num(r.fans),
        thread: r['Thread ID'] ? String(r['Thread ID']) : null,
        link: r['Link to the source'] ?? null,
      };
      out.write(JSON.stringify(rec) + '\n');
      const inc = (o, k) => { k = k || '(vacío)'; o[k] = (o[k] || 0) + 1; };
      inc(p.types, rec.type); inc(p.platforms, rec.platform); inc(p.languages, rec.lang); inc(p.countries, rec.country); inc(p.brand24Sentiment, rec.b24Sentiment);
      if (!text) p.emptyText++;
      if (rec.created) { if (!p.minDate || rec.created < p.minDate) p.minDate = rec.created; if (!p.maxDate || rec.created > p.maxDate) p.maxDate = rec.created; }
    }
    p.rows += n;
  }
  await new Promise((res) => out.end(res));
  profile[seg.product] = p;
  console.log(`✓ ${seg.social}: ${p.rows} menciones → data/raw-cache/social-${seg.product}.jsonl`);
}
writeJson(path.join(CACHE, 'social-profile.json'), profile);
