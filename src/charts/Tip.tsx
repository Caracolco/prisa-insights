import { useEffect, useState } from 'react';

/**
 * Capa única de tooltips por delegación: cualquier marca con data-tip="Título|Línea 1|Línea 2"
 * muestra un tooltip al pasar el puntero o al recibir foco (teclado).
 */
export function TipLayer() {
  const [tip, setTip] = useState<{ x: number; y: number; lines: string[] } | null>(null);
  useEffect(() => {
    const find = (t: EventTarget | null) => (t instanceof Element ? (t.closest('[data-tip]') as HTMLElement | null) : null);
    const over = (e: PointerEvent) => { const el = find(e.target); if (el) setTip({ x: e.clientX, y: e.clientY, lines: el.dataset.tip!.split('|') }); else setTip(null); };
    const move = (e: PointerEvent) => setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t));
    const focus = (e: FocusEvent) => { const el = find(e.target); if (!el) return setTip(null); const r = el.getBoundingClientRect(); setTip({ x: r.left + r.width / 2, y: r.top, lines: el.dataset.tip!.split('|') }); };
    const hide = () => setTip(null);
    document.addEventListener('pointerover', over);
    document.addEventListener('pointermove', move);
    document.addEventListener('focusin', focus);
    document.addEventListener('scroll', hide, true);
    return () => { document.removeEventListener('pointerover', over); document.removeEventListener('pointermove', move); document.removeEventListener('focusin', focus); document.removeEventListener('scroll', hide, true); };
  }, []);
  if (!tip) return null;
  const left = Math.min(tip.x + 14, window.innerWidth - 260);
  const top = Math.max(8, tip.y - 12);
  return (
    <div className="tip" role="tooltip" style={{ left, top }}>
      <strong>{tip.lines[0]}</strong>
      {tip.lines.slice(1).map((l, i) => <span key={i}>{l}</span>)}
    </div>
  );
}
