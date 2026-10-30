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
    .replace(/^\d+[\s.-]+/, '')
    .replace(/^(avaliacao\s+final|prova\s+final|avaliacao\s+online|avaliacao|prova|recuperacao\s+2|recuperacao|modulo|disciplina)\s*(de\s+|do\s+|da\s+|dos\s+|das\s+)?/i, '')
    .replace(/\s+(avaliacao\s+online|avaliacao\s+final|prova\s+final|avaliacao|prova|recuperacao\s+2|recuperacao)$/i, '')
    .replace(/^(o|os|a|as)\s+/i, '')
    .replace(/\b1\b/g, 'i')
    .replace(/\b2\b/g, 'ii')
    .replace(/\b3\b/g, 'iii')
    .replace(/\b4\b/g, 'iv')
    .replace(/\b5\b/g, 'v')
    .replace(/\s+/g, ' ')
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
    if (!match) return null;
    let val = match[1];
    if (val === '1') val = 'i';
    if (val === '2') val = 'ii';
    if (val === '3') val = 'iii';
    if (val === '4') val = 'iv';
    if (val === '5') val = 'v';
    return val;
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
    ['pneumatologia', 'doutrina do espirito santo'],
    ['espirito santo', 'pneumatologia'],
    ['paulinas i', 'epistolas paulinas i'],
    ['epistola paulina i', 'epistolas paulinas i'],
    ['paulinas ii', 'epistolas paulinas ii'],
    ['epistola paulina ii', 'epistolas paulinas ii'],
    ['paulinas iii', 'epistolas paulinas iii'],
    ['epistola paulina iii', 'epistolas paulinas iii'],
    ['salvacao', 'doutrina da salvacao'],
    ['soteriologia', 'doutrina da salvacao'],
    ['obreiro', 'teologia do obreiro'],
    ['obreiros', 'teologia do obreiro'],
    ['israel i', 'historia de israel i'],
    ['israel ii', 'historia de israel ii'],
    ['poeticos i', 'livros poeticos i'],
    ['poeticos ii', 'livros poeticos ii'],
    ['livros poeticos i jo e salmos', 'livros poeticos i'],
    ['livros poeticos i jo e salmos', 'poeticos i'],
    ['livros poeticos ii proverbios eclesiastes e cantares', 'livros poeticos ii'],
    ['livros poeticos ii proverbios eclesiastes e cantares', 'poeticos ii'],
    ['pentateuco', 'o pentateuco'],
    ['evangelhos', 'os evangelhos'],
    ['atos', 'atos dos apostolos'],
    ['escatologia', 'escatologia biblica'],
    ['epistola geral', 'epistolas gerais'],
    ['teologia propria', 'doutrina de deus'],
    ['angelologia', 'anjos homem e pecado'],
    ['anjos homem pecado', 'anjos homem e pecado'],
    ['hamartiologia', 'anjos homem e pecado'],
    ['antropologia e hamartiologia', 'anjos homem e pecado']
  ];

  for (const [a, b] of EQUIVALENCES) {
    const ca = cleanModuleTitle(a);
    const cb = cleanModuleTitle(b);
    if ((n1 === ca && n2 === cb) || (n1 === cb && n2 === ca)) return true;
  }

  return false;
};

/**
 * Trilha Hierárquica Oficial Fatesa (7 Módulos em sequência):
 * 1. Epístolas aos Hebreus
 * 2. Doutrina do Espírito Santo
 * 3. Epístolas Paulinas I
 * 4. Teologia Prática
 * 5. História da Igreja
 * 6. Cristologia
 * 7. Escatologia Bíblica
 */
export const HIERARCHICAL_TRACK_TITLES = [
  'epistola aos hebreus',
  'doutrina do espirito santo',
  'epistolas paulinas i',
  'teologia pratica',
  'historia da igreja',
  'cristologia',
  'escatologia biblica'
];

export const getHierarchicalTrackIndex = (title: string): number => {
  if (!title) return -1;
  const clean = cleanModuleTitle(title);
  
  if (clean === 'epistola aos hebreus' || clean === 'epistolas aos hebreus' || clean === 'epistolas ao hebreus' || clean === 'hebreus') {
    return 0;
  }
  if (clean === 'doutrina do espirito santo' || clean === 'espirito santo') {
    return 1;
  }
  if (clean === 'epistolas paulinas i' || clean === 'epistola paulina i' || clean === 'epistolas paulinas 1' || clean === 'paulinas i' || clean === 'paulinas 1') {
    return 2;
  }
  if (clean === 'teologia pratica' || clean === 'teologia praticas') {
    return 3;
  }
  if (clean === 'historia da igreja' || clean === 'historia igreja') {
    return 4;
  }
  if (clean === 'cristologia') {
    return 5;
  }
  if (clean === 'escatologia biblica' || clean === 'escatologia') {
    return 6;
  }

  for (let i = 0; i < HIERARCHICAL_TRACK_TITLES.length; i++) {
    if (areModuleTitlesEqual(clean, HIERARCHICAL_TRACK_TITLES[i])) {
      return i;
    }
  }

  return -1;
};

