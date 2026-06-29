import { useState, useEffect, useCallback } from 'react'

type BibleData = Record<string, string[][]>

const BOOK_NAME_MAP: Record<string, string> = {
  '1Samuel': 'I Samuel', '2Samuel': 'II Samuel',
  '1Reis': 'I Reis', '2Reis': 'II Reis',
  '1Crônicas': 'I Crônicas', '2Crônicas': 'II Crônicas',
  '1Coríntios': 'I Coríntios', '2Coríntios': 'II Coríntios',
  '1Tessalonicenses': 'I Tessalonicenses', '2Tessalonicenses': 'II Tessalonicenses',
  '1Timóteo': 'I Timóteo', '2Timóteo': 'II Timóteo',
  '1Pedro': 'I Pedro', '2Pedro': 'II Pedro',
  '1João': 'I João', '2João': 'II João', '3João': 'III João',
}

const REVERSE_BOOK_MAP: Record<string, string> = {}
for (const [k, v] of Object.entries(BOOK_NAME_MAP)) {
  REVERSE_BOOK_MAP[v] = k
}
REVERSE_BOOK_MAP['Cantares'] = 'Cantares'

function normalizeBookName(name: string): string {
  const mapped = BOOK_NAME_MAP[name]
  if (mapped) return mapped
  if (name in REVERSE_BOOK_MAP) return name

  const rev = REVERSE_BOOK_MAP[name]
  if (rev) return name

  return name
}

function toJsonKey(name: string): string {
  const m = BOOK_NAME_MAP[name]
  if (m) return m
  const r = REVERSE_BOOK_MAP[name]
  if (r) return name
  return name
}

let cachedData: BibleData | null = null
let cachedPromise: Promise<BibleData> | null = null

async function loadBibleData(): Promise<BibleData> {
  if (cachedData) return cachedData
  if (cachedPromise) return cachedPromise

  cachedPromise = fetch('/bible-acf.json')
    .then(r => {
      if (!r.ok) throw new Error('Failed to load Bible data')
      return r.json()
    })
    .then(data => {
      cachedData = data as BibleData
      return cachedData
    })

  return cachedPromise
}

export interface VerseResult {
  book: string
  chapter: number
  verse: number
  text: string
}

export interface BibleBook {
  name: string
  chapters: number
}

export function useBibleData() {
  const [data, setData] = useState<BibleData | null>(cachedData)
  const [loading, setLoading] = useState(!cachedData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cachedData) {
      setData(cachedData)
      setLoading(false)
      return
    }

    loadBibleData()
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const getVerse = useCallback((book: string, chapter: number, verse: number): VerseResult | null => {
    if (!data) return null
    const jsonKey = toJsonKey(book)
    const bookData = data[jsonKey]
    if (!bookData) return null

    const chapterData = bookData[chapter - 1]
    if (!chapterData) return null

    const verseText = chapterData[verse - 1]
    if (!verseText) return null

    return { book, chapter, verse, text: verseText }
  }, [data])

  const getChapter = useCallback((book: string, chapter: number): string[] | null => {
    if (!data) return null
    const jsonKey = toJsonKey(book)
    const bookData = data[jsonKey]
    if (!bookData) return null

    const chapterData = bookData[chapter - 1]
    if (!chapterData) return null

    return chapterData
  }, [data])

  const getBooks = useCallback((): BibleBook[] => {
    if (!data) return []
    return Object.entries(data).map(([name, chapters]) => ({
      name,
      chapters: chapters.length,
    }))
  }, [data])

  const searchVerses = useCallback((query: string): VerseResult[] => {
    if (!data || !query.trim()) return []

    const results: VerseResult[] = []
    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean)

    for (const [jsonKey, chapters] of Object.entries(data)) {
      if (!chapters) continue
      for (let c = 0; c < chapters.length; c++) {
        const chapter = chapters[c]
        if (!chapter) continue
        for (let v = 0; v < chapter.length; v++) {
          const text = chapter[v]
          if (!text) continue
          const lower = text.toLowerCase()
          if (searchTerms.every(term => lower.includes(term))) {
            results.push({
              book: jsonKey,
              chapter: c + 1,
              verse: v + 1,
              text,
            })
          }
        }
      }
    }

    return results.slice(0, 100)
  }, [data])

  return { data, loading, error, getVerse, getChapter, getBooks, searchVerses }
}

export { loadBibleData }
