import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Volume2, Play, Pause, Square, RotateCcw, X } from 'lucide-react'

interface AudioReaderProps {
  contentSelector?: string
}

const AudioReader: React.FC<AudioReaderProps> = ({ contentSelector = '.lesson-content' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [status, setStatus] = useState('Pronto para ler')
  const [speed, setSpeed] = useState(1)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [progress, setProgress] = useState('')

  const synthRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const sentencesRef = useRef<string[]>([])
  const currentIndexRef = useRef(0)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const highlightElementsRef = useRef<HTMLElement[]>([])

  const getTextContent = useCallback(() => {
    const container = document.querySelector(contentSelector)
    if (!container) return ''

    const clone = container.cloneNode(true) as HTMLElement

    const removeSelectors = [
      '.leitor-panel', '.leitor-btn-flutuante',
      'script', 'style', 'nav', 'header', 'footer',
      '.ref-btn',
    ]
    removeSelectors.forEach(sel => {
      clone.querySelectorAll(sel).forEach(el => el.remove())
    })

    return (clone.textContent || '').replace(/\s+/g, ' ').trim()
  }, [contentSelector])

  const splitSentences = useCallback((text: string): string[] => {
    const raw = text.match(/[^.!?]+[.!?]+/g) || [text]
    return raw.map(s => s.trim()).filter(Boolean)
  }, [])

  const findContentElements = useCallback(() => {
    const container = document.querySelector(contentSelector)
    if (!container) return []
    const els = container.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th')
    return Array.from(els).filter(el => {
      if (el.closest('.leitor-panel') || el.closest('.leitor-btn-flutuante')) return false
      return (el.textContent || '').trim().length > 0
    })
  }, [contentSelector])

  const clearHighlight = useCallback(() => {
    highlightElementsRef.current.forEach(el => {
      el.style.background = ''
      el.style.borderRadius = ''
      el.style.transition = ''
    })
    highlightElementsRef.current = []
  }, [])

  const highlightSentence = useCallback((sentenceText: string) => {
    clearHighlight()
    const elements = findContentElements()
    for (const el of elements) {
      const text = (el.textContent || '').trim()
      if (sentenceText && text.includes(sentenceText.slice(0, 30))) {
        el.style.background = 'rgba(124, 58, 237, 0.15)'
        el.style.borderRadius = '4px'
        el.style.transition = 'background 0.3s'
        highlightElementsRef.current.push(el)
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    }
  }, [findContentElements, clearHighlight])

  const stopReading = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    setIsPlaying(false)
    setIsPaused(false)
    utteranceRef.current = null
    currentIndexRef.current = 0
    clearHighlight()
    setStatus('Parado')
    setProgress('')
  }, [clearHighlight])

  const readNextSentence = useCallback(() => {
    const sentences = sentencesRef.current
    const idx = currentIndexRef.current

    if (idx >= sentences.length) {
      stopReading()
      setStatus('Leitura concluída ✓')
      return
    }

    const text = sentences[idx]
    if (!text.trim()) {
      currentIndexRef.current++
      readNextSentence()
      return
    }

    setStatus(`Lendo… (${idx + 1}/${sentences.length})`)
    setProgress(`${idx + 1}/${sentences.length}`)
    highlightSentence(text)

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pt-BR'
    utterance.rate = speed

    if (selectedVoice) {
      const voice = voices.find(v => v.name === selectedVoice)
      if (voice) utterance.voice = voice
    }

    utterance.onend = () => {
      currentIndexRef.current++
      if (currentIndexRef.current < sentences.length) {
        readNextSentence()
      } else {
        stopReading()
        setStatus('Leitura concluída ✓')
      }
    }

    utterance.onerror = () => {
      stopReading()
      setStatus('Erro na leitura')
    }

    utteranceRef.current = utterance
    setIsPlaying(true)
    setIsPaused(false)
    synthRef.current?.speak(utterance)
  }, [speed, selectedVoice, voices, stopReading, highlightSentence])

  const togglePlay = useCallback(() => {
    const synth = synthRef.current
    if (!synth) return

    if (isPlaying && !isPaused) {
      synth.pause()
      setIsPaused(true)
      setStatus('Pausado')
      return
    }

    if (isPaused) {
      synth.resume()
      setIsPaused(false)
      setStatus(`Lendo… (${currentIndexRef.current + 1}/${sentencesRef.current.length})`)
      return
    }

    const text = getTextContent()
    if (!text) {
      setStatus('Nenhum texto encontrado')
      return
    }

    sentencesRef.current = splitSentences(text)
    currentIndexRef.current = 0
    readNextSentence()
  }, [isPlaying, isPaused, getTextContent, splitSentences, readNextSentence])

  const handleRestart = useCallback(() => {
    stopReading()
    const text = getTextContent()
    if (!text) return
    sentencesRef.current = splitSentences(text)
    currentIndexRef.current = 0
    readNextSentence()
  }, [stopReading, getTextContent, splitSentences, readNextSentence])

  useEffect(() => {
    synthRef.current = window.speechSynthesis
    return () => {
      if (synthRef.current) synthRef.current.cancel()
    }
  }, [])

  useEffect(() => {
    const synth = window.speechSynthesis
    const loadVoices = () => {
      const allVoices = synth.getVoices()
      const ptVoices = allVoices.filter(v => v.lang.startsWith('pt'))
      setVoices(ptVoices.length > 0 ? ptVoices : allVoices)
    }
    loadVoices()
    synth.addEventListener('voiceschanged', loadVoices)
    return () => synth.removeEventListener('voiceschanged', loadVoices)
  }, [])

  if (typeof window === 'undefined' || !window.speechSynthesis) return null

  return (
    <>
      <button
        className="leitor-btn-flutuante"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir leitor de áudio"
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '24px',
          zIndex: 998,
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: '50px',
          padding: '12px 20px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'transform 0.2s, boxShadow 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.45)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 58, 237, 0.35)'
        }}
      >
        <Volume2 size={20} />
        <span>Ouvir Lição</span>
      </button>

      {isOpen && (
        <div
          className="leitor-panel active"
          style={{
            position: 'fixed',
            bottom: '130px',
            right: '24px',
            zIndex: 999,
            background: '#fff',
            borderRadius: '16px',
            padding: '20px',
            width: '320px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#374151', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Volume2 size={16} color="#7c3aed" />
              Leitor de Áudio
            </h3>
            <button
              onClick={() => { if (isPlaying) stopReading(); setIsOpen(false) }}
              aria-label="Fechar"
              style={{ background: 'none', border: 'none', fontSize: '20px', color: '#9ca3af', cursor: 'pointer', lineHeight: 1, padding: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ fontSize: '13px', color: '#6b7280', minHeight: '18px' }}>
            {status}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={stopReading}
              disabled={!isPlaying}
              title="Parar"
              style={{
                width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', background: '#f3f4f6', color: '#374151',
                opacity: !isPlaying ? 0.4 : 1,
              }}
            >
              <Square size={16} />
            </button>
            <button
              onClick={togglePlay}
              title={isPlaying && !isPaused ? 'Pausar' : 'Ouvir'}
              style={{
                width: '52px', height: '52px', borderRadius: '50%', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', background: '#7c3aed', color: '#fff',
              }}
            >
              {isPlaying && !isPaused ? <Pause size={22} /> : <Play size={22} />}
            </button>
            <button
              onClick={handleRestart}
              disabled={!isPlaying && currentIndexRef.current === 0}
              title="Reiniciar"
              style={{
                width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', background: '#f3f4f6', color: '#374151',
                opacity: !isPlaying && currentIndexRef.current === 0 ? 0.4 : 1,
              }}
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
            <span style={{ fontSize: '14px' }}>🐢</span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speed}
              onChange={e => {
                const v = parseFloat(e.target.value)
                setSpeed(v)
                if (utteranceRef.current) utteranceRef.current.rate = v
              }}
              style={{ flex: 1, accentColor: '#7c3aed' }}
            />
            <span style={{ fontSize: '14px' }}>🐇</span>
            <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>
              {speed.toFixed(1)}x
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
            <span style={{ fontSize: '14px' }}>🗣</span>
            <select
              value={selectedVoice}
              onChange={e => setSelectedVoice(e.target.value)}
              style={{
                flex: 1, padding: '4px 8px', border: '1px solid #d1d5db',
                borderRadius: '6px', fontSize: '13px', color: '#374151', background: '#fff',
              }}
            >
              <option value="">Voz padrão</option>
              {voices.map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </>
  )
}

export default AudioReader
