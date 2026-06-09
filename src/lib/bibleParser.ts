// Bible book abbreviation mapping (PT-BR → full name)
// Only includes books that exist in the ACF Atualizada
const BOOK_MAP: Record<string, string> = {
  'gn': 'Gênesis', 'gênesis': 'Gênesis', 'genesis': 'Gênesis',
  'êx': 'Êxodo', 'ex': 'Êxodo', 'êxodo': 'Êxodo', 'exodo': 'Êxodo',
  'lv': 'Levítico', 'levítico': 'Levítico', 'levitico': 'Levítico',
  'nm': 'Números', 'números': 'Números', 'numeros': 'Números',
  'dt': 'Deuteronômio', 'deuteronômio': 'Deuteronômio', 'deuteronomio': 'Deuteronômio',
  'js': 'Josué', 'josué': 'Josué', 'josue': 'Josué',
  'jz': 'Juízes', 'juízes': 'Juízes', 'juizes': 'Juízes',
  'rt': 'Rute', 'rute': 'Rute',
  '1sm': '1Samuel', '1 sm': '1Samuel', '1 samuel': '1Samuel', '1samuel': '1Samuel',
  '2sm': '2Samuel', '2 sm': '2Samuel', '2 samuel': '2Samuel', '2samuel': '2Samuel',
  '1rs': '1Reis', '1 rs': '1Reis', '1 reis': '1Reis', '1reis': '1Reis',
  '2rs': '2Reis', '2 rs': '2Reis', '2 reis': '2Reis', '2reis': '2Reis',
  '1cr': '1Crônicas', '1 cr': '1Crônicas', '1 crônicas': '1Crônicas', '1crônicas': '1Crônicas', '1cronicas': '1Crônicas',
  '2cr': '2Crônicas', '2 cr': '2Crônicas', '2 crônicas': '2Crônicas', '2crônicas': '2Crônicas', '2cronicas': '2Crônicas',
  'ed': 'Esdras', 'esdras': 'Esdras',
  'ne': 'Neemias', 'neemias': 'Neemias',
  'et': 'Ester', 'ester': 'Ester',
  'jó': 'Jó',
  'sl': 'Salmos', 'salmos': 'Salmos', 'salmo': 'Salmos',
  'pv': 'Provérbios', 'provérbios': 'Provérbios', 'proverbios': 'Provérbios',
  'ec': 'Eclesiastes', 'eclesiastes': 'Eclesiastes',
  'ct': 'Cantares', 'cantares': 'Cantares',
  'is': 'Isaías', 'isaías': 'Isaías', 'isaias': 'Isaías',
  'jr': 'Jeremias', 'jeremias': 'Jeremias',
  'lm': 'Lamentações', 'lamentações': 'Lamentações', 'lamentacoes': 'Lamentações',
  'ez': 'Ezequiel', 'ezequiel': 'Ezequiel',
  'dn': 'Daniel', 'daniel': 'Daniel',
  'os': 'Oseias', 'oseias': 'Oseias',
  'jl': 'Joel', 'joel': 'Joel',
  'am': 'Amós', 'amós': 'Amós', 'amos': 'Amós',
  'ob': 'Obadias', 'obadias': 'Obadias',
  'jn': 'Jonas', 'jonas': 'Jonas',
  'mq': 'Miqueias', 'miqueias': 'Miqueias',
  'na': 'Naum', 'naum': 'Naum',
  'hc': 'Habacuque', 'habacuque': 'Habacuque',
  'sf': 'Sofonias', 'sofonias': 'Sofonias',
  'ag': 'Ageu', 'ageu': 'Ageu',
  'zc': 'Zacarias', 'zacarias': 'Zacarias',
  'ml': 'Malaquias', 'malaquias': 'Malaquias',
  'mt': 'Mateus', 'mateus': 'Mateus',
  'mc': 'Marcos', 'marcos': 'Marcos',
  'lc': 'Lucas', 'lucas': 'Lucas',
  'jo': 'João', 'joão': 'João', 'joao': 'João',
  'at': 'Atos', 'atos': 'Atos',
  'rm': 'Romanos', 'romanos': 'Romanos',
  '1co': '1Coríntios', '1 co': '1Coríntios', '1 coríntios': '1Coríntios', '1coríntios': '1Coríntios', '1corintios': '1Coríntios',
  '2co': '2Coríntios', '2 co': '2Coríntios', '2 coríntios': '2Coríntios', '2coríntios': '2Coríntios', '2corintios': '2Coríntios',
  'gl': 'Gálatas', 'gálatas': 'Gálatas', 'galatas': 'Gálatas',
  'ef': 'Efésios', 'efésios': 'Efésios', 'efesios': 'Efésios',
  'fp': 'Filipenses', 'filipenses': 'Filipenses',
  'cl': 'Colossenses', 'colossenses': 'Colossenses',
  '1ts': '1Tessalonicenses', '1 ts': '1Tessalonicenses', '1 tessalonicenses': '1Tessalonicenses', '1tessalonicenses': '1Tessalonicenses',
  '2ts': '2Tessalonicenses', '2 ts': '2Tessalonicenses', '2 tessalonicenses': '2Tessalonicenses', '2tessalonicenses': '2Tessalonicenses',
  '1tm': '1Timóteo', '1 tm': '1Timóteo', '1 timóteo': '1Timóteo', '1timóteo': '1Timóteo', '1timoteo': '1Timóteo',
  '2tm': '2Timóteo', '2 tm': '2Timóteo', '2 timóteo': '2Timóteo', '2timóteo': '2Timóteo', '2timoteo': '2Timóteo',
  'tt': 'Tito', 'tito': 'Tito',
  'fm': 'Filemom', 'filemom': 'Filemom',
  'hb': 'Hebreus', 'hebreus': 'Hebreus',
  'tg': 'Tiago', 'tiago': 'Tiago',
  '1pe': '1Pedro', '1 pe': '1Pedro', '1 pedro': '1Pedro', '1pedro': '1Pedro',
  '2pe': '2Pedro', '2 pe': '2Pedro', '2 pedro': '2Pedro', '2pedro': '2Pedro',
  '1jo': '1João', '1 jo': '1João', '1 joão': '1João', '1joão': '1João', '1joao': '1João',
  '2jo': '2João', '2 jo': '2João', '2 joão': '2João', '2joão': '2João', '2joao': '2João',
  '3jo': '3João', '3 jo': '3João', '3 joão': '3João', '3joão': '3João', '3joao': '3João',
  'jd': 'Judas', 'judas': 'Judas',
  'ap': 'Apocalipse', 'apocalipse': 'Apocalipse',
};

