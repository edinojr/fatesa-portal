import React, { useState, useMemo, useCallback } from 'react'
import { X, Search, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { useBibleData, VerseResult, BibleBook } from '../hooks/useBibleData'

interface BibleReaderPopupProps {
  onClose: () => void
  initialBook?: string
  initialChapter?: number
}

const OT_BOOKS = [
  'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio',
  'Josué', 'Juízes', 'Rute', 'I Samuel', 'II Samuel',
  'I Reis', 'II Reis', 'I Crônicas', 'II Crônicas',
  'Esdras', 'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios',
  'Eclesiastes', 'Cantares', 'Isaías', 'Jeremias',
  'Lamentações', 'Ezequiel', 'Daniel', 'Oseias', 'Joel', 'Amós',
  'Obadias', 'Jonas', 'Miquéias', 'Naum', 'Habacuque', 'Sofonias',
  'Ageu', 'Zacarias', 'Malaquias',
]

const NT_BOOKS = [
  'Mateus', 'Marcos', 'Lucas', 'João', 'Atos',
  'Romanos', 'I Coríntios', 'II Coríntios', 'Gálatas',
  'Efésios', 'Filipenses', 'Colossenses', 'I Tessalonicenses',
  'II Tessalonicenses', 'I Timóteo', 'II Timóteo',
  'Tito', 'Filemom', 'Hebreus', 'Tiago', 'I Pedro',
  'II Pedro', 'I João', 'II João', 'III João',
  'Judas', 'Apocalipse',
]

function jsonKeyToDisplay(key: string): string {
  const map: Record<string, string> = {
    'Gênesis': 'Gênesis', 'Êxodo': 'Êxodo', 'Levítico': 'Levítico',
    'Números': 'Números', 'Deuteronômio': 'Deuteronômio',
    'Josué': 'Josué', 'Juízes': 'Juízes', 'Rute': 'Rute',
    'I Samuel': 'I Samuel', 'II Samuel': 'II Samuel',
    'I Reis': 'I Reis', 'II Reis': 'II Reis',
    'I Crônicas': 'I Crônicas', 'II Crônicas': 'II Crônicas',
    'Esdras': 'Esdras', 'Neemias': 'Neemias', 'Ester': 'Ester',
    'Jó': 'Jó', 'Salmos': 'Salmos', 'Provérbios': 'Provérbios',
    'Eclesiastes': 'Eclesiastes', 'Cantares': 'Cantares',
    'Isaías': 'Isaías', 'Jeremias': 'Jeremias',
    'Lamentações': 'Lamentações', 'Ezequiel': 'Ezequiel',
    'Daniel': 'Daniel', 'Oseias': 'Oseias', 'Joel': 'Joel',
    'Amós': 'Amós', 'Obadias': 'Obadias', 'Jonas': 'Jonas',
    'Miquéias': 'Miquéias', 'Naum': 'Naum', 'Habacuque': 'Habacuque',
    'Sofonias': 'Sofonias', 'Ageu': 'Ageu', 'Zacarias': 'Zacarias',
    'Malaquias': 'Malaquias',
    'Mateus': 'Mateus', 'Marcos': 'Marcos', 'Lucas': 'Lucas',
    'João': 'João', 'Atos': 'Atos',
    'Romanos': 'Romanos', 'I Coríntios': 'I Coríntios',
    'II Coríntios': 'II Coríntios', 'Gálatas': 'Gálatas',
    'Efésios': 'Efésios', 'Filipenses': 'Filipenses',
    'Colossenses': 'Colossenses', 'I Tessalonicenses': 'I Tessalonicenses',
    'II Tessalonicenses': 'II Tessalonicenses',
    'I Timóteo': 'I Timóteo', 'II Timóteo': 'II Timóteo',
    'Tito': 'Tito', 'Filemom': 'Filemom', 'Hebreus': 'Hebreus',
    'Tiago': 'Tiago', 'I Pedro': 'I Pedro', 'II Pedro': 'II Pedro',
    'I João': 'I João', 'II João': 'II João', 'III João': 'III João',
    'Judas': 'Judas', 'Apocalipse': 'Apocalipse',
  }
  return map[key] || key
}

export function BibleReaderPopup({ onClose, initialBook, initialChapter }: BibleReaderPopupProps) {
  const { data, loading, getChapter, searchVerses } = useBibleData()
  const [selectedBook, setSelectedBook] = useState<string>(initialBook || OT_BOOKS[0])
  const [selectedChapter, setSelectedChapter] = useState<number>(initialChapter || 1)
  const [tab, setTab] = useState<'books' | 'search'>('books')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<VerseResult[]>([])
  const [searching, setSearching] = useState(false)
  const [testament, setTestament] = useState<'ot' | 'nt'>('ot')

  const currentBooks = useMemo(() => {
    return testament === 'ot' ? OT_BOOKS : NT_BOOKS
  }, [testament])

  const bookData = useMemo(() => {
    if (!data) return null
    return data[selectedBook] || null
  }, [data, selectedBook])

  const chapterText = useMemo(() => {
    if (!bookData) return null
    return bookData[selectedChapter - 1] || null
  }, [bookData, selectedChapter])

  const totalChapters = bookData?.length || 0

  useMemo(() => {
    if (!initialBook && OT_BOOKS.includes(selectedBook)) {
      setTestament('ot')
    }
  }, [initialBook, selectedBook])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    const results = await searchVerses(searchQuery)
    setSearchResults(results)
    setSearching(false)
  }, [searchQuery, searchVerses])

  const handleBookSelect = useCallback((book: string) => {
    setSelectedBook(book)
    setSelectedChapter(1)
    setTab('books')
  }, [])

  const handleVerseClick = useCallback((book: string, chapter: number) => {
    setSelectedBook(book)
    setSelectedChapter(chapter)
    setTab('books')
    setSearchQuery('')
    setSearchResults([])
  }, [])

  return (
    <div className="bible-reader-overlay" onClick={onClose}>
      <div className="bible-reader-popup" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Leitor Bíblico">
        <div className="bible-reader-header">
          <div className="bible-reader-title">
            <BookOpen size={20} />
            <span>Bíblia ACF</span>
          </div>
          <button className="bible-reader-close" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="bible-reader-tabs">
          <button
            className={`bible-reader-tab ${tab === 'books' ? 'active' : ''}`}
            onClick={() => setTab('books')}
          >
            <BookOpen size={16} /> Livros
          </button>
          <button
            className={`bible-reader-tab ${tab === 'search' ? 'active' : ''}`}
            onClick={() => setTab('search')}
          >
            <Search size={16} /> Buscar
          </button>
        </div>

        {tab === 'search' ? (
          <div className="bible-reader-search-panel">
            <div className="bible-reader-search-input">
              <input
                type="text"
                placeholder="Pesquisar na Bíblia..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                autoFocus
              />
              <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                <Search size={18} />
              </button>
            </div>
            <div className="bible-reader-search-results">
              {searching ? (
                <p className="bible-reader-search-status">Buscando...</p>
              ) : searchResults.length > 0 ? (
                searchResults.map((r, i) => (
                  <div
                    key={i}
                    className="bible-reader-search-item"
                    onClick={() => handleVerseClick(r.book, r.chapter)}
                  >
                    <span className="bible-reader-search-ref">
                      {r.book} {r.chapter}:{r.verse}
                    </span>
                    <span className="bible-reader-search-text">{r.text}</span>
                  </div>
                ))
              ) : searchQuery && !searching ? (
                <p className="bible-reader-search-status">Nenhum resultado encontrado.</p>
              ) : (
                <p className="bible-reader-search-status">Digite uma palavra ou frase para buscar na Bíblia.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bible-reader-content">
            <div className="bible-reader-sidebar">
              <div className="bible-reader-testament-tabs">
                <button
                  className={`bible-reader-testament-tab ${testament === 'ot' ? 'active' : ''}`}
                  onClick={() => { setTestament('ot'); setSelectedBook(OT_BOOKS[0]); setSelectedChapter(1) }}
                >
                  AT
                </button>
                <button
                  className={`bible-reader-testament-tab ${testament === 'nt' ? 'active' : ''}`}
                  onClick={() => { setTestament('nt'); setSelectedBook(NT_BOOKS[0]); setSelectedChapter(1) }}
                >
                  NT
                </button>
              </div>
              <div className="bible-reader-book-list">
                {currentBooks.map(bookName => {
                  const isActive = bookName === selectedBook
                  return (
                    <button
                      key={bookName}
                      className={`bible-reader-book-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleBookSelect(bookName)}
                    >
                      {bookName}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bible-reader-main">
              <div className="bible-reader-chapter-nav">
                <button
                  className="bible-reader-chapter-btn"
                  onClick={() => setSelectedChapter(Math.max(1, selectedChapter - 1))}
                  disabled={selectedChapter <= 1}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="bible-reader-chapter-title">
                  {selectedBook} — Capítulo {selectedChapter}
                </span>
                <button
                  className="bible-reader-chapter-btn"
                  onClick={() => setSelectedChapter(Math.min(totalChapters, selectedChapter + 1))}
                  disabled={selectedChapter >= totalChapters}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="bible-reader-chapter-select">
                {Array.from({ length: totalChapters }, (_, i) => i + 1).map(ch => (
                  <button
                    key={ch}
                    className={`bible-reader-chapter-num ${ch === selectedChapter ? 'active' : ''}`}
                    onClick={() => setSelectedChapter(ch)}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              <div className="bible-reader-text">
                {loading ? (
                  <p className="bible-reader-loading">Carregando...</p>
                ) : chapterText ? (
                  chapterText.map((verse, i) => (
                    <p key={i} className="bible-reader-verse">
                      <span className="bible-reader-verse-num">{i + 1}</span>
                      {verse}
                    </p>
                  ))
                ) : (
                  <p className="bible-reader-loading">Conteúdo não disponível.</p>
                )}
              </div>

              <div className="bible-reader-footer-info">
                Almeida Corrigida Fiel (ACF) — Versículo(s) por capítulo: {chapterText?.length || 0}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
