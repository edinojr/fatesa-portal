import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Loader2, 
  Maximize, 
  Minimize, 
  CheckCircle2,
  Award,
  ClipboardList,
  BookOpen
} from 'lucide-react';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Worker is pre-configured in src/main.tsx for v1.3

const StandardContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 1. Hooks de Estado
  const [data, setData] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'pdf' | 'epub'>('pdf');
  const [rendition, setRendition] = useState<any>(null);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const [nextLesson, setNextLesson] = useState<any>(null);
  const [relatedActivities, setRelatedActivities] = useState<any[]>([]);

  // Otimização v1.4
  const [viewType, setViewType] = useState<'scroll' | 'single'>('single'); // Padrão single para ser leve

  // 2. Refs
  const viewerRef = useRef<HTMLDivElement>(null);
  const epubContainerRef = useRef<HTMLDivElement>(null);

  // 3. Memos e Variáveis Calculadas
  const pageWidth = Math.floor(containerWidth * 0.95);
  const isAnyFullscreen = isFullscreen || isPseudoFullscreen;

  const pdfOptions = useMemo(() => ({
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    disableRange: false,
    disableStream: false,
    disableAutoFetch: false
  }), []);

  const pdfUrl = useMemo(() => {
    if (!data) return null;
    const url = data.pdf_url || data.arquivo_url || data.url;
    console.log('PDF URL resolved:', url);
    return url;
  }, [data]);


  // 4. Effects
  useEffect(() => {
    console.log('Fatesa StandardContent v1.4 Init (Production Mode)');
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
    if (viewMode === 'epub' && data?.epub_url) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/epub.js/0.3.88/epub.min.js";
      script.async = true;
      script.onload = () => {
        if ((window as any).ePub && epubContainerRef.current) {
          const ebook = (window as any).ePub(data.epub_url);
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
  }, [viewMode, data]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // 5. Handlers
  const fetchBook = async () => {
    try {
      // Suporte robusto a BrowserRouter e HashRouter legado
      const searchStr = location.search || window.location.search || window.location.hash.split('?')[1] || "";
      const searchParams = new URLSearchParams(searchStr);
      const isAula = searchParams.get('type') === 'aula';
      const table = isAula ? 'aulas' : 'livros';
      
      const { data: res, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      
      setData(res);
      
      const hasPdf = res.pdf_url || res.arquivo_url || res.url;
      if (!hasPdf && res.epub_url) {
        setViewMode('epub');
      }

      if (isAula) {
        // Atividades relacionadas
        const { data: acts } = await supabase
          .from('aulas')
          .select('*')
          .eq('parent_aula_id', res.parent_aula_id)
          .in('tipo', ['atividade', 'prova'])
          .order('ordem', { ascending: true });
        setRelatedActivities(acts || []);

        // Próxima aula - Usando filtros individuais para evitar erro 400
        const { data: next } = await supabase
          .from('aulas')
          .select('*')
          .eq('livro_id', res.livro_id)
          .gt('ordem', res.ordem || 0)
          .neq('tipo', 'atividade')
          .neq('tipo', 'prova')
          .neq('tipo', 'licao')
          .order('ordem', { ascending: true })
          .limit(1)
          .maybeSingle();
        setNextLesson(next);
      }
    } catch (err) {
      console.error('Fetch error:', err);
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

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
        <Loader2 className="spinner" size={48} color="var(--primary)" />
      </div>
    );
  }

  if (!data || (!pdfUrl && !data.epub_url)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', color: '#fff', overflow: 'hidden' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1.5rem', background: '#0f0f0f', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/dashboard')} className="btn-back">
              <ChevronLeft size={18} /> Painel
            </button>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{data?.titulo || 'Módulo'}</h3>
          </div>
          <button onClick={() => navigate(-1)} style={{ color: '#ef4444' }}><X size={20} /></button>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="glass-card" style={{ padding: '3rem', borderRadius: '24px', maxWidth: '600px', textAlign: 'center' }}>
            <BookOpen size={48} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
            <h2>{data?.titulo}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Conteúdo em fase de preparação ou introdutório.</p>
            {nextLesson && (
              <button onClick={() => navigate(`/book/${nextLesson.id}?type=aula`)} className="btn btn-primary">
                Acessar Aula: {nextLesson.titulo} <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={viewerRef} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: isPseudoFullscreen ? '100vh' : '100dvh',
        width: '100%',
        position: isPseudoFullscreen ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        zIndex: isPseudoFullscreen ? 9999 : 1,
        background: '#0a0a0a', 
        color: '#fff', 
        overflow: 'hidden' 
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1.5rem', background: '#0f0f0f', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ChevronLeft size={18} /> Painel
          </button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }}></div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{data.titulo}</h3>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="viewer-header-desktop-only" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
            <button 
              onClick={() => setViewType('single')} 
              style={{ 
                padding: '4px 12px', 
                fontSize: '0.75rem', 
                borderRadius: '6px', 
                background: viewType === 'single' ? 'var(--primary)' : 'transparent',
                color: viewType === 'single' ? '#fff' : 'rgba(255,255,255,0.6)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Página
            </button>
            <button 
              onClick={() => setViewType('scroll')} 
              style={{ 
                padding: '4px 12px', 
                fontSize: '0.75rem', 
                borderRadius: '6px', 
                background: viewType === 'scroll' ? 'var(--primary)' : 'transparent',
                color: viewType === 'scroll' ? '#fff' : 'rgba(255,255,255,0.6)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Scroll
            </button>
          </div>
          
          <button onClick={toggleFullscreen} className="btn-icon">
            {isAnyFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button onClick={() => navigate(-1)} className="btn-icon" style={{ color: '#ef4444' }}><X size={20} /></button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
          {viewMode === 'pdf' && pdfUrl ? (
            <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {viewType === 'single' && numPages > 0 && (
                <div style={{ 
                  position: 'sticky', 
                  top: '1rem', 
                  zIndex: 10, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  background: 'rgba(0,0,0,0.8)', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '100px', 
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  marginBottom: '2rem'
                }}>
                  <button 
                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                    className="btn-icon"
                    style={{ opacity: pageNumber <= 1 ? 0.3 : 1 }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, minWidth: '80px', textAlign: 'center' }}>
                    {pageNumber} / {numPages}
                  </span>
                  <button 
                    onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                    disabled={pageNumber >= numPages}
                    className="btn-icon"
                    style={{ opacity: pageNumber >= numPages ? 0.3 : 1 }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}

              <Document 
                file={pdfUrl} 
                onLoadSuccess={onDocumentLoadSuccess} 
                onLoadError={(e) => console.error('PDF Error:', e)}
                loading={<Loader2 className="spinner" />}
                options={pdfOptions}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
                  {viewType === 'scroll' ? (
                    Array.from(new Array(numPages || 0), (_, index) => (
                      <div key={`page_${index + 1}`} className="pdf-page-shadow" style={{ minHeight: pageWidth * 1.3 }}>
                        <Page 
                          pageNumber={index + 1} 
                          width={isAnyFullscreen ? Math.min(window.innerWidth * 0.95, 1200) : pageWidth} 
                          renderTextLayer={true} 
                          renderAnnotationLayer={false}
                          loading={<div style={{ width: pageWidth, height: pageWidth * 1.4, background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}></div>}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="pdf-page-shadow">
                      <Page 
                        pageNumber={pageNumber} 
                        width={isAnyFullscreen ? Math.min(window.innerWidth * 0.95, 1200) : pageWidth} 
                        renderTextLayer={true} 
                        renderAnnotationLayer={false}
                        loading={<div style={{ width: pageWidth, height: pageWidth * 1.4, background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}></div>}
                      />
                    </div>
                  )}
                </div>
              </Document>
            </div>
          ) : (
            <div id="epub-viewer" ref={epubContainerRef} style={{ width: '100%', height: 'calc(100vh - 120px)', background: '#fff' }}></div>
          )}
        </div>

        <div className="content-footer" style={{ maxWidth: '900px', margin: '0 auto 4rem auto', padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <CheckCircle2 color="var(--success)" size={28} /> Aula Finalizada!
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: relatedActivities.length > 0 ? '1fr 1fr' : '1fr', gap: '2rem' }}>
            {relatedActivities.length > 0 && (
              <div style={{ textAlign: 'left' }}>
                <p className="footer-label">Exercícios Relacionados</p>
                {relatedActivities.map(act => (
                  <button key={act.id} onClick={() => navigate(`/lesson/${act.id}`)} className="btn-nav-wide">
                    {act.tipo === 'prova' ? <Award size={18} color="#EAB308" /> : <ClipboardList size={18} color="var(--success)" />}
                    <span>{act.titulo}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p className="footer-label">Próxima Aula</p>
              {nextLesson ? (
                <button onClick={() => { setLoading(true); navigate(`/book/${nextLesson.id}?type=aula`); window.location.reload(); }} className="btn btn-primary w-full">
                  {nextLesson.titulo} <ChevronRight size={20} />
                </button>
              ) : (
                <button onClick={() => navigate('/dashboard')} className="btn btn-outline w-full">Fim do Livro</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandardContent;
