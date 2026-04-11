import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, ExternalLink, Maximize, Minimize, Search } from 'lucide-react';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configurando o worker do PDF.js (v4.x+ requer .mjs)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs?v=${Date.now()}`;

interface BookModalProps {
  book: {
    id: string;
    titulo: string;
    pdf_url: string;
  };
  onClose: () => void;
}

const BookModal: React.FC<BookModalProps> = ({ book, onClose }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);


  const modalRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleZoom = () => {
    setZoomLevel(prev => prev === 1 ? 1.5 : 1);
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        setZoomLevel(prev => Math.min(prev + 0.1, 2));
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        setZoomLevel(prev => Math.max(prev - 0.1, 1));
        e.preventDefault();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Erro ao carregar PDF:', error);
    setLoading(false);
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isFullscreen ? 0 : '1rem' }} onClick={onClose}>
      <div 
        ref={modalRef}
        className="modal-content" 
        style={{ 
          width: '100vw', 
          height: '100vh', 
          maxWidth: 'none', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: 0,
          background: '#000',
          overflow: 'hidden',
          position: 'relative',
          border: 'none',
          borderRadius: 0
        }} 
        onClick={e => e.stopPropagation()}
      >
        <header style={{ 
          padding: '1rem 2rem', 
          borderBottom: '1px solid rgba(255,255,255,0.1)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: '#0a0a0a'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{book.titulo}</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Visualizador Interno</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.6rem', background: zoomLevel > 1 ? 'var(--primary)' : 'transparent', color: '#fff' }} onClick={toggleZoom} title="Zoom">
              <Search size={20} />
            </button>
            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.6rem' }} onClick={toggleFullscreen} title="Tela Cheia">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }}></div>
            <a href={book.pdf_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ width: 'auto', padding: '0.6rem' }} title="Abrir Externo">
              <ExternalLink size={18} />
            </a>
            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.6rem', borderColor: 'var(--error)', color: 'var(--error)' }} onClick={onClose} title="Fechar">
              <X size={20} />
            </button>
          </div>
        </header>

        <div 
          className="modal-body" 
          style={{ 
            flex: 1, 
            position: 'relative', 
            background: '#1a1a1a', 
            overflow: 'auto',
            display: 'flex',
            alignItems: zoomLevel > 1 ? 'flex-start' : 'center',
            justifyContent: zoomLevel > 1 ? 'flex-start' : 'center',
            padding: '2rem'
          }}
        >
          {loading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100 }}>
              <Loader2 className="spinner" size={48} color="var(--primary)" />
            </div>
          )}



          <div style={{ 
            minWidth: '100%',
            minHeight: '100%',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: '2rem'
          }}>
            <Document
              file={book.pdf_url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<Loader2 className="spinner" size={32} />}
            >
              {numPages && (
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '2rem', 
                  alignItems: 'center',
                  width: '100%'
                }}
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <div key={`page_${index + 1}`} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)', background: '#fff' }}>
                    <Page 
                      pageNumber={index + 1} 
                      width={Math.round((isFullscreen ? 900 : 700) * zoomLevel * (window.innerWidth < 800 ? 0.9 : 1))} 
                      renderTextLayer={true} 
                      renderAnnotationLayer={false}
                      devicePixelRatio={2}
                    />
                  </div>
                ))}
              </div>
            )}
          </Document>
        </div>
        </div>
      </div>
    </div>
  );
};

export default BookModal;
