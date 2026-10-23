import { motion, useReducedMotion } from 'motion/react';
import type { SourceKind } from '../lib/types';
import { Source } from './bits';

export function PageHeader({ n, question, answer, lede, facts = [], source }: { n: string; question: string; answer: string; lede?: string; facts?: string[]; source: SourceKind }) {
  const reduce = useReducedMotion();
  const enter = (d: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } });
  return (
    <header className="ph">
      <div className="ph__meta" data-section={n}><Source kind={source} /></div>
      <motion.h1 className="ph__q display" {...enter(0)}>{question}</motion.h1>
      <motion.p className={`ph__answer${answer.length > 160 ? ' ph__answer--xlong' : answer.length > 120 ? ' ph__answer--long' : ''}`} {...enter(0.08)}>{answer}</motion.p>
      {lede && <motion.p className="ph__lede" {...enter(0.14)}>{lede}</motion.p>}
      {facts.length > 0 && (
        <motion.ul className="ph__facts" {...enter(0.2)}>
          {facts.map((f) => <li key={f}>{f}</li>)}
        </motion.ul>
      )}
    </header>
  );
}
