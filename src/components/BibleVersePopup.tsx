import React from 'react'
import { X, Bookmark, Copy, ChevronLeft, ChevronRight } from 'lucide-react'
import { useBibleData, VerseResult } from '../hooks/useBibleData'
import { BibleReaderPopup } from './BibleReaderPopup'

interface BibleVersePopupProps {
  book: string
  chapter: number
  verses: number[]
  onClose: () => void
  onOpenReader?: (book: string, chapter: number) => void
}

export function BibleVersePopup({ book, chapter, verses, onClose, onOpenReader }: BibleVersePopupProps) {
  const { getVerse, getChapter } = useBibleData()
  const [showReader, setShowReader] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const verseData = React.useMemo(() => {
    const data: VerseResult[] = []
    for (const v of verses) {
      const result = getVerse(book, chapter, v)
      if (result) data.push(result)
    }
    return data
  }, [book, chapter, verses, getVerse])

  const contextVerses = React.useMemo(() => {
    const start = Math.max(1, verses[0] - 3)
    const end = Math.min((getChapter(book, chapter)?.length || verses[verses.length - 1]) + 3, verses[verses.length - 1] + 3)
    const data: VerseResult[] = []
    for (let v = start; v <= end; v++) {
      if (!verses.includes(v)) {
        const result = getVerse(book, chapter, v)
        if (result) data.push(result)
      }
    }
    return data
  }, [book, chapter, verses, getVerse])

  const hasVerse = verseData.length > 0

  const handleCopy = async () => {
    const text = verseData.map(v => `${v.book} ${v.chapter}:${v.verse} — ${v.text}`).join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const refText = `${book} ${chapter}:${verses.length === 1 ? verses[0] : `${verses[0]}-${verses[verses.length - 1]}`}`

  return (
    <>
      <div className="bible-verse-overlay" onClick={onClose} />
      <div className="bible-verse-popup" role="dialog" aria-modal="true" aria-label={refText}>
        <div className="bible-verse-header">
          <span className="bible-verse-ref">{refText}</span>
          <div className="bible-verse-actions">
            <button
              className="bible-verse-btn"
              onClick={handleCopy}
              title="Copiar"
            >
              {copied ? <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>Copiado!</span> : <Copy size={16} />}
            </button>
            <button
              className="bible-verse-btn"
              onClick={() => setShowReader(true)}
              title="Abrir na Bíblia"
            >
              <Bookmark size={16} />
            </button>
            <button className="bible-verse-btn bible-verse-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="bible-verse-body">
          {hasVerse ? (
            <>
              {verseData.map((v, i) => (
                <p key={i} className="bible-verse-text">
                  <span className="bible-verse-number">{v.verse}</span>
                  {v.text}
                </p>
              ))}
              {contextVerses.length > 0 && (
                <>
                  <div className="bible-verse-context-divider" />
                  {contextVerses.map((v, i) => (
                    <p key={`ctx-${i}`} className="bible-verse-text bible-verse-context">
                      <span className="bible-verse-number">{v.verse}</span>
                      {v.text}
                    </p>
                  ))}
                </>
              )}
            </>
          ) : (
            <p className="bible-verse-not-found">
              Referência não encontrada em {refText}
            </p>
          )}
        </div>

        <div className="bible-verse-footer">
          <span className="bible-verse-version">Almeida Corrigida Fiel (ACF)</span>
        </div>
      </div>

      {showReader && (
        <BibleReaderPopup
          initialBook={book}
          initialChapter={chapter}
          onClose={() => setShowReader(false)}
        />
      )}
    </>
  )
}
