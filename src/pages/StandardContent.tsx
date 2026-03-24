import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Loader2, 
  Maximize, 
  Minimize, 
  FileText,
  BookOpen,
  CheckCircle2,
  Award,
  ClipboardList
} from 'lucide-react';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configurando o worker do PDF.js localmente via Vite
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const StandardContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // 1. Hooks de Estado
  const [book, setBook] = useState<any>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'pdf' | 'epub'>('pdf');
  const [rendition, setRendition] = useState<any>(null);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const [nextLesson, setNextLesson] = useState<any>(null);
  const [relatedActivities, setRelatedActivities] = useState<any[]>([]);

  // 2. Refs
  const viewerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const epubContainerRef = useRef<HTMLDivElement>(null);

  // 3. Memos e Variáveis Calculadas
  const pageWidth = Math.floor(containerWidth * 0.95);
  const pdfOptions = useMemo(() => ({
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
  }), []);

  const pdfUrl = useMemo(() => {
    if (!book) return null;
    return book.pdf_url || book.arquivo_url || book.url;
  }, [book]);

  // 4. Effects
  useEffect(() => {
    fetchBook();
    const handleResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'f' || e.key === 'F') && viewerRef.current) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    if (viewMode === 'epub' && book?.epub_url) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/epub.js/0.3.88/epub.min.js";
      script.async = true;
      script.onload = () => {
        if ((window as any).ePub && epubContainerRef.current) {
          const ebook = (window as any).ePub(book.epub_url);
          const rend = ebook.renderTo(epubContainerRef.current, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "default"
          });
          rend.display();
          setRendition(rend);
        }
      };
      document.head.appendChild(script);
    }
  }, [viewMode, book]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // 5. Handlers
  const fetchBook = async () => {
    try {
      const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || "");
      const isAula = searchParams.get('type') === 'aula';
      const table = isAula ? 'aulas' : 'livros';
      
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) {
        console.error('Error fetching content data:', error);
        throw error;
      }
      console.log('Content loaded successfully:', data);
      setBook(data);
      
      const hasPdf = data.pdf_url || data.arquivo_url || data.url;
      if (!hasPdf && data.epub_url) {
        setViewMode('epub');
      }

      // Buscar atividades e próxima aula se for lição
      if (isAula) {
        // Atividades relacionadas (mesmo pai)
        const { data: acts } = await supabase
          .from('aulas')
          .select('*')
          .eq('parent_aula_id', data.parent_aula_id)
          .in('tipo', ['atividade', 'prova'])
          .order('ordem', { ascending: true });
        setRelatedActivities(acts || []);

        // Próxima aula (mesmo livro, ordem superior)
        const { data: next } = await supabase
          .from('aulas')
          .select('*')
          .eq('livro_id', data.livro_id)
          .gt('ordem', data.ordem || 0)
          .not('tipo', 'in', '(atividade,prova,licao)')
          .order('ordem', { ascending: true })
          .limit(1)
          .maybeSingle();
        setNextLesson(next);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    const elem = viewerRef.current as any;
    if (!elem) return;

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err: any) => console.error(err));
        setIsFullscreen(true);
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
        setIsFullscreen(true);
      } else {
        // Fallback para iPhone: Pseudo-Fullscreen
        setIsPseudoFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
      setIsPseudoFullscreen(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // 6. Retornos Antecipados
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
        <Loader2 className="spinner" size={48} color="var(--primary)" />
      </div>
    );
  }

  // Novo estado para módulos/lições sem arquivo
  if (!book || (!pdfUrl && !book.epub_url)) {
    return (
      <div ref={viewerRef} style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', color: '#fff', overflow: 'hidden' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1.5rem', background: '#0f0f0f', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
              <ChevronLeft size={18} /> Painel
            </button>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }}></div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{book?.titulo || 'Módulo'}</h3>
          </div>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}>
            <X size={20} />
          </button>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <div style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', padding: '3rem', borderRadius: '24px', maxWidth: '600px', width: '100%' }}>
            <BookOpen size={48} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ marginBottom: '1rem', color: '#fff' }}>{book?.titulo}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              {book?.tipo === 'licao' ? 'Este é um módulo introdutório. Utilize o menu abaixo para acessar as aulas e atividades.' : 'Esta lição não possui conteúdo para visualização direta.'}
            </p>
            {nextLesson && (
              <button 
                onClick={() => {
                  setLoading(true);
                  navigate(`/book/${nextLesson.id}?type=aula`);
                  window.location.reload();
                }} 
                className="btn btn-primary"
                style={{ width: 'auto', padding: '0.8rem 2rem' }}
              >
                Começar Aula: {nextLesson.titulo} <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 7. Renderização Principal
  const isAnyFullscreen = isFullscreen || isPseudoFullscreen;

  return (
    <div 
      ref={viewerRef} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: isPseudoFullscreen ? '100vh' : '100dvh',
        width: isPseudoFullscreen ? '100vw' : '100%',
        position: isPseudoFullscreen ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        zIndex: isPseudoFullscreen ? 9999 : 1,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}
          >
            <ChevronLeft size={18} /> Painel
          </button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }}></div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{book.titulo}</h3>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="viewer-header-desktop-only" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
            Visualizador Protegido
          </span>
          <button onClick={toggleFullscreen} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}>
            {isAnyFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}>
            <X size={20} />
          </button>
        </div>
      </header>

      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', background: viewMode === 'epub' ? '#fff' : '#0a0a0a' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
          {viewMode === 'pdf' && pdfUrl ? (
            <Document 
              file={pdfUrl} 
              onLoadSuccess={onDocumentLoadSuccess} 
              onLoadError={(e) => console.error('PDF Load Error:', e)}
              loading={<Loader2 className="spinner" />}
              options={pdfOptions}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
                {Array.from(new Array(numPages || 0), (_, index) => (
                  <div key={`page_${index + 1}`} style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.7)', background: '#fff' }}>
                    <Page 
                      pageNumber={index + 1} 
                      width={isAnyFullscreen ? Math.min(window.innerWidth * 0.95, 1200) : pageWidth} 
                      renderTextLayer={true} 
                      renderAnnotationLayer={false}
                    />
                  </div>
                ))}
              </div>
            </Document>
          ) : (
            <div id="epub-viewer" ref={epubContainerRef} style={{ width: '100%', height: 'calc(100vh - 120px)', background: '#fff' }}></div>
          )}
        </div>

        {/* Seção de Final de Aula / Exercícios */}
        <div style={{ maxWidth: '900px', margin: '0 auto 4rem auto', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <CheckCircle2 color="var(--success)" size={28} /> Aula Concluída!
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: relatedActivities.length > 0 ? '1fr 1fr' : '1fr', gap: '2rem' }}>
            {relatedActivities.length > 0 && (
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exercícios Disponíveis</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {relatedActivities.map(act => (
                    <button 
                      key={act.id}
                      onClick={() => navigate(`/lesson/${act.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#fff', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                    >
                      {act.tipo === 'prova' ? <Award size={18} color="#EAB308" /> : <ClipboardList size={18} color="var(--success)" />}
                      <span style={{ fontWeight: 600 }}>{act.titulo}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: relatedActivities.length > 0 ? 'flex-start' : 'center' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próximo Passo</h4>
              {nextLesson ? (
                <button 
                  onClick={() => {
                    setLoading(true);
                    navigate(`/book/${nextLesson.id}?type=aula`);
                    window.location.reload();
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', maxWidth: '400px', padding: '1.25rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <span style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 400 }}>Próxima Aula</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{nextLesson.titulo}</div>
                    </span>
                    <ChevronRight size={24} />
                  </div>
                </button>
              ) : (
                <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{ width: '100%', maxWidth: '400px' }}>
                  Voltar ao Painel
                </button>
              )}
            </div>
          </div>
        </div>

        {viewMode === 'epub' && (
          <div style={{ display: 'flex', padding: '1rem', gap: '1rem', justifyContent: 'center', background: '#f0f0f0' }}>
            <button onClick={() => rendition?.prev()} className="btn btn-outline" style={{ width: 'auto' }}><ChevronLeft size={24} /></button>
            <button onClick={() => rendition?.next()} className="btn btn-outline" style={{ width: 'auto' }}><ChevronRight size={24} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StandardContent;
