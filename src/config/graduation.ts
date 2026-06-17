export const GRADUATION_CONFIG = {
  basico: { requiredModules: 27, label: 'Básico' },
  medio: { requiredModules: 8, label: 'Médio' },
  defaultMinGrade: 7.0,
  maxExamVersion: 3,
} as const;

export function getRequiredModules(nivel: string): number {
  const n = (nivel || '').toLowerCase();
  if (n.includes('basico') || n.includes('básico')) return GRADUATION_CONFIG.basico.requiredModules;
  if (n.includes('medio') || n.includes('médio')) return GRADUATION_CONFIG.medio.requiredModules;
  return Infinity;
}

export function isNivelBasico(nivel: string): boolean {
  const n = (nivel || '').toLowerCase();
  return n.includes('basico') || n.includes('básico');
}

export function isNivelMedio(nivel: string): boolean {
  const n = (nivel || '').toLowerCase();
  return n.includes('medio') || n.includes('médio');
}
