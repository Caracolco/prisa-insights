// Cloudflare Worker OPCIONAL (plan gratuito): sirve el frontend estático y una API /api/ask determinística.
// La web no la necesita: funciona como sitio estático (GitHub Pages, Cloudflare Pages/Workers estático).
// No hay IA ni servicios pagos. La conversación con un modelo es una fase posterior; el contexto ya está
// preparado en data/processed/context/<segmento>.audience-context.json.
import { ask } from '../src/ai/engine';
import type { Segment } from '../src/lib/types';
import data from './generated/data.json';

interface Env { ASSETS: Fetcher }

const DATA = data as unknown as { segments: Record<string, Segment> };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return json({ ok: true, mode: 'demo' });
    if (url.pathname === '/api/ask') {
      if (request.method !== 'POST') return json({ error: 'Usa POST' }, 405);
      let body: { segmentId?: string; question?: string };
      try { body = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
      const segment = body.segmentId ? DATA.segments[body.segmentId] : undefined;
      const question = String(body.question ?? '').slice(0, 400);
      if (!segment) return json({ error: 'Segmento desconocido' }, 404);
      if (!question.trim()) return json({ error: 'Pregunta vacía' }, 400);
      return json(ask(segment, question));
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
