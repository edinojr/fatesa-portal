export const normalizeModuleTitle = (s: string): string => {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,;:!?_()\-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const cleanModuleTitle = (s: string): string => {
  let norm = normalizeModuleTitle(s);
  norm = norm
    .replace(/^(avaliacao\s+final|prova\s+final|avaliacao\s+online|avaliacao|prova|recuperacao\s+2|recuperacao|modulo|disciplina)\s*(de\s+|do\s+|da\s+|dos\s+|das\s+)?/i, '')
    .replace(/\s+(avaliacao\s+online|avaliacao\s+final|prova\s+final|avaliacao|prova|recuperacao\s+2|recuperacao)$/i, '')
    .trim();
  return norm;
};

export const areModuleTitlesEqual = (title1: string, title2: string): boolean => {
  if (!title1 || !title2) return false;
  const n1 = cleanModuleTitle(title1);
  const n2 = cleanModuleTitle(title2);
  if (n1 === n2) return true;

  const getSuffix = (s: string) => {
    const match = s.match(/\b(i{1,3}|iv|v|vi{0,3}|[1-9])\b$/);
    return match ? match[1] : null;
  };

  const suf1 = getSuffix(n1);
  const suf2 = getSuffix(n2);

  // Se ambos têm sufixos numéricos e são diferentes, NUNCA são o mesmo módulo
  // (ex: "Epístolas Paulinas I" vs "Epístolas Paulinas II")
  if (suf1 && suf2 && suf1 !== suf2) return false;
  if ((suf1 && !suf2 && (suf1 === 'ii' || suf1 === 'iii')) || (suf2 && !suf1 && (suf2 === 'ii' || suf2 === 'iii'))) return false;

  const EQUIVALENCES: [string, string][] = [
    ['hebreus', 'epistola aos hebreus'],
    ['hebreus', 'epistolas aos hebreus'],
    ['epistola aos hebreus', 'epistolas aos hebreus'],
    ['espirito santo', 'doutrina do espirito santo'],
    ['paulinas 1', 'epistolas paulinas i'],
    ['paulinas i', 'epistolas paulinas i'],
    ['paulinas 2', 'epistolas paulinas ii'],
    ['paulinas ii', 'epistolas paulinas ii'],
    ['paulinas 3', 'epistolas paulinas iii'],
    ['paulinas iii', 'epistolas paulinas iii'],
    ['salvacao', 'doutrina da salvacao'],
    ['israel 1', 'historia de israel i'],
    ['israel i', 'historia de israel i'],
    ['israel 2', 'historia de israel ii'],
    ['israel ii', 'historia de israel ii'],
    ['poeticos 1', 'livros poeticos i'],
    ['poeticos i', 'livros poeticos i'],
    ['poeticos 2', 'livros poeticos ii'],
    ['poeticos ii', 'livros poeticos ii']
  ];

  for (const [a, b] of EQUIVALENCES) {
    if ((n1 === a && n2 === b) || (n1 === b && n2 === a)) return true;
  }

  return false;
};