export const isModuleInHierarchicalTrack = (title: string): boolean => {
  return getHierarchicalTrackIndex(title) !== -1;
};

export const LEGACY_AULA_TO_BOOK_TITLE: Record<string, string> = {
  // Epístola aos Hebreus
  'cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed': 'Epístola aos Hebreus',
  '778a7d2d-d046-475a-8f5d-5ea59700d883': 'Epístola aos Hebreus',
  '8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe': 'Epístola aos Hebreus',
  '383653ae-1a79-4d2e-8509-579040bb1d0c': 'Epístola aos Hebreus',
  '446ee260-6bf3-4fd9-b52d-37c0a3fbd2ce': 'Epístola aos Hebreus',
  'ddc19cca-72c2-4207-ab1c-21a376f11bc6': 'Epístola aos Hebreus',
  '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3': 'Epístola aos Hebreus',
  'dfead070-ffaa-47c8-8304-9a449290d535': 'Epístola aos Hebreus',
  '8706f108-5423-4ede-8598-f2e112073b22': 'Epístola aos Hebreus',
  '57b445f4-2e72-40ac-ad31-e2cafd3dc4f4': 'Epístola aos Hebreus',
  'df242323-1230-4f78-8d65-f0e75de30e24': 'Epístola aos Hebreus',
  '290b9208-4a8d-437e-b147-4ee11387755a': 'Epístola aos Hebreus',
  '8c8e7bac-182d-4df3-844d-fdb734107eaf': 'Epístola aos Hebreus',

  // Doutrina do Espírito Santo
  '30190d06-b324-4b77-8435-b2eb63e4e55f': 'Doutrina do Espírito Santo',
  'e6f7a766-dca2-46ec-b875-935a02f649b1': 'Doutrina do Espírito Santo',
  '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3': 'Doutrina do Espírito Santo',
  '6f67ed3b-afda-4a96-8682-c986c247a005': 'Doutrina do Espírito Santo',
  '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1': 'Doutrina do Espírito Santo',
  'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9': 'Doutrina do Espírito Santo',
  '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5': 'Doutrina do Espírito Santo',
  '7ac481f8-64f1-41f4-8836-33128e19f6fe': 'Doutrina do Espírito Santo',
  'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a': 'Doutrina do Espírito Santo',
  '52001439-da37-4844-8d35-69c132a2b1af': 'Doutrina do Espírito Santo',
  'c19572c2-10f0-45a3-abd4-6053f41fd22f': 'Doutrina do Espírito Santo',
  'edd1ce4c-4caa-442f-9195-e84d7274adc9': 'Doutrina do Espírito Santo',
  'c1141d36-657d-4b59-b2ee-bcd7901633e1': 'Doutrina do Espírito Santo',

  // Epístolas Paulinas I
  '0bdde13e-8848-4d49-a929-69b78acba92c': 'Epístolas Paulinas I',
  '0bf75491-7ad2-4d4d-b984-dfc815b32047': 'Epístolas Paulinas I',
  'acef2116-a948-47bb-8bcd-aa39adcd7f7e': 'Epístolas Paulinas I',
  '69b6d4dd-0ddc-45ad-86d9-e169c04f8305': 'Epístolas Paulinas I',
  'd645a78d-aacf-4743-9e7e-313916f31ebb': 'Epístolas Paulinas I',
  'd9246788-96a5-4bb9-8fab-e4a9413ea283': 'Epístolas Paulinas I',
  'abd7ec76-2471-4cb9-876e-e09808f23344': 'Epístolas Paulinas I',
  '0e6f076a-33ad-4cda-bdbd-49e32ed7d006': 'Epístolas Paulinas I',
  '92655b42-54a5-4498-8d1e-468e9d171a30': 'Epístolas Paulinas I',
  '836017e9-87c9-42da-9dd0-756e11772487': 'Epístolas Paulinas I',
  '6fd1a301-0c59-4518-90c1-52ea0d7816e2': 'Epístolas Paulinas I',
  '6f6b3a55-83a7-4312-babf-d477a75f65af': 'Epístolas Paulinas I',
  '5e5b10f9-ee50-4b2f-a63f-35fa8dc8949b': 'Epístolas Paulinas I',

  // Teologia Prática
  '7b545e0f-8322-4256-9de6-45fedbb6b4f3': 'Teologia Prática',
  'd678cd76-1908-472e-9492-e2d5f421c133': 'Teologia Prática',
  '87c5880c-22b7-47ef-bd16-7d4f69264377': 'Teologia Prática',
  'da9c29c8-9fcb-485b-a6f7-01e0e0f66013': 'Teologia Prática',
  'dc69dd9d-b525-4a3c-9698-8a61acff4149': 'Teologia Prática',
  '4e4e8a9d-9815-446f-9cd4-0189e77debf4': 'Teologia Prática',
  '44e83075-58b7-473d-a95d-de6f94d85df2': 'Teologia Prática',
  '21b42fe6-3bca-447e-b3e3-f2f26bdc090d': 'Teologia Prática',
  'e68ce31d-0b5f-4b28-8070-6e80e701f7d7': 'Teologia Prática',
  '199d5b3e-9697-4620-8b72-fea1aedf106e': 'Teologia Prática'
};

