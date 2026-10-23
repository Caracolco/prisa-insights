import type { Answer, Segment } from '../lib/types';
import { ask } from './engine';

/**
 * Prototipo de Audiencia Sintética: responde en el navegador con el motor determinístico, solo con
 * los datos del segmento. No llama a ninguna API ni a ningún modelo de IA (fase posterior).
 */
export async function askAudience(segment: Segment, question: string): Promise<Answer> {
  return ask(segment, question);
}
