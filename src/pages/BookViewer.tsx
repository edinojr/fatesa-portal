import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Loader2, 
  Search, 
  Maximize, 
  Minimize, 
  Edit, 
  ExternalLink,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import HTMLFlipBook from 'react-pageflip';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configurando o worker do PDF.js (Novo padrão .mjs)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BookViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHighlighterActive, setIsHighlighterActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const bookRef = useRef<any>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const isMobile = containerWidth <= 768;
  // Leitura Single-Page Segura: usamos 95% do espaço total da tela para evitar erros de responsividade
  const availableWidth = containerWidth * 0.95;
  const basePageWidth = containerWidth ? containerWidth * 0.95 : 0;
  const pageWidth = Math.round(basePageWidth);
  const pageHeight = Math.round(pageWidth * 1.41); // proporção A4

  useEffect(() => {
    fetchBook();
    const handleResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  const fetchBook = async () => {
    try {
      const { data, error } = await supabase.from('livros').select('*').eq('id', id).single();
      if (error) throw error;
      setBook(data);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar o livro.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleHighlighter = () => {
    setIsHighlighterActive(prev => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        bookRef.current?.pageFlip().flipNext();
      } else if (e.key === 'ArrowLeft') {
        bookRef.current?.pageFlip().flipPrev();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log('PDF carregado com sucesso! Páginas:', numPages);
    setNumPages(numPages);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Erro detalhado ao carregar PDF:', error);
    alert('Erro ao processar o arquivo PDF: ' + error.message);
  }

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#111' }}><Loader2 className="spinner" size={48} color="var(--primary)" /></div>;

  if (!book || !book.pdf_url) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', height: '100vh', background: '#111', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Conteúdo não disponível</h2>
        <p style={{ color: 'var(--text-muted)' }}>Este livro ainda não possui um arquivo PDF anexado.</p>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ marginTop: '2rem', width: 'auto' }}>Voltar ao Painel</button>
      </div>
    );
  }

  return (
    <div 
      ref={viewerRef}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        background: '#0a0a0a', 
        color: '#fff',
        overflow: 'hidden'
      }}
    >
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '0.75rem 1.5rem', 
        background: '#0f0f0f', 
        alignItems: 'center', 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        zIndex: 100
      }}>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}
        >
          <ChevronLeft size={20} /> Painel
        </button>
        
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, textAlign: 'center', flex: 1, padding: '0 1rem' }}>
          {book.titulo}
        </h3>
        
        <button 
          onClick={toggleFullscreen}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.8 }}
          title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
        >
          {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
        </button>
      </header>

      <div 
        ref={scrollContainerRef}
        style={{ 
        flex: 1, 
        overflowY: 'auto',
        overflowX: 'hidden', // Oculta a barra lateral fantasma
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Os cursores de navegação foram removidos a pedido do usuário para experiência uniforme de arraste/toque em todas as telas */}

          <div 
          className={`fatesa-flipbook-wrapper ${isHighlighterActive ? 'highlighter-mode' : ''}`}
          style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            margin: 'auto 0',
            padding: isMobile ? '2rem 0 2rem' : '1rem 0 2rem',
            width: '100%',
            minHeight: 'min-content',
            transition: 'all 0.3s ease-in-out'
          }}>
          <Document
            file={book.pdf_url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            onSourceError={(err) => console.error('Erro na fonte do PDF:', err)}
            loading={<Loader2 className="spinner" size={48} color="var(--primary)" />}
          >
            {numPages && (
              // @ts-ignore
              <HTMLFlipBook 
                width={pageWidth} 
                height={pageHeight} 
                size="fixed"
                minWidth={200}
                maxWidth={pageWidth}
                minHeight={300}
                maxHeight={pageHeight}
                maxShadowOpacity={0.5}
                showCover={false}
                usePortrait={true}
                mobileScrollSupport={true}
                useMouseEvents={false} // Prevents "Cannot read properties of undefined (reading 'x')" crash
                onFlip={(e: any) => {
                  setCurrentPage(e.data);
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                showPageCorners={false}
                disableFlipByClick={false}
                startPage={currentPage}
                ref={bookRef}
                key={`${book.id}-${containerWidth}`}
                className="fatesa-flipbook"
                style={{ boxShadow: '0 30px 100px rgba(0,0,0,0.8)', margin: '0 auto' }}
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <div key={`page_${index + 1}`} className="page" style={{ background: '#fff', overflow: 'hidden' }}>
                    <Page 
                      pageNumber={index + 1} 
                      width={pageWidth} 
                      renderTextLayer={true} 
                      renderAnnotationLayer={false} 
                      devicePixelRatio={Math.max(window.devicePixelRatio || 1, 2)}
                    />
                  </div>
                ))}
              </HTMLFlipBook>
            )}
          </Document>
        </div>

        {/* Botão Próximo também removido */}

        {!numPages && !loading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <p style={{ marginBottom: '1rem' }}>Não foi possível carregar o visualizador interativo.</p>
            <a href={book.pdf_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ width: 'auto' }}>
              Abrir PDF em nova aba
            </a>
          </div>
        )}

        {/* Barra de navegação colocada EXCLUSIVAMENTE no fim do fluxo da página */}
        {numPages && (
          <div style={{
            display: 'flex',
            padding: '0.25rem 0 0.5rem', /* Rodapé esmagado (-75%) */
            gap: '0.5rem',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 'auto'
          }}>
            <button 
              onClick={() => bookRef.current?.pageFlip().flipPrev()} 
              className="book-nav-btn"
              title="Página Anterior"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={() => bookRef.current?.pageFlip().flipNext()} 
              className="book-nav-btn"
              title="Próxima Página"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .btn-icon {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.3);
        }
        .nav-btn:hover {
          background: var(--primary) !important;
          border-color: var(--primary) !important;
          transform: translateY(-50%) scale(1.1) !important;
          box-shadow: 0 0 20px var(--primary-glow);
        }
        .highlighter-mode {
          user-select: text !important;
        }
        .highlighter-mode .react-pdf__Page__textContent {
          cursor: text !important;
        }
        .book-nav-btn {
          flex: none;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 50%; /* Bolinhas discretas */
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          transition: all 0.2s;
        }
        .book-nav-btn:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.9);
        }
        .book-nav-btn:active {
          background: rgba(255,255,255,0.1);
          transform: scale(0.95);
        }
        /* Responsivo */
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          /* Centraliza e zera o deslocamento de desktop */
          .fatesa-flipbook-wrapper {
            transform: none !important;
            justify-content: center !important;
            padding: 2rem 1rem 6rem !important;
            min-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BookViewer;
