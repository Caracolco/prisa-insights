// XLSX TGI (Data/TGI) -> data/processed/tgi/<segment>.json
// Cada XLSX es la plantilla TGI (hoja "plantilla"): Elemento | (000) | TOTAL | Segmento.
// Penetración = Segmento_000 / Segmento_TOTAL ; Afinidad = Pen_segmento / Pen_total × 100.
import XLSX from 'xlsx';
import * as fs from 'node:fs';
import path from 'node:path';
import { ROOT, SOURCES, SEGMENTS, writeJson, sectionFor } from './lib/config.mjs';

XLSX.set_fs(fs);

const OUT = path.join(ROOT, 'data/processed/tgi');
fs.mkdirSync(OUT, { recursive: true });

// Diccionario de frases cortas (exportado de Dim_TGI_Etiqueta por scripts/import-labels.mjs)
const dictPath = path.join(ROOT, 'data/dictionaries/tgi-labels.json');
const dict = fs.existsSync(dictPath) ? JSON.parse(fs.readFileSync(dictPath, 'utf8')) : [];
const dictByElement = new Map(dict.map((d) => [d.elemento, d]));

const files = fs.readdirSync(SOURCES.tgi).filter((f) => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~$'));
const report = { generatedAt: new Date().toISOString(), files: [], unmapped: [] };

for (const file of files) {
  const seg = SEGMENTS.find((s) => s.tgiFile === file);
  if (!seg) {
    report.unmapped.push(file);
    console.warn(`! ${file}: sin segmento en scripts/lib/config.mjs (SEGMENTS). Se omite.`);
    continue;
  }
  const wb = XLSX.readFile(path.join(SOURCES.tgi, file));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const headerIdx = rows.findIndex((r) => r[1] === 'Elementos');
  if (headerIdx < 0) throw new Error(`${file}: no se encontró la fila "Elementos"`);
  const survey = String(rows[1]?.[0] ?? '').replace(/^Encuesta\s*:\s*/, '').trim();
  const definition = String(rows[headerIdx][3] ?? '').trim();

  const data = rows.slice(headerIdx + 1).filter((r) => r[1] === '(000)' && typeof r[2] === 'number');
  const totalRow = data.find((r) => String(r[0]).trim() === 'TOTAL');
  if (!totalRow) throw new Error(`${file}: falta la fila TOTAL`);
  const [baseTotal, baseSeg] = [totalRow[2], Number(totalRow[3])];

  const seen = new Set();
  const items = [];
  let duplicates = 0;
  for (const r of data) {
    const elemento = String(r[0]).trim();
    if (elemento === 'TOTAL') continue;
    if (seen.has(elemento)) { duplicates++; continue; } // la plantilla repite ~108 elementos idénticos
    seen.add(elemento);
    const total000 = Number(r[2]) || 0;
    const seg000 = Number(r[3]) || 0;
    const parts = elemento.split(': ');
    let category, sub, label;
    if (parts.length === 1) {
      // Filas de emisoras (sin prefijo) o etiquetas de alcance total
      category = /30\s?D$|^VIBRA$|^RADIÓNICA$|^RADIO RUMBO$|^MIX$/.test(elemento) ? 'EMISORAS' : elemento;
      sub = category === 'EMISORAS' ? 'Oyentes últimos 30 días' : '';
      label = category === 'EMISORAS' ? elemento.replace(/\s*30\s?D$/, '') : elemento;
    } else {
      category = parts[0];
      sub = parts[1] ?? '';
      label = parts.slice(2).join(': ') || parts[1];
    }
    const pen = baseSeg ? seg000 / baseSeg : 0;
    const penTotal = baseTotal ? total000 / baseTotal : 0;
    const aff = penTotal ? (pen / penTotal) * 100 : null;
    const d = dictByElement.get(elemento);
    items.push({
      el: elemento,
      sec: sectionFor(category, sub),
      cat: category,
      sub,
      label,
      ...(d ? { short: d.corta, group: d.grupo, kind: d.tipo, dcat: d.categoria, weight: d.peso } : {}),
      t000: round(total000, 3),
      s000: round(seg000, 3),
      pen: round(pen * 100, 2),
      penTotal: round(penTotal * 100, 2),
      aff: aff == null ? null : round(aff, 1),
    });
  }

  const out = {
    segment: seg.id,
    name: seg.name,
    sourceFile: file,
    survey,
    definition,
    universe000: round(baseTotal, 3),
    segment000: round(baseSeg, 3),
    items,
  };
  writeJson(path.join(OUT, `${seg.id}.json`), out);
  report.files.push({ file, segment: seg.id, rows: rows.length, items: items.length, duplicatesSkipped: duplicates, segment000: round(baseSeg, 1) });
  console.log(`✓ ${file} → ${seg.id}: ${items.length} elementos (${duplicates} duplicados omitidos)`);
}

writeJson(path.join(OUT, '_import-report.json'), report);

function round(n, d) { const f = 10 ** d; return Math.round(n * f) / f; }
