import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { SegmentIndexItem } from '../lib/types';

interface Props { segments: SegmentIndexItem[]; onEnter: () => void }

const wave = (x: number, t: number) => Math.sin(x * 9.2 + t * 0.9) * 0.55 + Math.sin(x * 23 - t * 1.4) * 0.25 + Math.sin(x * 4.1 + t * 0.35) * 0.2;
const envelope = (x: number) => Math.sin(Math.PI * x) ** 1.4;

export function Cover({ segments, onEnter }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const nodes = useMemo(() => segments.map((s, i) => ({ ...s, x: 0.12 + (i / Math.max(1, segments.length - 1)) * 0.76 })), [segments]);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d')!;
    let w = 0, h = 0, raf = 0; const dpr = Math.min(2, window.devicePixelRatio || 1);
    const N = window.innerWidth < 700 ? 90 : 170;
    const P = Array.from({ length: N }, (_, i) => ({ u: i / (N - 1), sx: Math.random(), sy: Math.random(), j: (Math.random() - 0.5) * 0.06 }));
    const resize = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener('resize', resize);
    const t0 = performance.now();
    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      const k = reduce ? 1 : Math.min(1, t / 2.2); const e = 1 - (1 - k) ** 3; // convergencia
      const amp = h * (w < 700 ? 0.07 : 0.1); const cy = h * 0.8;
      ctx.clearRect(0, 0, w, h);
      const pts = P.map((p) => {
        const hx = p.u * w; const hy = cy + wave(p.u, reduce ? 0 : t) * amp * envelope(p.u) + p.j * amp;
        return { x: p.sx * w * (1 - e) + hx * e, y: p.sy * h * (1 - e) + hy * e, u: p.u };
      });
      // red de datos tenue entre vecinos
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < Math.min(pts.length, i + 6); j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y; const d = Math.hypot(dx, dy);
        if (d < 90) { ctx.strokeStyle = `rgba(233,234,236,${0.12 * (1 - d / 90)})`; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
      }
      // onda principal
      ctx.strokeStyle = `rgba(230,0,126,${0.55 * e})`; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x <= w; x += 4) { const u = x / w; const y = cy + wave(u, reduce ? 0 : t) * amp * envelope(u); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
      for (const p of pts) { ctx.fillStyle = p.u > 0.3 && p.u < 0.7 ? 'rgba(14,157,204,0.85)' : 'rgba(233,234,236,0.55)'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill(); }
      // línea de escaneo, una sola pasada
      if (!reduce && t < 3.2) { const sx = (t / 3.2) * w; const g = ctx.createLinearGradient(sx - 80, 0, sx, 0); g.addColorStop(0, 'rgba(255,198,0,0)'); g.addColorStop(1, 'rgba(255,198,0,0.08)'); ctx.fillStyle = g; ctx.fillRect(sx - 80, 0, 80, h); }
      // nodos de segmento sobre la onda
      for (const n of nodes) { const y = cy + wave(n.x, reduce ? 0 : t) * amp * envelope(n.x); ctx.fillStyle = `rgba(230,0,126,${e})`; ctx.beginPath(); ctx.arc(n.x * w, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = `rgba(230,0,126,${0.35 * e})`; ctx.beginPath(); ctx.arc(n.x * w, y, 10, 0, Math.PI * 2); ctx.stroke(); }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    if (reduce) draw(performance.now()); else raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [nodes, reduce]);

  // Con movimiento reducido todo aparece en su estado final, sin animación
  const fade = (delay: number, y = 0) => (reduce ? { initial: false as const } : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } });
  const enter = () => { if (reduce) return onEnter(); setLeaving(true); setTimeout(onEnter, 650); };

  return (
    <motion.div className="cover theme-dark" animate={leaving ? { opacity: 0, scale: 1.04, filter: 'blur(6px)' } : { opacity: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      <canvas ref={canvasRef} className="cover__canvas" aria-hidden />
      <div className="cover__inner">
        <motion.p className="cover__kicker" {...fade(0.2)}>Audience Intelligence System</motion.p>
        <h1 className="cover__title display" aria-label="PRISA Insights">
          <motion.span {...fade(0.35, 24)}>PRISA</motion.span>
          <motion.span {...fade(0.5, 24)}>Insights</motion.span>
        </h1>
        <motion.p className="cover__lede" {...fade(0.7)}>
          Lo que la audiencia declara, cómo escucha, cómo navega y lo que dice cuando nadie le pregunta, en una sola lectura.
        </motion.p>
        <motion.div className="cover__sources" {...fade(0.9)} aria-label="Fuentes integradas">
          {['TGI', 'Audio', 'Digital', 'Social'].map((s, i) => (
            <motion.span key={s} className={`cover__source cover__source--${i}`} {...fade(1 + i * 0.15)}>{s}</motion.span>
          ))}
        </motion.div>
        <motion.button className="cover__cta" onClick={enter} {...fade(1.1, 10)} autoFocus>
          Explorar audiencias
        </motion.button>
      </div>
      <ul className="cover__nodes" aria-hidden>
        {nodes.map((n, i) => (
          <motion.li key={n.id} className={i % 2 ? 'is-low' : ''} style={{ left: `${n.x * 100}%` }} {...fade(1.3 + i * 0.08)}>{n.name}</motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
