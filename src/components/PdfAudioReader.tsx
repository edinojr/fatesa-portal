import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Volume2, Play, Pause, Square, RotateCcw, X, ChevronLeft, ChevronRight, FileAudio } from 'lucide-react'

interface PdfAudioReaderProps {
  /** Texto extraído do PDF (via pdfjs getTextContent) */
  pdfText: string
  /** Título opcional exibido no painel */
  title?: string
}

const PdfAudioReader: React.FC<PdfAudioReaderProps> = ({ pdfText, title = 'Leitura do PDF' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [status, setStatus] = useState('Pronto para ler')
  const [speed, setSpeed] = useState(1)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [currentParagraph, setCurrentParagraph] = useState(0)
  const [totalParagraphs, setTotalParagraphs] = useState(0)

  const synthRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const paragraphsRef = useRef<string[]>([])
  const currentIndexRef = useRef(0)

  const splitParagraphs = useCallback((text: string): string[] => {
    if (!text) return []
    // Divide por parágrafos (quebras duplas) — pdfjs separa páginas com \n\n
    const paragraphs = text.split(/\n{2,}/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean)
    // Agrupa parágrafos muito curtos para evitar entonação picotada
    const grouped: string[] = []
    let buffer = ''
    for (const p of paragraphs) {
      buffer = buffer ? buffer + ' ' + p : p
      // Quebra em ~280 chars ou ao final de sentenças fortes
      if (buffer.length >= 280 || /[.!?]\s*$/.test(buffer)) {
        grouped.push(buffer)
        buffer = ''
      }
    }
    if (buffer) grouped.push(buffer)
    return grouped.length > 0 ? grouped : paragraphs
  }, [])

  const stopReading = useCallback(() => {
    if (synthRef.current) synthRef.current.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    utteranceRef.current = null
    currentIndexRef.current = 0
    setCurrentParagraph(0)
    setStatus('Parado')
  }, [])

  const readNextParagraph = useCallback(() => {
    const paragraphs = paragraphsRef.current
    const idx = currentIndexRef.current

    if (idx >= paragraphs.length) {
      stopReading()
      setStatus('Leitura concluída ✓')
      return
    }

    const text = paragraphs[idx]
    if (!text.trim()) {
      currentIndexRef.current++
      readNextParagraph()
      return
    }

    setCurrentParagraph(idx + 1)
    setStatus(`Lendo parágrafo ${idx + 1} de ${paragraphs.length}`)

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pt-BR'
    utterance.rate = speed
    utterance.pitch = 1

    if (selectedVoice) {
      const voice = voices.find(v => v.name === selectedVoice)
      if (voice) utterance.voice = voice
    }

    utterance.onend = () => {
      currentIndexRef.current++
      if (currentIndexRef.current < paragraphsRef.current.length) {
        readNextParagraph()
      } else {
        stopReading()
        setStatus('Leitura concluída ✓')
      }
    }

    utterance.onerror = (e) => {
      console.warn('Erro na síntese de voz:', e)
      stopReading()
      setStatus('Erro na leitura')
    }

    utteranceRef.current = utterance
    setIsPlaying(true)
    setIsPaused(false)
    synthRef.current?.speak(utterance)
  }, [speed, selectedVoice, voices, stopReading])

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
      setStatus(`Lendo parágrafo ${currentIndexRef.current + 1} de ${paragraphsRef.current.length}`)
      return
    }

    if (!pdfText || pdfText.trim().length === 0) {
      setStatus('Aguardando extração do texto do PDF…')
      return
    }

    paragraphsRef.current = splitParagraphs(pdfText)
    setTotalParagraphs(paragraphsRef.current.length)
    currentIndexRef.current = 0
    readNextParagraph()
  }, [isPlaying, isPaused, pdfText, splitParagraphs, readNextParagraph])

  const handleRestart = useCallback(() => {
    stopReading()
    if (!pdfText) return
    paragraphsRef.current = splitParagraphs(pdfText)
    setTotalParagraphs(paragraphsRef.current.length)
    currentIndexRef.current = 0
    readNextParagraph()
  }, [stopReading, pdfText, splitParagraphs, readNextParagraph])

  const skipParagraph = useCallback((direction: 'next' | 'prev') => {
    if (!isPlaying) return
    const synth = synthRef.current
    if (synth) synth.cancel()

    if (direction === 'next') {
      currentIndexRef.current = Math.min(paragraphsRef.current.length - 1, currentIndexRef.current + 1)
    } else {
      currentIndexRef.current = Math.max(0, currentIndexRef.current - 1)
    }
    readNextParagraph()
  }, [isPlaying, readNextParagraph])

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

  const hasText = pdfText && pdfText.trim().length > 0

  return (
    <>
      {/* Botão flutuante — só aparece quando há texto do PDF */}
      {hasText && (
        <button
          className="pdf-audio-floating-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Ouvir PDF"
          title="Ouvir PDF em áudio"
        >
          <FileAudio size={22} />
        </button>
      )}

      {isOpen && (
        <div className="pdf-audio-panel">
          <div className="pdf-audio-header">
            <h3>
              <Volume2 size={16} />
              {title}
            </h3>
            <button
              onClick={() => { if (isPlaying) stopReading(); setIsOpen(false) }}
              aria-label="Fechar"
              className="pdf-audio-close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="pdf-audio-status">
            {status}
            {isPlaying && totalParagraphs > 0 && (
              <div className="pdf-audio-progress">
                <div
                  className="pdf-audio-progress-bar"
                  style={{ width: `${(currentParagraph / totalParagraphs) * 100}%` }}
                />
              </div>
            )}
          </div>

          <div className="pdf-audio-controls">
            <button
              onClick={() => skipParagraph('prev')}
              disabled={!isPlaying}
              title="Parágrafo anterior"
              className="pdf-audio-btn-secondary"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={stopReading}
              disabled={!isPlaying}
              title="Parar"
              className="pdf-audio-btn-secondary"
            >
              <Square size={16} />
            </button>
            <button
              onClick={togglePlay}
              title={isPlaying && !isPaused ? 'Pausar' : 'Ouvir'}
              className="pdf-audio-btn-primary"
            >
              {isPlaying && !isPaused ? <Pause size={22} /> : <Play size={22} />}
            </button>
            <button
              onClick={handleRestart}
              disabled={!isPlaying && currentIndexRef.current === 0}
              title="Reiniciar"
              className="pdf-audio-btn-secondary"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => skipParagraph('next')}
              disabled={!isPlaying}
              title="Próximo parágrafo"
              className="pdf-audio-btn-secondary"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="pdf-audio-speed">
            <span>🐢</span>
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
            />
            <span>🐇</span>
            <span className="pdf-audio-speed-value">{speed.toFixed(1)}x</span>
          </div>

          <div className="pdf-audio-voice">
            <span>🗣️</span>
            <select
              value={selectedVoice}
              onChange={e => setSelectedVoice(e.target.value)}
            >
              <option value="">Voz padrão (pt-BR)</option>
              {voices.map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <style>{`
        .pdf-audio-floating-btn {
          position: fixed;
          bottom: 2rem;
          left: 2rem;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
          transition: all 0.25s ease;
          z-index: 998;
        }
        .pdf-audio-floating-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 28px rgba(124, 58, 237, 0.55);
        }
        .pdf-audio-panel {
          position: fixed;
          bottom: 5rem;
          left: 2rem;
          z-index: 999;
          background: var(--bg-dark, #0f0f1a);
          border-radius: 18px;
          padding: 1.25rem;
          width: 330px;
          max-width: calc(100vw - 2rem);
          box-shadow: 0 12px 48px rgba(0,0,0,0.45);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
          animation: slideUp 0.25s ease-out;
        }
        .pdf-audio-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pdf-audio-header h3 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text, #fff);
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .pdf-audio-header h3 svg { color: #7c3aed; }
        .pdf-audio-close {
          background: none;
          border: none;
          color: var(--text-muted, #9ca3af);
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
        }
        .pdf-audio-close:hover { color: var(--text, #fff); }
        .pdf-audio-status {
          font-size: 0.8rem;
          color: var(--text-muted, #9ca3af);
          min-height: 2.5rem;
        }
        .pdf-audio-progress {
          margin-top: 0.5rem;
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
          overflow: hidden;
        }
        .pdf-audio-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #a855f7);
          transition: width 0.3s ease;
          border-radius: 2px;
        }
        .pdf-audio-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
        }
        .pdf-audio-btn-primary {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #7c3aed;
          color: #fff;
          transition: transform 0.15s;
        }
        .pdf-audio-btn-primary:hover { transform: scale(1.08); }
        .pdf-audio-btn-primary:active { transform: scale(0.95); }
        .pdf-audio-btn-secondary {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.06);
          color: var(--text, #fff);
          transition: background 0.15s;
        }
        .pdf-audio-btn-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
        .pdf-audio-btn-secondary:disabled { opacity: 0.35; cursor: not-allowed; }
        .pdf-audio-speed, .pdf-audio-voice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--text-muted, #9ca3af);
        }
        .pdf-audio-speed input[type="range"] {
          flex: 1;
          accent-color: #7c3aed;
        }
        .pdf-audio-speed-value {
          min-width: 32px;
          text-align: center;
          font-weight: 700;
          color: var(--text, #fff);
        }
        .pdf-audio-voice select {
          flex: 1;
          padding: 0.3rem 0.5rem;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          font-size: 0.8rem;
          color: var(--text, #fff);
          background: var(--bg-dark, #0f0f1a);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .pdf-audio-panel {
            width: calc(100vw - 2rem);
            left: 1rem;
            bottom: 4rem;
          }
          .pdf-audio-floating-btn {
            left: 1rem;
            bottom: 1.5rem;
          }
        }
      `}</style>
    </>
  )
}

export default PdfAudioReader
