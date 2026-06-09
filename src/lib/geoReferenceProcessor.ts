/**
 * Geographic/Historical Reference Processor
 * Detects geo/historical references in HTML and creates interactive popups
 */
import { findGeoReferences, GEO_REFERENCES, type GeoRef } from './geoReferenceData';

const GEO_REF_ATTR = 'data-geo-id';
const GEO_REF_CLASS = 'geo-ref';

/**
 * Check if an index falls inside an HTML tag
 */
function isInsideTag(html: string, index: number): boolean {
  // Find the last < before this index
  let i = index - 1;
  while (i >= 0 && html[i] !== '<' && html[i] !== '>') i--;
  // If we found a < without a >, we're inside a tag
  return i >= 0 && html[i] === '<';
}

/**
 * Check if a reference is already wrapped in a span
 */
function isAlreadyWrapped(html: string, index: number, matchLen: number): boolean {
  // Check the 200 chars before to see if there's an opening span tag that hasn't been closed
  const searchStart = Math.max(0, index - 200);
  const before = html.substring(searchStart, index);
  
  // Count open vs closed span tags
  const openSpans = (before.match(/<span\b[^>]*>/gi) || []).length;
  const closeSpans = (before.match(/<\/span>/gi) || []).length;
  
  // If we have more opens than closes, we're inside a span
  if (openSpans > closeSpans) return true;
  
  // Check if there's a biblia-ref or geo-ref attribute nearby
  if (before.includes('data-ref-id="') || before.includes('data-geo-id="')) return true;
  
  return false;
}

/**
 * Process HTML to add geo reference markers
 * Returns processed HTML with clickable spans
 */
export function processGeoReferences(html: string): string {
  const refs = findGeoReferences(html);
  if (refs.length === 0) return html;

  // Sort by index descending to process from end to start (preserves indices)
  const sortedRefs = [...refs].sort((a, b) => b.index - a.index);
  
  let result = html;

  for (const { ref, match, index } of sortedRefs) {
    // Skip if we're inside an HTML tag
    if (isInsideTag(result, index)) continue;
    
    // Skip if already wrapped in a span
    if (isAlreadyWrapped(result, index, match.length)) continue;

    // Get the text around this match to check for duplicates
    const afterMatch = result.substring(index + match.length, index + match.length + 20);
    
    // Skip if the next characters look like they're part of a repeated word
    // e.g., "RomaRoma" - the second "Roma" starts immediately after
    if (/^[a-záàâãéèêíïóôõúüçñ]/i.test(afterMatch)) continue;

    // Build the replacement
    const before = result.substring(0, index);
    const after = result.substring(index + match.length);
    result = before + `<span ${GEO_REF_ATTR}="${ref.id}" class="${GEO_REF_CLASS}">${match}</span>` + after;
  }

  return result;
}

/**
 * Find all unique geo references that appear in the text
 */
export function getUniqueGeoRefs(text: string): GeoRef[] {
  const refs = findGeoReferences(text);
  const seen = new Set<string>();
  const unique: GeoRef[] = [];

  for (const { ref } of refs) {
    if (!seen.has(ref.id)) {
      seen.add(ref.id);
      unique.push(ref);
    }
  }

  return unique;
}

/**
 * Get a geo reference by its ID
 */
export function getGeoRefById(id: string): GeoRef | undefined {
  return GEO_REFERENCES.find(r => r.id === id);
}
