import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';

const nf = (d: number) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Número que rueda hasta su nuevo valor cuando cambia el segmento. */
export function Counter({ value, decimals = 1, suffix = '', duration = 0.7 }: { value: number | null | undefined; decimals?: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const to = value ?? 0;
    const f = nf(decimals);
    if (reduce) { el.textContent = f.format(to) + suffix; prev.current = to; return; }
    const ctrl = animate(prev.current, to, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => { el.textContent = f.format(v) + suffix; } });
    prev.current = to;
    return () => ctrl.stop();
  }, [value, decimals, suffix, duration, reduce]);
  return <span ref={ref} className="num">{value == null ? '–' : nf(decimals).format(value) + suffix}</span>;
}
