// Configuración compartida del pipeline de datos.
import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Las fuentes viven FUERA del repositorio (carpeta del proyecto Power BI). Se pueden
// sobrescribir con variables de entorno para otras máquinas.
const PBI = process.env.PRISA_PBI_DIR ?? path.resolve(ROOT, '..');
export const SOURCES = {
  tgi: process.env.PRISA_TGI_DIR ?? path.join(PBI, 'Data/TGI'),
  social: process.env.PRISA_SOCIAL_DIR ?? path.join(PBI, 'Social_Listening'),
  labels: process.env.PRISA_LABELS_TMDL ?? path.join(PBI, 'Prisa Insights.SemanticModel/definition/tables/Dim_TGI_Etiqueta.tmdl'),
};

// Mapeo canónico (igual que Seg_Canonico en el modelo Power BI).
// Para agregar un target TGI nuevo: añadir una entrada aquí con el nombre exacto del XLSX
// y una definitionLabel legible (traducción de la definición TGI que trae la cabecera del XLSX).
export const SEGMENTS = [
  { id: 'c-level', definitionLabel: 'Cargo directivo (C-Level)', name: 'C-Level', tgiFile: 'C_Level.xlsx' },
  { id: 'compra-vehiculo', definitionLabel: 'Planea comprar vehículo en los próximos 6 meses', name: 'Compra vehículo próximos 6 meses', tgiFile: 'Compra_Vehiculo_Proximos6Meses.xlsx' },
  { id: 'comprador-hogar', definitionLabel: 'Hace las compras del hogar (15+ años)', name: 'Comprador del hogar', tgiFile: 'Comprador_Del_Hogar.xlsx' },
  { id: 'conciertos', definitionLabel: 'Le gusta ir a conciertos', name: 'Asistentes a conciertos', tgiFile: 'Asistentes_Conciertos.xlsx' },
  { id: 'huevo', definitionLabel: 'Consume huevo una o más veces al día', name: 'Consumidor de huevo diario', tgiFile: 'Consumidor_Huevo_TodosLosDias.xlsx', social: 'Consumidor_Huevo_TodosLosDias.xlsx', product: 'huevo' },
  { id: 'pollo', definitionLabel: 'Consume pollo dos o más veces por semana', name: 'Consumidor de pollo 2+ veces por semana', tgiFile: 'Consumidor_Pollo_+2vecesxsemana.xlsx', social: 'Consumidor_Pollo_+2vecesxsemana.xlsx', product: 'pollo' },
  { id: 'mochilero', definitionLabel: 'Ha hecho vacaciones tipo mochilero (18+ años)', name: 'Mochilero', tgiFile: 'Mochilero.xlsx' },
  { id: 'moteros', definitionLabel: 'Tiene moto o scooter de uso personal (16+ años)', name: 'Moteros', tgiFile: 'Moteros.xlsx' },
  { id: 'pensionados', definitionLabel: 'Jubilado que no trabaja (15+ años)', name: 'Pensionados', tgiFile: 'Pensionados.xlsx' },
];

// Marcas PRISA presentes en la plantilla TGI (emisoras 30D).
export const PRISA_BRANDS = [
  { id: 'caracol', name: 'Caracol Radio', tgi: 'CARACOL' },
  { id: 'besame', name: 'Bésame', tgi: 'BÉSAME' },
  { id: 'tropicana', name: 'Tropicana', tgi: 'TROPICANA' },
  { id: 'los40', name: 'Los40', tgi: 'LOS40' },
  { id: 'radioacktiva', name: 'Radioacktiva', tgi: 'RADIOACKTIVA' },
];

export function sectionFor(cat, sub) {
  if (cat === 'EMISORAS' || cat.startsWith('CONSUMO DE RADIO') || cat.startsWith('HÁBITOS DE ESCUCHAR RADIO') ||
      cat.startsWith('PREFERENCIAS') || cat.startsWith('ACTITUDES FRENTE A LA PUBLICIDAD') ||
      cat.startsWith('Consumo total radio') || cat.startsWith('ALCANCE TOTAL PRISA')) return 'radio';
  if (cat.startsWith('DATOS BÁSICOS') || cat.startsWith('EDUCACIÓN') || cat.startsWith('INFORMACIÓN GEOGRÁFICA') ||
      cat.startsWith('EMPLEO') || cat.startsWith('ESTRUCTURA Y CARACTERÍSTICAS')) return 'profile';
  if (cat.startsWith('OPINIONES Y ACTITUDES')) return 'opinions';
  if (cat.startsWith('EVENTOS EN LA VIDA')) return 'futurePlans';
  if (cat.startsWith('SERVICIOS DE VIDEO') || cat.startsWith('VIDEOS ONLINE')) return 'video';
  if (cat.startsWith('PODCAST') || cat.startsWith('STREAMING DE MÚSICA')) return 'audio';
  if (cat.startsWith('REDES SOCIALES') || cat.startsWith('APLICACIONES') || cat.startsWith('HÁBITOS DE INTERNET') ||
      cat.startsWith('ACTIVIDADES DE INTERNET')) return 'digital';
  return 'activities';
}

export function writeJson(file, obj, pretty = true) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, pretty ? 1 : 0) + '\n', 'utf8');
}