// Max chapters per book (for validation)
const MAX_CHAPTERS: Record<string, number> = {
  'Gênesis': 50, 'Êxodo': 40, 'Levítico': 27, 'Números': 36, 'Deuteronômio': 34,
  'Josué': 24, 'Juízes': 21, 'Rute': 4, '1Samuel': 31, '2Samuel': 24,
  '1Reis': 22, '2Reis': 25, '1Crônicas': 29, '2Crônicas': 36, 'Esdras': 10,
  'Neemias': 13, 'Ester': 10, 'Jó': 42, 'Salmos': 150, 'Provérbios': 31,
  'Eclesiastes': 12, 'Cantares': 8, 'Isaías': 66, 'Jeremias': 52,
  'Lamentações': 5, 'Ezequiel': 48, 'Daniel': 12, 'Oseias': 14,
  'Joel': 3, 'Amós': 9, 'Obadias': 1, 'Jonas': 4, 'Miqueias': 7,
  'Naum': 3, 'Habacuque': 3, 'Sofonias': 3, 'Ageu': 2, 'Zacarias': 14,
  'Malaquias': 4, 'Mateus': 28, 'Marcos': 16, 'Lucas': 24, 'João': 21,
  'Atos': 28, 'Romanos': 16, '1Coríntios': 16, '2Coríntios': 13,
  'Gálatas': 6, 'Efésios': 6, 'Filipenses': 4, 'Colossenses': 4,
  '1Tessalonicenses': 5, '2Tessalonicenses': 3, '1Timóteo': 6,
  '2Timóteo': 4, 'Tito': 3, 'Filemom': 1, 'Hebreus': 13,
  'Tiago': 5, '1Pedro': 5, '2Pedro': 3, '1João': 5, '2João': 1,
  '3João': 1, 'Judas': 1, 'Apocalipse': 22,
};

