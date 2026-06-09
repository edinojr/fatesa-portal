import { BibleRef } from './bibleParser';

// Verse cache to avoid repeated API calls
const verseCache = new Map<string, string | null>();

// ACF Atualizada data source - we'll use the bible-api.com with ARA as closest available
// The ARA (Almeida Revista e Atualizada) is the closest publicly available translation to ACF
const API_BASE = 'https://bible-api.com';

/**
 * Fetch verse text from the Bible API
 * Uses ARA (Almeida Revista e Atualizada) as closest available to ACF Atualizada
 */
export async function fetchVerse(ref: BibleRef): Promise<string | null> {
  const cacheKey = `${ref.book}:${ref.chapter}:${ref.verses.join(',')}`;
  
  if (verseCache.has(cacheKey)) {
    return verseCache.get(cacheKey) || null;
  }
  
  try {
    // Build the reference string for the API
    const bookName = ref.book;
    const chapter = ref.chapter;
    
    let verseStr = '';
    if (ref.verses.length > 0) {
      if (ref.isRange && ref.verses.length > 2) {
        // Range like 16-18
        verseStr = `:${ref.startVerse}-${ref.endVerse}`;
      } else if (ref.verses.length === 1) {
        verseStr = `:${ref.verses[0]}`;
      } else {
        // Multiple specific verses
        verseStr = `:${ref.verses.join(',')}`;
      }
    }
    
    const query = `${bookName} ${chapter}${verseStr}`;
    const url = `${API_BASE}/${encodeURIComponent(query)}?translation=ara`;
    
    const response = await fetch(url);
    if (!response.ok) {
      verseCache.set(cacheKey, null);
      return null;
    }
    
    const data = await response.json();
    
    if (data.error) {
      verseCache.set(cacheKey, null);
      return null;
    }
    
    // Extract verse text
    let text = '';
    if (data.text) {
      text = data.text.trim();
    } else if (data.verses && Array.isArray(data.verses)) {
      text = data.verses.map((v: any) => v.text?.trim()).filter(Boolean).join('\n');
    }
    
    if (text) {
      verseCache.set(cacheKey, text);
      return text;
    }
    
    verseCache.set(cacheKey, null);
    return null;
  } catch (err) {
    console.error('Error fetching verse:', err);
    verseCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Fetch multiple verses (for context: 5 before + 5 after)
 */
export async function fetchContext(ref: BibleRef): Promise<{ before: string; main: string; after: string } | null> {
  try {
    const mainText = await fetchVerse(ref);
    if (!mainText) return null;
    
    // Fetch context (5 verses before and after)
    const contextBefore: string[] = [];
    const contextAfter: string[] = [];
    
    // Before (5 verses)
    for (let i = 1; i <= 5; i++) {
      const v = ref.startVerse - i;
      if (v <= 0) break;
      
      const beforeRef: BibleRef = {
        ...ref,
        verses: [v],
        isRange: false,
        startVerse: v,
        endVerse: v,
      };
      
      const text = await fetchVerse(beforeRef);
      if (text) contextBefore.unshift(`${ref.book} ${ref.chapter}:${v} — ${text}`);
    }
    
    // After (5 verses)
    for (let i = 1; i <= 5; i++) {
      const v = ref.endVerse + i;
      const maxChapter = 150; // We'll validate this later
      if (v > maxChapter) break;
      
      const afterRef: BibleRef = {
        ...ref,
        verses: [v],
        isRange: false,
        startVerse: v,
        endVerse: v,
      };
      
      const text = await fetchVerse(afterRef);
      if (text) contextAfter.push(`${ref.book} ${ref.chapter}:${v} — ${text}`);
    }
    
    return {
      before: contextBefore.join('\n'),
      main: `${ref.book} ${ref.chapter}:${ref.startVerse}${ref.isRange ? '-' + ref.endVerse : ''} — ${mainText}`,
      after: contextAfter.join('\n'),
    };
  } catch (err) {
    console.error('Error fetching context:', err);
    return null;
  }
}

/**
 * Fetch complete chapter
 */
export async function fetchChapter(book: string, chapter: number): Promise<string | null> {
  const cacheKey = `chapter:${book}:${chapter}`;
  
  if (verseCache.has(cacheKey)) {
    return verseCache.get(cacheKey) || null;
  }
  
  try {
    const url = `${API_BASE}/${encodeURIComponent(`${book} ${chapter}`)}?translation=ara`;
    
    const response = await fetch(url);
    if (!response.ok) {
      verseCache.set(cacheKey, null);
      return null;
    }
    
    const data = await response.json();
    
    if (data.error || !data.text) {
      verseCache.set(cacheKey, null);
      return null;
    }
    
    const text = data.text.trim();
    verseCache.set(cacheKey, text);
    return text;
  } catch (err) {
    console.error('Error fetching chapter:', err);
    verseCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
}
