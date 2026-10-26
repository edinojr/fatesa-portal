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