export interface BibleRef {
  raw: string;           // Original text match
  book: string;          // Full book name (e.g., "João")
  bookAbbr: string;      // Abbreviation used (e.g., "Jo")
  chapter: number;
  verses: number[];      // Array of verse numbers
  isRange: boolean;      // Whether it's a range (e.g., 3:16-18)
  startVerse: number;
  endVerse: number;
}

export interface ProcessedRef extends BibleRef {
  id: string;
  valid: boolean;
}

// Build reverse lookup: full name → abbreviation
const FULL_NAME_TO_ABBR: Record<string, string> = {};
for (const [abbr, name] of Object.entries(BOOK_MAP)) {
  if (!FULL_NAME_TO_ABBR[name]) {
    FULL_NAME_TO_ABBR[name] = abbr;
  }
}

/**
 * Normalize text for matching (remove accents, lowercase)
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Resolve a book name/abbreviation to its full name
 */
function resolveBook(input: string): string | null {
  const normalized = normalize(input);
  
  // Direct lookup
  for (const [abbr, name] of Object.entries(BOOK_MAP)) {
    if (normalize(abbr) === normalized) return name;
  }
  
  // Partial match
  for (const [abbr, name] of Object.entries(BOOK_MAP)) {
    if (normalized.startsWith(normalize(abbr))) return name;
  }
  
  return null;
}

/**
 * Check if a reference is valid (book exists, chapter exists, verse exists)
 */
function validateRef(ref: BibleRef): boolean {
  if (!ref.book) return false;
  if (!MAX_CHAPTERS[ref.book]) return false;
  if (ref.chapter > MAX_CHAPTERS[ref.book]) return false;
  // We can't validate verse counts without the actual data, but chapter is enough for basic validation
  return true;
}

/**
 * Parse a single verse specifier: "16", "16-18", "1,5,8", "1-4"
 */
function parseVerseSpec(spec: string): { verses: number[]; isRange: boolean; start: number; end: number } {
  spec = spec.trim();
  
  // Range: "16-18"
  const rangeMatch = spec.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    const verses: number[] = [];
    for (let i = start; i <= end; i++) verses.push(i);
    return { verses, isRange: true, start, end };
  }
  
  // Multiple: "1,5,8"
  const multiMatch = spec.match(/^(\d+(?:\s*[-–—]\s*\d+)?)(?:\s*,\s*(\d+(?:\s*[-–—]\s*\d+)?))+$/);
  if (multiMatch) {
    const parts = spec.split(',').map(s => s.trim());
    const verses: number[] = [];
    let start = Infinity, end = 0;
    for (const part of parts) {
      const rm = part.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
      if (rm) {
        const s = parseInt(rm[1]);
        const e = parseInt(rm[2]);
        for (let i = s; i <= e; i++) { verses.push(i); start = Math.min(start, i); end = Math.max(end, i); }
      } else {
        const v = parseInt(part);
        if (!isNaN(v)) { verses.push(v); start = Math.min(start, v); end = Math.max(end, v); }
      }
    }
    return { verses: [...new Set(verses)].sort((a, b) => a - b), isRange: true, start, end };
  }
  
  // Single: "16"
  const singleMatch = spec.match(/^(\d+)$/);
  if (singleMatch) {
    const v = parseInt(singleMatch[1]);
    return { verses: [v], isRange: false, start: v, end: v };
  }
  
  return { verses: [], isRange: false, start: 0, end: 0 };
}

/**
 * Build the master regex for biblical references
 * Handles: Jo 3:16, 1 Tm 4:13, (1 Co 8:4), (Ex 34:17), Sl 23, (1 Tm), etc.
 */
