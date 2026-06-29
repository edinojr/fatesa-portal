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

  const textoRomanPattern = /^Texto\s+([IVXLCDM]+)(\.\s+)?(.*)/i;

  // Use DOMParser for reliable HTML manipulation
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // 1. Find all potential headers (h1-h4)
  const headers = doc.querySelectorAll('h1, h2, h3, h4');
  headers.forEach((header) => {
    const text = header.textContent?.trim() || '';
    const hasSecaoClass = header.classList.contains('secao-titulo-menu');
    const matchesPattern = textoRomanPattern.test(text);
    const hasTopicoId = header.id && header.id.includes('-topico-');
    
    if (!hasSecaoClass && !matchesPattern && !hasTopicoId) return;
    
    let id = header.getAttribute('id');
    if (!id) {
      id = `nav-${idCounter++}`;
      header.setAttribute('id', id);
    }
    
    toc.push({
      id,
      label: text,
      level: parseInt(header.tagName[1]),
      isMainSection: true,
    });
  });
  
  // 2. Find paragraphs and divs that match the pattern
  const blocks = doc.querySelectorAll('p, div');
  blocks.forEach((block) => {
    const textContent = block.textContent?.trim() || '';
    if (!textoRomanPattern.test(textContent)) return;
    
    // Avoid adding if it's a wrapper for a header we already added
    if (block.querySelector('h1, h2, h3, h4')) return;

    // CRITICAL: Avoid adding if this is a wrapper for another matching block (p or div)
    // This prevents the "Double Text" effect where a div captures its children's text
    const children = block.querySelectorAll('p, div');
    for (const child of children) {
      if (textoRomanPattern.test(child.textContent?.trim() || '')) {
        return; // Skip this parent block
      }
    }

    const id = `nav-${idCounter++}`;
    block.setAttribute('id', id);
    toc.push({
      id,
      label: textContent,
      level: 2,
      isMainSection: true,
    });
  });

  // 2.5 Remove Esboço da Lição and Bibliografia
  const removeSections = () => {
    const blocks = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div'));
    
    // Process Bibliografia (usually at the end, remove it and everything after)
    const biblioBlock = blocks.find(b => doc.body.contains(b) && /^\s*bibliografia\s*$/i.test(b.textContent?.trim() || ''));
    if (biblioBlock) {
      let target = biblioBlock;
      while (target.parentElement && target.parentElement !== doc.body && target.parentElement.textContent?.trim() === biblioBlock.textContent?.trim()) {
        target = target.parentElement;
      }
      let sibling = target.nextElementSibling;
      while (sibling) {
        const next = sibling.nextElementSibling;
        sibling.remove();
        sibling = next;
      }
      target.remove();
    }

    // Process Esboço da Lição
    const esbocoBlock = blocks.find(b => doc.body.contains(b) && /^\s*esbo[çc]o\s+d[ea]\s+li[çc][ãa]o\s*$/i.test(b.textContent?.trim() || ''));
    if (esbocoBlock) {
      let target = esbocoBlock;
      while (target.parentElement && target.parentElement !== doc.body && target.parentElement.textContent?.trim() === esbocoBlock.textContent?.trim()) {
        target = target.parentElement;
      }
      
      const toDelete = [target];
      let sibling = target.nextElementSibling;
      const isHeader = /^H[1-6]$/i.test(target.tagName);
      const headerLevel = isHeader ? parseInt(target.tagName[1]) : 99;

      while (sibling) {
        if (/^H[1-6]$/i.test(sibling.tagName)) {
           const sibLevel = parseInt(sibling.tagName[1]);
           if (sibLevel <= headerLevel) break; // Next major section
        } else if (!isHeader) {
           // If target was P/DIV, stop at first element that strongly looks like the real lesson start
           // e.g. "Texto 1" or "1. Introdução" or a Header
           if (/^H[1-6]$/i.test(sibling.tagName)) break;
           const text = sibling.textContent?.trim() || '';
           if (/^\s*(?:Texto\s+\d+|Texto\s+[IVXLCDM]+)/i.test(text)) break;
           // If it's a very long paragraph, it's probably the lesson, not the esboço
           if (text.length > 200) break;
        }
        toDelete.push(sibling);
        sibling = sibling.nextElementSibling;
      }
      toDelete.forEach(n => n.remove());
    }
  };

  removeSections();
  
  // Remove all images from the content
  const images = doc.querySelectorAll('img');
  images.forEach(img => img.remove());
  
  // 3. Extract styles from <head> to ensure they are not lost

  const styles = Array.from(doc.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');

  let bodyHtml = doc.body.innerHTML;

  // 4. Heuristic to fix raw CSS accidentally pasted as text at the top of the body
  const rawCssMatch = bodyHtml.match(/^\s*(?:\.[a-zA-Z0-9_-]+|#[a-zA-Z0-9_-]+|body|html)\s*\{[^}]+\}/i);
  if (rawCssMatch) {
    const firstNode = doc.body.childNodes[0];
    if (firstNode && firstNode.nodeType === Node.TEXT_NODE) {
       const text = firstNode.textContent || '';
       if (/^\s*(?:\.[a-zA-Z0-9_-]+|#[a-zA-Z0-9_-]+|body|html)\s*\{/i.test(text)) {
           const styleEl = doc.createElement('style');
           styleEl.textContent = text;
           doc.body.replaceChild(styleEl, firstNode);
           bodyHtml = doc.body.innerHTML;
       }
    }
  }

    // 5. Re-evaluate TOC to remove deleted items and deduplicate labels
    const seenLabels = new Set<string>();
    const finalToc = toc.filter(item => {
      const el = doc.getElementById(item.id);
      if (!el || !doc.body.contains(el)) return false;
      
      const label = item.label.trim();
      if (!label) return false;

      // Normalize label: remove numeral prefixes, collapse whitespace, lowercase
      const normalized = label
        .replace(/^Texto\s+[IVXLCDM\d]+(\.\s+)?[-–]?\s*/i, '')
        .replace(/^[IVXLCDM\d]+\.\s+/i, '')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();

      if (!normalized) return true;

      // 1. Direct Duplicate Check (Exact normalized match)
      if (seenLabels.has(normalized)) return false;

      // 2. "Corrupted" Duplicate Check (e.g., "Title Title")
      // If the original label contains the normalized text twice, it's a duplication error
      const lowerLabel = label.toLowerCase();
      const occurrences = lowerLabel.split(normalized).length - 1;
      if (occurrences > 1) return false;

      // 3. Containment Check (Fuzzy duplicate)
      // If this label is a significant subset of an already seen label, or vice-versa
      for (const seen of seenLabels) {
        if ((normalized.length > 10 && seen.includes(normalized)) || 
            (normalized.length > 10 && normalized.includes(seen))) {
          return false;
        }
      }

      seenLabels.add(normalized);
      return true;
    });

  return { 
    processedHtml: styles + '\n' + bodyHtml, 
    toc: finalToc 
  };
}
