import React, { useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ChevronRight,
  ArrowLeft,
  BookOpen, 
  PlayCircle, 
  Award, 
  ClipboardList, 
  FileText, 
  Lock,
  LayoutGrid
} from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { useStudentCourses } from '../features/courses/hooks/useStudentCourses'

const ModuleDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { profile, loading: profileLoading } = useProfile();
    const { courses, progressoAulas, atividades, loading: coursesLoading, fetchStudentDashboardData } = useStudentCourses(profile);
    
    // Find the specific module (book) within the courses
    const currentBook = useMemo(() => {
        for (const course of courses) {
            const found = course.livros.find(l => l.id === id);
            if (found) return { book: found, courseName: course.nome };
        }
        return null;
    }, [courses, id]);

    useEffect(() => {
        if (!profileLoading && profile) {
            fetchStudentDashboardData();
        }
    }, [profileLoading, profile, fetchStudentDashboardData]);

    if (profileLoading || coursesLoading) {
        return (
            <div className="auth-container">
                <div className="spinner"></div>
                <p>Carregando conteúdo do módulo...</p>
            </div>
        );
    }

    if (!currentBook) {
        return (
            <div className="auth-container">
                <h2>Módulo não encontrado.</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>O conteúdo que você procura não está disponível ou o link está incorreto.</p>
                <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ width: 'auto' }}>Voltar ao Painel</button>
            </div>
        );
    }

    const { book } = currentBook;

    // Security Check: If the module is not unlocked yet, redirect back
    if (!book.isUnlocked) {
        return (
            <div className="auth-container">
                <Lock size={64} color="var(--primary)" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
                <h2>Módulo Bloqueado</h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 2rem' }}>
                    Este módulo ainda não foi liberado para o seu perfil. 
                    Aguarde a liberação pelo seu professor ou polo.
                </p>
                <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ width: 'auto' }}>Voltar ao Painel</button>
            </div>
        );
    }
    const allAulasRaw = book.aulas || [];
    
    // Filter out placeholders that are just titles with no content, but keep the first one if requested
    const seenPlaceholders = new Set();
    const allAulas = allAulasRaw.filter((a: any) => {
        const titleTrimmed = a.titulo.trim();
        const isPlaceholder = (titleTrimmed === book.titulo.trim() || titleTrimmed === 'Espirito Santo') && !a.pdf_url && !a.video_url;
        
        if (isPlaceholder) {
            if (seenPlaceholders.has(titleTrimmed)) return false; // Duplicate
            seenPlaceholders.add(titleTrimmed);
            return true; // Keep the first one
        }
        return true;
    });

    const watchedIds = (progressoAulas || []).filter((p: any) => p.concluida).map((p: any) => p.aula_id);

    // Categorization Logic - Broad and inclusive, respecting Polo-based visibility
    const licoes = allAulas.filter((a: any) => 
        !a.isHidden && 
        (a.tipo === 'licao' || a.tipo === 'aula' || a.tipo === 'conteudo' || a.pdf_url || a.arquivo_url) &&
        !(a.video_url || a.url_video) // Only reading: Exclude if has video
    ).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    const exercicios = allAulas.filter((a: any) => 
        !a.isHidden && (a.tipo === 'atividade' || a.tipo === 'exercicio' || a.tipo === 'questionario') && a.tipo !== 'prova'
    ).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    const provas = allAulas.filter((a: any) => 
        !a.isHidden && (a.tipo === 'prova' || (a.titulo && a.titulo.toUpperCase().includes('V1')) || !!a.is_bloco_final)
    ).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    const videos = allAulas.filter((a: any) => 
        !a.isHidden && (a.tipo === 'gravada' || a.tipo === 'ao_vivo' || a.tipo === 'video' || a.tipo === 'aula_video' || a.video_url || a.url_video)
    ).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    // Fallback for any content that didn't fit
    const categorizedIds = new Set([...licoes, ...exercicios, ...provas, ...videos].map(x => x.id));
    const outros = allAulas.filter((a: any) => !a.isHidden && !categorizedIds.has(a.id));

    const renderItemCard = (item: any, index: number) => {
        const submission = (atividades || []).find((at: any) => at.aula_id === item.id);
        const isCompleted = (item.tipo === 'atividade' || item.tipo === 'prova' || !!item.is_bloco_final) ? !!submission : watchedIds.includes(item.id);
        const isPendingCorrection = (item.tipo === 'prova' || item.is_bloco_final) && submission && submission.status !== 'corrigida';
        const isLocked = item.lockedByProfessor || (item.tipo === 'prova' && isPendingCorrection);
        
        const iconStyle = { size: 24, color: 'currentColor' };
        const getIcon = () => {
            if (item.tipo === 'gravada' || item.tipo === 'video' || item.tipo === 'ao_vivo' || item.video_url) return <PlayCircle {...iconStyle} />;
            if (item.tipo === 'prova' || item.is_bloco_final) return <Award {...iconStyle} />;
            if (item.tipo === 'atividade' || item.tipo === 'exercicio') return <ClipboardList {...iconStyle} />;
            if (item.pdf_url || item.arquivo_url) return <FileText {...iconStyle} />;
            return <BookOpen {...iconStyle} />;
        };

        return (
            <Link 
                key={item.id}
                to={ (item.arquivo_url || item.pdf_url) && item.tipo !== 'prova' && !item.is_bloco_final ? `/book/${item.id}?type=aula` : `/lesson/${item.id}`}
                className={`content-icon-card ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
                style={{ 
                    position: 'relative',
                    pointerEvents: isLocked ? 'none' : 'auto' 
                }}
            >
                {/* Number Badge */}
                <div style={{ 
                    position: 'absolute', 
                    top: '12px', 
                    left: '12px', 
                    background: isCompleted ? 'var(--success)' : 'rgba(255,255,255,0.1)', 
                    color: '#fff', 
                    fontSize: '0.7rem', 
                    fontWeight: 900, 
                    padding: '2px 8px', 
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {String(index + 1).padStart(2, '0')}
                </div>

                <div className="icon-placeholder">
                    {isLocked ? <Lock size={24} /> : getIcon()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block' }}>{item.titulo}</span>
                    {isCompleted && <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700 }}>CONCLUÍDO</span>}
                    {isLocked && <span style={{ fontSize: '0.7rem', color: '#f43f5e', fontWeight: 700 }}>{isPendingCorrection ? 'EM CORREÇÃO' : 'BLOQUEADO'}</span>}
                </div>
            </Link>
        );
    };

    return (
        <div className="admin-layout">
            <header className="dashboard-header-modern">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button onClick={() => navigate('/dashboard')} className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '12px' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{currentBook.book.titulo}</h1>
                        <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>{currentBook.courseName} • Trilhas de Aprendizado</p>
                    </div>
                </div>
            </header>

            <main className="admin-main" style={{ padding: '2rem' }}>
                <div className="nav-breadcrumb-modern" style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>Início</Link>
                    <ChevronRight size={14} style={{ opacity: 0.3 }} />
                    <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>Meus Cursos</Link>
                    <ChevronRight size={14} style={{ opacity: 0.3 }} />
                    <span className="active" style={{ color: 'var(--primary)', fontWeight: 700 }}>{currentBook.book.titulo}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                    {/* Row 1: Lessons */}
                    {licoes.length > 0 && (
                        <section>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', opacity: 0.8, fontSize: '1.2rem', fontWeight: 800 }}>
                                <BookOpen size={24} color="var(--primary)" /> Lições e Materiais
                            </h4>
                            <div className="horizontal-content-row">{licoes.map((item, i) => renderItemCard(item, i))}</div>
                        </section>
                    )}

                    {/* Row 2: Exercises */}
                    {exercicios.length > 0 && (
                        <section>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', opacity: 0.8, fontSize: '1.2rem', fontWeight: 800 }}>
                                <ClipboardList size={24} color="var(--primary)" /> Exercícios de Fixação
                            </h4>
                            <div className="horizontal-content-row">{exercicios.map((item, i) => renderItemCard(item, i))}</div>
                        </section>
                    )}

                    {/* Row 3: Videos */}
                    {videos.length > 0 && (
                        <section>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', opacity: 0.8, fontSize: '1.2rem', fontWeight: 800 }}>
                                <PlayCircle size={24} color="var(--primary)" /> Aulas em Vídeo
                            </h4>
                            <div className="horizontal-content-row">{videos.map((item, i) => renderItemCard(item, i))}</div>
                        </section>
                    )}

                    {/* Row 4: Exams */}
                    {provas.length > 0 && (
                        <section>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', opacity: 0.8, fontSize: '1.2rem', fontWeight: 800 }}>
                                <Award size={24} color="#EAB308" /> Provas e Avaliações
                            </h4>
                            <div className="horizontal-content-row">{provas.map((item, i) => renderItemCard(item, i))}</div>
                        </section>
                    )}

                    {/* Row 5: Others */}
                    {outros.length > 0 && (
                        <section>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', opacity: 0.8, fontSize: '1.2rem', fontWeight: 800 }}>
                                <LayoutGrid size={24} color="var(--text-muted)" /> Outros Conteúdos
                            </h4>
                            <div className="horizontal-content-row">{outros.map((item, i) => renderItemCard(item, i))}</div>
                        </section>
                    )}

                    {licoes.length === 0 && exercicios.length === 0 && videos.length === 0 && provas.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '6rem 2rem', background: 'var(--glass)', borderRadius: '32px', border: '1px dashed var(--glass-border)' }}>
                            <BookOpen size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                            <h2 style={{ opacity: 0.5 }}>Nenhum conteúdo liberado para visualização no momento.</h2>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ModuleDetails;
