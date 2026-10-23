// Exporta el diccionario Dim_TGI_Etiqueta (frases cortas en 3ª persona) del modelo Power BI
// a data/dictionaries/tgi-labels.json. Solo LEE el TMDL; nunca lo modifica.
import * as fs from 'node:fs';
import path from 'node:path';
import { ROOT, SOURCES, writeJson } from './lib/config.mjs';

const out = path.join(ROOT, 'data/dictionaries/tgi-labels.json');
if (!fs.existsSync(SOURCES.labels)) {
  console.warn(`! No se encontró ${SOURCES.labels}; se conserva el diccionario existente.`);
  process.exit(0);
}
const txt = fs.readFileSync(SOURCES.labels, 'utf8');
const re = /\{\s*"((?:[^"]|"")*)",\s*"((?:[^"]|"")*)",\s*"([^"]*)",\s*"([^"]*)",\s*"((?:[^"]|"")*)",\s*"([^"]*)",\s*([\d.]+)\s*\}/g;
const rows = [];
for (const m of txt.matchAll(re)) {
  const u = (s) => s.replace(/""/g, '"');
  rows.push({ elemento: u(m[1]), statement: u(m[2]), tipo: m[3], categoria: m[4], corta: u(m[5]), grupo: m[6], peso: Number(m[7]) });
}
writeJson(out, rows);
console.log(`✓ ${rows.length} etiquetas → data/dictionaries/tgi-labels.json`);