function buildRegex(): RegExp {
  // Canonical short abbreviations (the ones users actually type)
  // These need space-tolerant matching: "1 Tm" = "1Tm" = "1 tm"
  const shortAbbrs = [
    '1sm', '2sm', '1rs', '2rs', '1cr', '2cr',
    '1co', '2co', '1ts', '2ts', '1tm', '2tm',
    '1pe', '2pe', '1jo', '2jo', '3jo',
    'gn', 'êx', 'ex', 'lv', 'nm', 'dt', 'js', 'jz', 'rt',
    'ed', 'ne', 'et', 'sl', 'pv', 'ec', 'ct',
    'is', 'jr', 'lm', 'ez', 'dn', 'os', 'jl', 'am',
    'ob', 'jn', 'mq', 'na', 'hc', 'sf', 'ag', 'zc', 'ml',
    'mt', 'mc', 'lc', 'jo', 'at', 'rm', 'gl', 'ef', 'fp', 'cl',
    'tt', 'fm', 'hb', 'tg', 'jd', 'ap', 'jó',
  ];

  // Full names (long, need exact match or near-exact)
  const fullNames = [
    'gênesis', 'genesis', 'êxodo', 'exodo', 'levítico', 'levitico',
    'números', 'numeros', 'deuteronômio', 'deuteronomio',
    'josué', 'josue', 'juízes', 'juizes',
    '1 samuel', '2 samuel', '1 reis', '2 reis',
    '1 crônicas', '1 cronicas', '2 crônicas', '2 cronicas',
    'esdras', 'neemias', 'ester',
    'salmos', 'salmo', 'provérbios', 'proverbios',
    'eclesiastes', 'cantares',
    'isaías', 'isaias', 'jeremias', 'lamentações', 'lamentacoes',
    'ezequiel', 'daniel', 'oseias', 'joel', 'amós', 'amos',
    'obadias', 'jonas', 'miqueias', 'naum', 'habacuque',
    'sofonias', 'ageu', 'zacarias', 'malaquias',
    'mateus', 'marcos', 'lucas', 'joão', 'joao', 'atos', 'romanos',
    '1 coríntios', '1 corintios', '2 coríntios', '2 corintios',
    'gálatas', 'galatas', 'efésios', 'efesios',
    'filipenses', 'colossenses',
    '1 tessalonicenses', '2 tessalonicenses',
    '1 timóteo', '1 timoteo', '2 timóteo', '2 timoteo',
    'tito', 'filemom', 'hebreus', 'tiago',
    '1 pedro', '2 pedro',
    '1 joão', '1 joao', '2 joão', '2 joao', '3 joão', '3 joao',
    'judas', 'apocalipse',
  ];

  // Build patterns for short abbreviations: "1 tm" → "1\\s+tm" (allow space)
  const shortPatterns = shortAbbrs.map(abbr => {
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // If it starts with a digit, allow optional space between digit and letters
    if (/^\d/.test(abbr)) {
      const digit = abbr[0];
      const rest = abbr.slice(1);
      return `${digit}\\s*${rest}`;
    }
    return escaped;
  });

  // Build patterns for full names
  const fullPatterns = fullNames.map(name => {
    return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });

  // Combine: short patterns first (longest first), then full names
  const allPatterns = [...shortPatterns, ...fullPatterns]
    .sort((a, b) => b.length - a.length);

  const bookGroup = allPatterns.join('|');

  // Chapter is OPTIONAL - allows matching "(1 Tm)" without chapter
  // If chapter is present, verse is optional; if verse is present, chapter is required
  return new RegExp(
    `(?:^|[^a-zA-Záàâãéèêíïóôõúüçñ])` +
    `(${bookGroup})` +
    `(?:\\s*(\\d{1,3})(?:\\s*:\\s*(\\d{1,3}(?:\\s*[-–—,]\\s*\\d{1,3})*))?)?` +
    `(?:\\))?` +
    `(?![a-zA-Záàâãéèêíïóôõúüçñ\\d])`,
    'gi'
  );
}

/**
 * Extract all biblical references from text
 */