/**
 * 27 Livros Oficiais do Curso Básico Fatesa ordenados e numerados (1 a 27)
 */
export const OFFICIAL_COURSE_BOOKS = [
  '1. BIBLIOLOGIA',
  '2. EPÍSTOLAS PAULINAS II',
  '3. EPÍSTOLAS PAULINAS III',
  '4. HERESIOLOGIA',
  '5. TEOLOGIA DO OBREIRO',
  '6. PROFETAS MAIORES',
  '7. PROFETAS MENORES',
  '8. ECLESIOLOGIA',
  '9. DOUTRINA DA SALVAÇÃO',
  '10. APOCALIPSE',
  '11. O PENTATEUCO',
  '12. OS EVANGELHOS',
  '13. ATOS DOS APÓSTOLOS',
  '14. EPÍSTOLA AOS HEBREUS',
  '15. A DOUTRINA DO ESPÍRITO SANTO',
  '16. EPÍSTOLAS PAULINAS I',
  '17. TEOLOGIA PRÁTICA',
  '18. HISTÓRIA DA IGREJA',
  '19. CRISTOLOGIA',
  '20. ESCATOLOGIA BÍBLICA',
  '21. EPÍSTOLAS GERAIS',
  '22. DOUTRINA DE DEUS',
  '23. ANJOS, HOMEM E PECADO',
  '24. HISTÓRIA DE ISRAEL I',
  '25. HISTÓRIA DE ISRAEL II',
  '26. OS LIVROS POÉTICOS I – JÓ E SALMOS',
  '27. OS LIVROS POÉTICOS II – PROVÉRBIOS, ECLESIASTES E CANTARES'
] as const;

/**
 * Obtém o índice curricular (0 a 26) para ordenar qualquer título
 */
export const getOfficialBookIndex = (title: string): number => {
  if (!title) return 999;

  // 1. Tentar correspondência direta ou por equivalência com os 27 livros oficiais
  for (let i = 0; i < OFFICIAL_COURSE_BOOKS.length; i++) {
    if (areModuleTitlesEqual(title, OFFICIAL_COURSE_BOOKS[i])) {
      return i;
    }
  }

  // 2. Se o título iniciar com numeração (ex: "1. Bibliologia", "02 - ...", "28. ..."), extrai o índice
  const matchDirect = title.match(/^\s*(\d+)(?:[\s.-]|$)/);
  if (matchDirect) {
    const num = parseInt(matchDirect[1], 10);
    if (num >= 1) return num - 1;
  }

  return 999;
};

/**
 * Retorna o título oficial numerado se corresponder aos 27 livros
 */
export const getOfficialBookTitle = (title: string): string => {
  if (!title) return '';
  const idx = getOfficialBookIndex(title);
  if (idx >= 0 && idx < OFFICIAL_COURSE_BOOKS.length) {
    return OFFICIAL_COURSE_BOOKS[idx];
  }
  return title.toUpperCase().trim();
};

/**
 * Ordena itens seguindo a ordem curricular estrita do curso (1 a 27)
 */
export const sortModulesByCurriculum = <T>(items: T[], getTitle: (item: T) => string): T[] => {
  return [...items].sort((a, b) => {
    const titleA = getTitle(a);
    const titleB = getTitle(b);
    const idxA = getOfficialBookIndex(titleA);
    const idxB = getOfficialBookIndex(titleB);
    if (idxA !== idxB) return idxA - idxB;
    return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
  });
};

