import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfile } from '../hooks/useProfile';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Loader2, 
  Maximize, 
  Minimize, 
  BookOpen,
  List,
  Menu
} from 'lucide-react';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { processHtmlForNav, NavItem } from '../features/courses/utils/htmlNav';

// Configurando o worker do PDF.js (v4.4.168+ para react-pdf 10.x)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const SmartViewer = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { profile } = useProfile();

    const goToPanel = () => {
        const role = profile?.tipo;
        const roles = (profile?.caminhos_acesso as string[]) || [];
        const isAdmin = role === 'admin' || roles.includes('admin') || roles.includes('suporte');
        const isProfessor = role === 'professor' || roles.includes('professor');
        if (isAdmin) navigate('/admin');
        else if (isProfessor) navigate('/professor');
        else {
            const stored = localStorage.getItem('fatesa_active_role');
            if (stored === 'admin') navigate('/admin');
            else if (stored === 'professor') navigate('/professor');
            else navigate('/dashboard');
        }
    };

    console.log('[SmartViewer] Abrindo conteúdo com ID:', id);
  
  // 1. Hooks de Estado
  const [data, setData] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'pdf' | 'epub'>('pdf');
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const [nextLesson, setNextLesson] = useState<any>(null);
  const [relatedActivities, setRelatedActivities] = useState<any[]>([]);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [toc, setToc] = useState<NavItem[]>([]);
   const [isMenuOpen, setIsMenuOpen] = useState(false);


  // Otimização v1.6.0
  const [viewType, setViewType] = useState<'scroll' | 'single'>('single'); 

  // 2. Refs
  const viewerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const epubContainerRef = useRef<HTMLDivElement>(null);
  const [inputPage, setInputPage] = useState<string>('1');

  // 3. Memos e Variáveis Calculadas
  const isMobile = containerWidth < 768;
  const pageWidth = Math.floor(containerWidth * (isMobile ? 1 : 0.95));
  const isAnyFullscreen = isFullscreen || isPseudoFullscreen;

  const pdfOptions = useMemo(() => ({
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    disableRange: false,
    disableStream: false,
    disableAutoFetch: false
  }), []);

  const isHtmlContent = useMemo(() => {
    if (!data) return false;
    const url = data.arquivo_url || data.url || '';
    return /\.html?$/i.test(url);
  }, [data]);

  const pdfUrl = useMemo(() => {
    if (!data) return null;
    if (isHtmlContent) return null;
    return data.pdf_url || data.arquivo_url || data.url;
  }, [data, isHtmlContent]);


  // 4. Effects
  useEffect(() => {
    fetchBook();
    const handleResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  useEffect(() => {
    if (isMobile && viewType !== 'scroll') {
      setViewType('scroll');
    }
  }, [isMobile]);

  useEffect(() => {
    if (viewType === 'scroll' && numPages > 0) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const page = parseInt(entry.target.getAttribute('data-page') || '1');
            setPageNumber(page);
            setInputPage(String(page));
          }
        });
      }, { threshold: 0.5 });

      const containers = document.querySelectorAll('.pdf-page-container');
      containers.forEach(c => observer.observe(c));
      return () => observer.disconnect();
    }
  }, [viewType, numPages, loading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'f' || e.key === 'F') && viewerRef.current) {
        toggleFullscreen();
      }
      if (viewType === 'single' && !loading) {
        if (e.key === 'ArrowRight') handlePageNext();
        if (e.key === 'ArrowLeft') handlePagePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, viewType, loading, pageNumber, numPages]);

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
      const searchStr = location.search || window.location.search || window.location.hash.split('?')[1] || "";
      const searchParams = new URLSearchParams(searchStr);
      const isAula = searchParams.get('type') === 'aula';
      const table = isAula ? 'aulas' : 'livros';
      
      const { data: res, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      
      setData(res);
      
      if (res.arquivo_url && /\.html?$/i.test(res.arquivo_url)) {
        setHtmlLoading(true);
        try {
          const resp = await fetch(res.arquivo_url);
          const text = await resp.text();
          const { processedHtml, toc: extractedToc } = processHtmlForNav(text);
          setHtmlContent(processedHtml);
          setToc(extractedToc);
        } catch (err) {
          console.error('Failed to fetch HTML content:', err);
        } finally {
          setHtmlLoading(false);
        }
      }
      
      const hasPdf = res.pdf_url || res.arquivo_url || res.url;
      if (!hasPdf && res.epub_url) {
        setViewMode('epub');
      }

      if (isAula) {
        // Correct Linkage Logic: Priority 1 - Children
        const { data: children } = await supabase
          .from('aulas')
          .select('id')
          .eq('parent_aula_id', res.id)
          .eq('tipo', 'atividade')
          .order('ordem', { ascending: true })
          .limit(1);

        if (children && children.length > 0) {
          setRelatedActivities(children);
        } else {
          // Priority 2: Next immediate exercise
          const { data: nextEx } = await supabase
            .from('aulas')
            .select('id')
            .eq('livro_id', res.livro_id)
            .gt('ordem', res.ordem || 0)
            .eq('tipo', 'atividade')
            .order('ordem', { ascending: true })
            .limit(1);
          setRelatedActivities(nextEx || []);
        }

        // Próxima aula
        const { data: next } = await supabase
          .from('aulas')
          .select('id, titulo')
          .eq('livro_id', res.livro_id)
          .gt('ordem', res.ordem || 0)
          .neq('tipo', 'atividade')
          .neq('tipo', 'prova')
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

  const handlePageNext = () => {
    const next = Math.min(numPages, pageNumber + 1);
    setPageNumber(next);
    setInputPage(next.toString());
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handlePagePrev = () => {
    const prev = Math.max(1, pageNumber - 1);
    setPageNumber(prev);
    setInputPage(prev.toString());
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageInput = (val: string) => {
    setInputPage(val);
    const num = parseInt(val);
    if (!isNaN(num) && num >= 1 && num <= numPages) {
      setPageNumber(num);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) handlePageNext();
      else handlePagePrev();
    }
    setTouchStartX(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
        <Loader2 className="spinner" size={48} color="var(--primary)" />
      </div>
    );
  }

  if (!data || (!pdfUrl && !data.epub_url && !htmlContent && !htmlLoading)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', color: '#fff', overflow: 'hidden' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1.5rem', background: '#0f0f0f', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => goToPanel()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ChevronLeft size={18} /> Painel
            </button>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{data?.titulo || 'Módulo'}</h3>
          </div>
          <button onClick={() => navigate(-1)} style={{ color: '#ef4444', background:'none', border:'none' }}><X size={20} /></button>
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
        className="reading-page"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: isPseudoFullscreen ? '100vh' : (isMobile ? 'auto' : '100dvh'),
        width: '100%',
        position: isPseudoFullscreen ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        zIndex: isPseudoFullscreen ? 9999 : 1,
        overflow: isMobile ? 'visible' : 'hidden' 
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1.5rem', background: '#0f0f0f', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => goToPanel()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ChevronLeft size={18} /> Painel
          </button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }}></div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{data.titulo}</h3>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {!htmlContent && (
            <div className="viewer-header-desktop-only" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
              <button 
                onClick={() => setViewType('single')} 
                style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '6px', background: viewType === 'single' ? 'var(--primary)' : 'transparent', color: viewType === 'single' ? '#fff' : 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Página
              </button>
              <button 
                onClick={() => setViewType('scroll')} 
                style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '6px', background: viewType === 'scroll' ? 'var(--primary)' : 'transparent', color: viewType === 'scroll' ? '#fff' : 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Scroll
              </button>
            </div>
          )}
          {htmlContent && (
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem' }}
            >
              <Menu size={16} /> Tópicos
            </button>
          )}
          <button onClick={toggleFullscreen} className="btn-icon">
            {isAnyFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button onClick={() => navigate(-1)} className="btn-icon" style={{ color: '#ef4444' }}><X size={20} /></button>
        </div>
      </header>

      <div ref={scrollContainerRef} style={{ flex: isMobile ? 'none' : 1, overflowY: isMobile ? 'visible' : 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
          {htmlLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem' }}>
              <Loader2 className="spinner" size={32} />
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Carregando conteúdo...</p>
            </div>
          ) : htmlContent ? (
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              {/* Hamburger Overlay Menu */}
              {isMenuOpen && (
                <div 
                  style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    zIndex: 1000, 
                    display: 'flex', 
                    justifyContent: 'flex-start' 
                  }}
                >
                  <div 
                    onClick={() => setIsMenuOpen(false)} 
                    style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      background: 'rgba(0,0,0,0.5)', 
                      backdropFilter: 'blur(4px)' 
                    }} 
                  />
                  <aside style={{ 
                    position: 'relative', 
                    width: '300px', 
                    background: 'var(--bg-dark)', 
                    padding: '2rem', 
                    borderRadius: '0 24px 24px 0', 
                    borderRight: '1px solid var(--glass-border)',
                    height: '100vh',
                    overflowY: 'auto',
                    boxShadow: '10px 0 30px rgba(0,0,0,0.5)',
                    zIndex: 1001,
                    transition: 'transform 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                      <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 800 }}>
                        <List size={20} color="var(--primary)" /> Tópicos
                      </h4>
                      <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {toc.filter(item => item.isMainSection).map((item, idx) => {
                      const labelParts = item.label.split(/\.\s+/);
                      const formattedLabel = labelParts.length > 1 
                        ? `Texto ${labelParts[0]} - ${labelParts.slice(1).join('. ')}` 
                        : `Texto ${idx + 1} - ${item.label}`;
                      
                      return (
                        <a 
                          key={item.id} 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setIsMenuOpen(false);
                            setTimeout(() => {
                              const element = document.getElementById(item.id);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }, 100);
                          }}
                          style={{ 
                            color: 'var(--text-muted)', 
                            textDecoration: 'none', 
                            fontSize: '0.95rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.6rem',
                            padding: '0.6rem 1rem',
                            borderRadius: '8px',
                            transition: 'all 0.2s',
                            lineHeight: 1.4,
                            background: 'rgba(255,255,255,0.03)',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--primary)';
                            e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          }}
                        >
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                          {formattedLabel}
                        </a>
                      );
                    })}
                    </div>
                  </aside>
                </div>
              )}
              <div
                className="lesson-content"
                style={{ 
                  flex: 1, 
                  marginBottom: '4rem', 
                  lineHeight: 1.8, 
                  maxWidth: '1200px', 
                  width: '100%',
                  padding: '0 2rem',
                  textAlign: 'justify', 
                  overflow: 'auto',
                  transition: 'all 0.3s ease'
                }}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          ) : viewMode === 'pdf' && pdfUrl ? (
            <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={(e) => console.error('PDF Error:', e)} loading={<Loader2 className="spinner" />} options={pdfOptions}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
                  {viewType === 'scroll' ? (
                    Array.from(new Array(numPages || 0), (_, index) => (
                      <div key={`page_${index + 1}`} data-page={index + 1} className="pdf-page-shadow pdf-page-container" style={{ minHeight: pageWidth * 1.3 }}>
                        <Page 
                          pageNumber={index + 1} 
                          width={isAnyFullscreen ? Math.min(window.innerWidth * 0.95, 1200) : pageWidth} 
                          renderTextLayer={false} 
                          renderAnnotationLayer={false} 
                          loading={<div style={{ width: pageWidth, height: pageWidth * 1.4, background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}></div>} 
                        />
                      </div>
                    ))
                  ) : (
                    <div className="pdf-page-shadow" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ cursor: viewType === 'single' ? 'grab' : 'default' }}>
                      <Page 
                        pageNumber={pageNumber} 
                        width={isAnyFullscreen ? Math.min(window.innerWidth * 0.95, 1200) : pageWidth} 
                        renderTextLayer={false} 
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
      </div>

      <footer className="viewer-footer-responsive">
        {!htmlContent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {viewType === 'single' && (
              <button onClick={handlePagePrev} disabled={pageNumber <= 1} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', width: 'auto', padding: '0.5rem 1.25rem', borderRadius: '50px', opacity: pageNumber <= 1 ? 0.3 : 1 }}>
                <ChevronLeft size={18} /> <span className="mobile-hide">Anterior</span>
              </button>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pág</span>
              <input type="number" value={inputPage} onChange={(e) => handlePageInput(e.target.value)} min={1} max={numPages} style={{ background: 'transparent', border: 'none', color: '#fff', width: '35px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ {numPages}</span>
            </div>

            {viewType === 'single' && (
              <button onClick={handlePageNext} disabled={pageNumber >= numPages} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', width: 'auto', padding: '0.5rem 1.25rem', borderRadius: '50px', opacity: pageNumber >= numPages ? 0.3 : 1 }}>
                <span className="mobile-hide">Próxima</span> <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}

        {(htmlContent || pageNumber >= numPages || viewType === 'scroll') && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              {relatedActivities.length > 0 && (
                <button 
                  onClick={() => navigate(`/lesson/${relatedActivities[0].id}`)} 
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '0.5rem 1.5rem', borderRadius: '50px', background: 'var(--success)', border: 'none' }}
                >
                  <BookOpen size={16} /> Atividade
                </button>
              )}
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button 
                  onClick={() => navigate(-1)} 
                  className="btn btn-outline" 
                  style={{ width: 'auto', padding: '0.5rem 1.5rem', borderRadius: '50px' }}
                >
                  <ChevronLeft size={18} /> Lição Anterior
                </button>
                {nextLesson ? (
                  <button 
                    onClick={() => { setLoading(true); navigate(`/book/${nextLesson.id}?type=aula`); }} 
                    className="btn btn-primary"
                    style={{ width: 'auto', padding: '0.5rem 1.5rem', borderRadius: '50px' }}
                  >
                    Próxima Lição <ChevronRight size={18} />
                  </button>
                ) : (
                  <button onClick={() => goToPanel()} className="btn btn-outline" style={{ border:'none', width: 'auto', borderRadius: '50px' }}>
                    Voltar ao Painel
                  </button>
                )}
              </div>
            </div>
        )}
      </footer>
    </div>
  );
};

export default SmartViewer;