export function extractReferences(text: string): ProcessedRef[] {
  const regex = buildRegex();
  const refs: ProcessedRef[] = [];
  const seen = new Set<string>();
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, bookRaw, chapterStr, verseSpec] = match;
    
    const book = resolveBook(bookRaw);
    if (!book) continue;
    
    // Chapter is optional — book-only refs like "(1 Tm)" are allowed
    const chapter = chapterStr ? parseInt(chapterStr) : 0;
    if (chapterStr && (isNaN(chapter) || chapter <= 0)) continue;
    
    let verses: number[] = [];
    let isRange = false;
    let startVerse = 1;
    let endVerse = 1;
    
    if (verseSpec) {
      const parsed = parseVerseSpec(verseSpec);
      verses = parsed.verses;
      isRange = parsed.isRange;
      startVerse = parsed.start;
      endVerse = parsed.end;
    }
    
    const ref: BibleRef = {
      raw: fullMatch.trim(),
      book,
      bookAbbr: bookRaw,
      chapter,
      verses,
      isRange,
      startVerse,
      endVerse,
    };
    
    // Validate
    const valid = validateRef(ref);
    
    // Deduplicate
    const key = `${book}:${chapter}:${verses.join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    refs.push({
      ...ref,
      id: `bib-ref-${refs.length}`,
      valid,
    });
  }
  
  return refs;
}

/**
 * Process HTML string: wrap biblical references in interactive spans
 * Preserves all original HTML structure, only adds <span> wrappers
 */
export function processHtmlWithReferences(html: string): { processed: string; refs: ProcessedRef[] } {
  // If already processed (has biblia-ref spans), return as-is
  if (html.includes('class="biblia-ref"') || html.includes("class='biblia-ref'")) {
    return { processed: html, refs: extractReferences(html) };
  }

  const refs = extractReferences(html);
  
  if (refs.length === 0) {
    return { processed: html, refs: [] };
  }
  
  let processed = html;
  
  // Process in reverse order to preserve indices
  // We need to find each reference in the HTML and wrap it
  // But we must be careful not to replace inside tags, attributes, or scripts
  
  // Strategy: split HTML into text nodes and tag nodes, only process text nodes
  const parts = splitHtmlIntoParts(processed);
  
  let refIndex = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.isTag) continue; // Skip HTML tags
    
    // Skip if this text is inside a span with biblia-ref or geo-ref class
    // (check by looking at preceding tags)
    
    // Process text content for references
    let textContent = part.content;
    let modified = false;
    
    const textRefs = extractReferences(textContent);
    if (textRefs.length > 0) {
      // Replace references in this text node
      const regex = buildRegex();
      let lastIndex = 0;
      let newText = '';
      
      let m: RegExpExecArray | null;
      while ((m = regex.exec(textContent)) !== null) {
        const book = resolveBook(m[1]);
        if (!book) continue;
        
        const chapter = parseInt(m[2]);
        if (isNaN(chapter) || chapter <= 0) continue;
        
        const verseSpec = m[3];
        let verses: number[] = [];
        let isRange = false;
        let startVerse = 1;
        let endVerse = 1;
        
        if (verseSpec) {
          const parsed = parseVerseSpec(verseSpec);
          verses = parsed.verses;
          isRange = parsed.isRange;
          startVerse = parsed.start;
          endVerse = parsed.end;
        }
        
        const valid = validateRef({ book, chapter, verses, isRange, startVerse, endVerse } as BibleRef);
        
        // Add text before match
        const match = m!;
        newText += textContent.slice(lastIndex, match.index);
        
        // Add wrapped reference
        const refData = refs.find(r => r.raw === match[0].trim()) || refs[refIndex];
        const refId = refData?.id || `bib-ref-${refIndex}`;
        refIndex++;
        
        newText += `<span class="biblia-ref" data-ref-id="${refId}" data-livro="${book}" data-capitulo="${chapter}" data-versiculos="${verses.join(',')}" data-valid="${valid}">${match[0].trim()}</span>`;
        
        lastIndex = match.index + match[0].length;
        modified = true;
      }
      
      if (modified) {
        newText += textContent.slice(lastIndex);
        parts[i] = { ...part, content: newText };
      }
    }
  }
  
  processed = parts.map(p => p.content).join('');
  
  return { processed, refs };
}

interface HtmlPart {
  content: string;
  isTag: boolean;
}

/**
 * Split HTML into alternating tag/text parts
 */
function splitHtmlIntoParts(html: string): HtmlPart[] {
  const parts: HtmlPart[] = [];
  let current = '';
  let inTag = false;
  
  for (let i = 0; i < html.length; i++) {
    const char = html[i];
    
    if (char === '<') {
      if (current) {
        parts.push({ content: current, isTag: inTag });
        current = '';
      }
      inTag = true;
      current = '<';
    } else if (char === '>' && inTag) {
      current += '>';
      parts.push({ content: current, isTag: true });
      current = '';
      inTag = false;
    } else {
      current += char;
    }
  }
  
  if (current) {
    parts.push({ content: current, isTag: inTag });
  }
  
  return parts;
}

export { BOOK_MAP, MAX_CHAPTERS };
