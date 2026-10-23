import type { Segment, SegmentIndex } from './types';

const cache = new Map<string, Promise<Segment>>();
let indexPromise: Promise<SegmentIndex> | null = null;

export function loadIndex(): Promise<SegmentIndex> {
  indexPromise ??= fetch(`${import.meta.env.BASE_URL}data/segments.json`).then((r) => {
    if (!r.ok) throw new Error('No se encontró public/data/segments.json. Ejecuta npm run data:build.');
    return r.json();
  });
  return indexPromise;
}

export function loadSegment(id: string): Promise<Segment> {
  if (!cache.has(id)) {
    cache.set(id, fetch(`${import.meta.env.BASE_URL}data/segments/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(`No hay datos para el segmento ${id}.`);
      return r.json();
    }));
  }
  return cache.get(id)!;
}

/** Precarga silenciosa para que el cambio de segmento sea instantáneo. */
export function prefetchAll(ids: string[]) {
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 400));
  idle(() => ids.forEach((id) => loadSegment(id).catch(() => cache.delete(id))));
}
