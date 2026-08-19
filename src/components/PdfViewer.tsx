import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import {
  ChevronLeft, ChevronRight, X, Loader2, Maximize, Minimize,
  ZoomIn, ZoomOut, FileText, ExternalLink, ScrollText, LayoutGrid
} from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export interface PdfViewerHandle {
  /** Avança uma página do PDF. Retorna true se avançou, false se já está na última página. */
  nextPage: () => boolean
  /** Volta uma página do PDF. Retorna true se voltou, false se já está na primeira página. */
  prevPage: () => boolean
  /** Página atual (1-indexed) */
  currentPage: () => number
  /** Total de páginas */
  totalPages: () => number
}

interface PdfViewerProps {
  url: string
  height?: string
  initialFullscreen?: boolean
  /** Modo imersivo: sem bordas/cantos arredondados, ocupa toda a largura, toolbar compacta */
  immersive?: boolean
  /** Disponibiliza o texto extraído do PDF para leitores externos (ex: AudioReader) */
  onTextExtracted?: (text: string) => void
  /** Notifica o parent sobre mudanças de página (página atual, total, se é a última) */
  onPageChange?: (page: number, total: number, isLast: boolean) => void
}

const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>((
  {
    url,
    height = '80vh',
    initialFullscreen = false,
    immersive = false,
    onTextExtracted,
    onPageChange
  },
  ref
) => {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1.0)
  const [viewType, setViewType] = useState<'single' | 'scroll'>('single')
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen)
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false)
  const [containerWidth, setContainerWidth] = useState(800)
  const [inputPage, setInputPage] = useState('1')
  const [textExtracting, setTextExtracting] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pdfDocumentRef = useRef<any>(null)

  const normalizedUrl = useMemo(() => {
    if (!url) return url
    if (url.includes('/storage/v1/object/') && !url.includes('/storage/v1/object/public/')) {
      return url.replace('/storage/v1/object/', '/storage/v1/object/public/')
    }
    return url
  }, [url])

  const isAnyFullscreen = isFullscreen || isPseudoFullscreen

  const pdfOptions = useMemo(() => ({
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    disableRange: false,
    disableStream: false,
    disableAutoFetch: false
  }), [])

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isAnyFullscreen])

  const pageWidth = useMemo(() => {
    const base = containerWidth > 0 ? containerWidth : window.innerWidth
    const factor = isAnyFullscreen ? 0.92 : (immersive ? 0.99 : 0.98)
    return Math.floor(Math.max(320, base * factor) * scale)
  }, [containerWidth, scale, isAnyFullscreen, immersive])

  const onDocumentLoadSuccess = useCallback(async (pdf: any) => {
    setNumPages(pdf.numPages)
    setLoading(false)
    setError(null)
    pdfDocumentRef.current = pdf
    if (onTextExtracted) {
      setTextExtracting(true)
      try {
        const text = await extractAllText(pdf)
        onTextExtracted(text)
      } catch (e) {
        console.warn('Falha ao extrair texto do PDF:', e)
      } finally {
        setTextExtracting(false)
      }
    }
  }, [onTextExtracted])

  const onDocumentLoadError = useCallback((err: any) => {
    console.error('PDF load error:', err)
    setError('Não foi possível carregar o PDF. Verifique sua conexão ou abra em nova aba.')
    setLoading(false)
  }, [])

  const extractAllText = async (pdf: any): Promise<string> => {
    const pages: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const text = content.items
          .map((item: any) => (item.str ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        if (text) pages.push(text)
      } catch (e) {
        // pular páginas sem texto extraível (ex: imagens escaneadas)
      }
    }
    return pages.join('\n\n')
  }

  const handlePageNext = useCallback((): boolean => {
    let advanced = false
    setPageNumber(prev => {
      if (prev >= numPages) return prev
      const next = Math.min(numPages, prev + 1)
      setInputPage(String(next))
      advanced = true
      return next
    })
    if (advanced && scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    return advanced
  }, [numPages])

  const handlePagePrev = useCallback((): boolean => {
    let receded = false
    setPageNumber(prev => {
      if (prev <= 1) return prev
      const prevPage = Math.max(1, prev - 1)
      setInputPage(String(prevPage))
      receded = true
      return prevPage
    })
    if (receded && scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    return receded
  }, [])

  // Expõe métodos imperativos para o parent (Lesson.tsx)
  useImperativeHandle(ref, () => ({
    nextPage: handlePageNext,
    prevPage: handlePagePrev,
    currentPage: () => pageNumber,
    totalPages: () => numPages
  }), [handlePageNext, handlePagePrev, pageNumber, numPages])

  // Notifica o parent sobre mudanças de página (para habilitar "Próxima" → próxima lição)
  useEffect(() => {
    if (onPageChange && numPages > 0) {
      onPageChange(pageNumber, numPages, pageNumber >= numPages)
    }
  }, [pageNumber, numPages, onPageChange])

  const handlePageInput = (val: string) => {
    setInputPage(val)
    const num = parseInt(val)
    if (!isNaN(num) && num >= 1 && num <= numPages) {
      setPageNumber(num)
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const zoomIn = () => setScale(s => Math.min(3, +(s + 0.25).toFixed(2)))
  const zoomOut = () => setScale(s => Math.max(0.5, +(s - 0.25).toFixed(2)))
  const resetZoom = () => setScale(1.0)

  const toggleFullscreen = useCallback(() => {
    const elem = viewerRef.current as any
    if (!elem) return

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err: any) => console.error(err))
        setIsFullscreen(true)
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen()
        setIsFullscreen(true)
      } else {
        setIsPseudoFullscreen(true)
      }
    } else {
      if (document.exitFullscreen) document.exitFullscreen()
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen()
      setIsFullscreen(false)
      setIsPseudoFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        setIsFullscreen(false)
        setIsPseudoFullscreen(false)
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen() }
      if (viewType === 'single') {
        if (e.key === 'ArrowRight') { e.preventDefault(); handlePageNext() }
        if (e.key === 'ArrowLeft') { e.preventDefault(); handlePagePrev() }
      }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn() }
      if (e.key === '-') { e.preventDefault(); zoomOut() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleFullscreen, viewType, handlePageNext, handlePagePrev])

  useEffect(() => {
    if (viewType === 'scroll' && numPages > 0 && scrollContainerRef.current) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const page = parseInt(entry.target.getAttribute('data-page') || '1')
            setPageNumber(page)
            setInputPage(String(page))
          }
        })
      }, { threshold: 0.5 })
      const containers = scrollContainerRef.current.querySelectorAll('.pdf-page-container')
      containers.forEach(c => observer.observe(c))
      return () => observer.disconnect()
    }
  }, [viewType, numPages])

  if (error) {
    return (
      <div style={{
        width: '100%', minHeight: '400px', background: 'var(--glass)',
        borderRadius: '16px', border: '1px solid var(--glass-border)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '3rem', textAlign: 'center', gap: '1rem'
      }}>
        <FileText size={48} color="var(--primary)" style={{ opacity: 0.5 }} />
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{error}</p>
        <a href={normalizedUrl} target="_blank" rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ width: 'auto', display: 'inline-flex', gap: '0.5rem', textDecoration: 'none' }}>
          <ExternalLink size={18} /> Abrir PDF em nova aba
        </a>
      </div>
    )
  }

  return (
    <div
      ref={viewerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: isAnyFullscreen ? '100vh' : height,
        minHeight: isAnyFullscreen ? '100vh' : '500px',
        background: isAnyFullscreen ? '#1a1a1a' : (immersive ? '#12121a' : 'var(--glass)'),
        borderRadius: isAnyFullscreen || immersive ? '0' : '16px',
        overflow: 'hidden',
        border: immersive ? 'none' : '1px solid var(--glass-border)',
        position: isPseudoFullscreen ? 'fixed' as const : 'relative' as const,
        top: isPseudoFullscreen ? 0 : 'auto',
        left: isPseudoFullscreen ? 0 : 'auto',
        zIndex: isPseudoFullscreen ? 9999 : 'auto'
      }}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
        padding: immersive ? '0.4rem 0.75rem' : '0.6rem 1rem',
        background: isAnyFullscreen ? 'rgba(0,0,0,0.4)' : (immersive ? 'rgba(15,15,26,0.6)' : 'rgba(255,255,255,0.03)'),
        borderBottom: '1px solid var(--glass-border)',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* View mode toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
            <button
              onClick={() => setViewType('single')}
              title="Visualização por página"
              style={{
                padding: '0.35rem 0.7rem', border: 'none', cursor: 'pointer',
                background: viewType === 'single' ? 'var(--primary)' : 'transparent',
                color: viewType === 'single' ? '#fff' : 'var(--text-muted)',
                borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem',
                fontSize: '0.75rem', transition: 'all 0.2s'
              }}
            >
              <LayoutGrid size={14} /> <span className="mobile-hide">Página</span>
            </button>
            <button
              onClick={() => setViewType('scroll')}
              title="Rolagem contínua"
              style={{
                padding: '0.35rem 0.7rem', border: 'none', cursor: 'pointer',
                background: viewType === 'scroll' ? 'var(--primary)' : 'transparent',
                color: viewType === 'scroll' ? '#fff' : 'var(--text-muted)',
                borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem',
                fontSize: '0.75rem', transition: 'all 0.2s'
              }}
            >
              <ScrollText size={14} /> <span className="mobile-hide">Scroll</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
            <button onClick={zoomOut} title="Diminuir zoom"
              style={{ padding: '0.35rem', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
            >
              <ZoomOut size={15} />
            </button>
            <button onClick={resetZoom} title="Resetar zoom"
              style={{ padding: '0.3rem 0.5rem', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, minWidth: '48px' }}
            >
              {Math.round(scale * 100)}%
            </button>
            <button onClick={zoomIn} title="Aumentar zoom"
              style={{ padding: '0.35rem', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
            >
              <ZoomIn size={15} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Page indicator */}
          {!loading && numPages > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pág</span>
              <input type="number" value={inputPage} onChange={(e) => handlePageInput(e.target.value)}
                min={1} max={numPages}
                style={{ background: 'transparent', border: 'none', color: 'var(--text)', width: '38px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ {numPages}</span>
            </div>
          )}

          {textExtracting && (
            <span style={{ fontSize: '0.7rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Loader2 size={12} className="spinner" /> Preparando áudio…
            </span>
          )}

          <a href={normalizedUrl} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba"
            style={{ padding: '0.4rem', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
          >
            <ExternalLink size={16} />
          </a>
          <button onClick={toggleFullscreen} title="Tela cheia (F)"
            style={{ padding: '0.4rem', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
          >
            {isAnyFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          {isAnyFullscreen && (
            <button onClick={toggleFullscreen} title="Sair"
              style={{ padding: '0.4rem', border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* PDF content */}
      <div ref={scrollContainerRef} style={{
        flex: 1, overflowY: 'auto', overflowX: 'auto',
        padding: immersive ? '0.5rem 0' : '1rem 0.5rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: isAnyFullscreen ? '#1a1a1a' : (immersive ? '#12121a' : 'transparent')
      }}>
        <div ref={containerRef} style={{ width: '100%', maxWidth: immersive ? '100%' : '1200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem' }}>
              <Loader2 size={36} className="spinner" color="var(--primary)" />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Carregando PDF…</p>
            </div>
          )}
          <Document
            file={normalizedUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
            options={pdfOptions}
          >
            {viewType === 'scroll' ? (
              Array.from(new Array(numPages), (_, index) => (
                <div key={`page_${index + 1}`} data-page={index + 1} className="pdf-page-container"
                  style={{ marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', borderRadius: '4px', overflow: 'hidden', background: '#fff' }}
                >
                  <Page
                    pageNumber={index + 1}
                    width={pageWidth}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={<div style={{ width: pageWidth, height: pageWidth * 1.4, background: 'rgba(255,255,255,0.05)' }} />}
                  />
                </div>
              ))
            ) : (
              <div className="pdf-page-shadow"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)', borderRadius: '4px', overflow: 'hidden', background: '#fff' }}
              >
                <Page
                  pageNumber={pageNumber}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={<div style={{ width: pageWidth, height: pageWidth * 1.4, background: 'rgba(255,255,255,0.05)' }} />}
                />
              </div>
            )}
          </Document>
        </div>
      </div>

      {/* Footer navigation (single page mode) */}
      {viewType === 'single' && !loading && numPages > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center',
          padding: '0.6rem 1rem',
          background: isAnyFullscreen ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.03)',
          borderTop: '1px solid var(--glass-border)'
        }}>
          <button onClick={handlePagePrev} disabled={pageNumber <= 1}
            className="btn btn-outline"
            style={{ width: 'auto', padding: '0.45rem 1.1rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: pageNumber <= 1 ? 0.3 : 1 }}
          >
            <ChevronLeft size={16} /> <span className="mobile-hide">Anterior</span>
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: '70px', textAlign: 'center' }}>
            {pageNumber} / {numPages}
          </span>
          <button onClick={handlePageNext} disabled={pageNumber >= numPages}
            className="btn btn-outline"
            style={{ width: 'auto', padding: '0.45rem 1.1rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: pageNumber >= numPages ? 0.3 : 1 }}
          >
            <span className="mobile-hide">Próxima</span> <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
})

PdfViewer.displayName = 'PdfViewer'

export default PdfViewer
