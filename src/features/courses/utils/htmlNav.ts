export interface NavItem {
  id: string;
  label: string;
  level: number;
  isMainSection: boolean;
}

/**
 * Processes HTML content to find "navigable" sections and inject IDs into them.
 * It looks for <h1>-<h4> tags and elements starting with Roman or Arabic numerals.
 */
export function processHtmlForNav(html: string): { processedHtml: string; toc: NavItem[] } {
  const toc: NavItem[] = [];
  let idCounter = 0;

  const romanNumeralPattern = /^([IVXLCDM]+\.\s+)(.*)/i;
  const arabicNumeralPattern = /^(\d+\.\s+)(.*)/i;
  const textoRomanPattern = /^Texto\s+([IVXLCDM]+)(\.\s+)?(.*)/i;
  const textoArabicPattern = /^Texto\s+(\d+)(\.\s+)?(.*)/i;

  // Use DOMParser for reliable HTML manipulation
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // 1. Find all potential headers (h1-h4)
  const headers = doc.querySelectorAll('h1, h2, h3, h4');
  headers.forEach((header) => {
    const text = header.textContent?.trim() || '';
    const isMain = romanNumeralPattern.test(text) || 
                   arabicNumeralPattern.test(text) || 
                   textoRomanPattern.test(text) || 
                   textoArabicPattern.test(text);
    
    const id = `nav-${idCounter++}`;
    header.setAttribute('id', id);
    toc.push({
      id,
      label: text,
      level: parseInt(header.tagName[1]),
      isMainSection: isMain,
    });
  });

  // 2. Find paragraphs and divs that start with numerals (and aren't already processed as headers)
  const blocks = doc.querySelectorAll('p, div');
  blocks.forEach((block) => {
    const textContent = block.textContent?.trim() || '';
    
    if (romanNumeralPattern.test(textContent) || 
        arabicNumeralPattern.test(textContent) || 
        textoRomanPattern.test(textContent) || 
        textoArabicPattern.test(textContent)) {
      
      // Avoid adding if it's a wrapper for a header we already added
      if (block.querySelector('h1, h2, h3, h4')) return;

      const id = `nav-${idCounter++}`;
      block.setAttribute('id', id);
      toc.push({
        id,
        label: textContent,
        level: 2,
        isMainSection: true,
      });
    }
  });

  return { 
    processedHtml: doc.body.innerHTML, 
    toc 
  };
}
