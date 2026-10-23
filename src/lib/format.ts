const nf1 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export const pct = (n: number | null | undefined) => (n == null ? '–' : `${nf1.format(n)} %`);
export const int = (n: number | null | undefined) => (n == null ? '–' : nf0.format(n));
export const num1 = (n: number | null | undefined) => (n == null ? '–' : nf1.format(n));
export const millions = (thousands: number) => `${nf1.format(thousands / 1000)} M`;

/** Lectura de un índice de afinidad TGI (100 = igual que la población). */
export function affTone(aff: number | null | undefined): 'high' | 'up' | 'flat' | 'down' {
  if (aff == null) return 'flat';
  if (aff >= 120) return 'high';
  if (aff >= 108) return 'up';
  if (aff > 92) return 'flat';
  return 'down';
}

export const monthName = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');
};
export const dateLong = (s: string) => new Date(s.replace(' ', 'T')).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
