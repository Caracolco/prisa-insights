// Selección y limpieza de variables TGI para presentación (no altera los datos).
import type { Metric } from './types';

/** Quita prefijos técnicos de la plantilla TGI ("Usó-U30d:", "Siempre veo/ regularmente:"…). */
export function cleanLabel(label: string): string {
  const s = label
    .replace(/^(Actividades más frecuentes\/ de rutina|Siempre veo\/ regularmente|Frecuentemente|Realizó-U30d|Usó-U30d|Suscripción paga|Visto-Ayer|Accedió-U7d|Radio|Elijo, me gusta y escucho siempre\/ regularmente):\s*/i, '')
    .replace(/\s*\(Total\)$/i, '')
    .trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const clean = (arr: Metric[]): Metric[] => arr.map((m) => ({ ...m, label: cleanLabel(m.label) }));

const generic = (m: Metric) => /^(otr[oa]s?\b|otro |otros )/i.test(cleanLabel(m.label));
// La variable que DEFINE el segmento aparece con ~100 % (p. ej. "Mochilero" en vacaciones): no es un hallazgo
const definitional = (m: Metric) => m.pen >= 99.5;

/**
 * Señales relevantes: combina escala (penetración) y diferencia (afinidad).
 * score = √pen × (afinidad/100)^1.5 — una variable masiva sin afinidad y una afín sin escala quedan detrás
 * de las que tienen ambas. Excluye categorías genéricas ("Otros…") y agregados "(Total)".
 */
export function relevant(arr: Metric[], n: number, minPen = 5): Metric[] {
  return clean(arr.filter((m) => !generic(m) && !definitional(m) && !/\(Total\)/i.test(m.label) && m.pen >= minPen && m.aff != null))
    .map((m) => ({ m, s: Math.sqrt(m.pen) * Math.pow((m.aff ?? 100) / 100, 1.5) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.m);
}

/** Las de mayor afinidad con escala mínima. */
export function byAffinity(arr: Metric[], n: number, minPen = 3): Metric[] {
  return clean(arr.filter((m) => !generic(m) && !definitional(m) && m.pen >= minPen && m.aff != null)).sort((a, b) => (b.aff ?? 0) - (a.aff ?? 0)).slice(0, n);
}

export function byPen(arr: Metric[], n: number): Metric[] {
  return clean(arr.filter((m) => !generic(m) && !/\(Total\)/i.test(m.label))).sort((a, b) => b.pen - a.pen).slice(0, n);
}

/** Elimina de `arr` lo que ya aparece en `shown` (por etiqueta). */
export const without = (arr: Metric[], shown: Metric[]) => arr.filter((m) => !shown.some((s) => cleanLabel(s.label) === cleanLabel(m.label)));

export const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** Etiqueta para usar dentro de una frase: sin paréntesis y sin primera persona. */
export const inSentence = (s: string) => lower(s.replace(/\s*\(.*?\)/g, '').replace(/^En mi hogar$/i, 'en casa').trim());
export const scaleWord = (pen: number) => (pen >= 15 ? 'escala alta' : pen >= 5 ? 'escala media' : 'escala baja');
