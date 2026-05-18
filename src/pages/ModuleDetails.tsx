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
  Lock
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
    
    // Sort first to ensure we know which one is truly "Card 01"
    const sortedAulasRaw = [...allAulasRaw].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
    
    const allAulas = sortedAulasRaw.filter((a: any, index: number) => {
        // If it's explicitly an interactive item or media, it's valid
        const isInteractive = a.tipo === 'atividade' || a.tipo === 'exercicio' || a.tipo === 'questionario' || a.tipo === 'prova' || !!a.is_bloco_final;
        const hasMedia = !!(a.pdf_url || a.arquivo_url || a.video_url || a.url_video || a.tipo === 'gravada' || a.tipo === 'video' || a.tipo === 'ao_vivo');
        
        // Target specifically "Card 01" (index 0) or the old known dummy titles
        const isDummyTitle = a.titulo.trim() === book.titulo.trim() || a.titulo.trim() === 'Espirito Santo' || a.titulo.trim() === 'Introdução';
        
        // Hide the card ONLY if it is completely empty of media/activities AND it is the first card or has a dummy title.
        const isEmptyDummy = (!hasMedia && !isInteractive) && (index === 0 || isDummyTitle);
        
        if (isEmptyDummy) {
            return false; // Hide "Card 01" and specific dummy titles
        }
        
        return true; // Keep all other lessons visible!
    });

    const watchedIds = (progressoAulas || []).filter((p: any) => p.concluida).map((p: any) => p.aula_id);

    // Categorization Logic - Strict filtering for specific types, fallback for lessons
    const exercicios = allAulas.filter((a: any) => 
        !a.isHidden && (a.tipo === 'atividade' || a.tipo === 'exercicio' || a.tipo === 'questionario') && a.tipo !== 'prova'
    ).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    const videos = allAulas.filter((a: any) => 
        !a.isHidden && (a.tipo === 'gravada' || a.tipo === 'ao_vivo' || a.tipo === 'video' || a.tipo === 'aula_video' || a.video_url || a.url_video) &&
        a.tipo !== 'atividade' && a.tipo !== 'exercicio' && a.tipo !== 'prova'
    ).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    // "Avaliações = somente a Avaliação liberada" -> filter out locked exams
    const provas = allAulas.filter((a: any) => 
        !a.isHidden && 
        (a.tipo === 'prova' || (a.titulo && a.titulo.toUpperCase().includes('V1')) || !!a.is_bloco_final) &&
        !a.lockedByProfessor
    ).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    // Any content that is not an exercise, video, or exam is considered a Lesson (Lição)
    const categorizedIds = new Set([...exercicios, ...videos, ...provas].map(x => x.id));
    const licoes = allAulas.filter((a: any) => 
        !a.isHidden && !categorizedIds.has(a.id)
    ).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    const renderItemCard = (item: any, index: number) => {
        const submission = (atividades || []).find((at: any) => at.aula_id === item.id);
        const isCompleted = (item.tipo === 'atividade' || item.tipo === 'prova' || !!item.is_bloco_final) ? !!submission : watchedIds.includes(item.id);
        const isPendingCorrection = (item.tipo === 'prova' || item.is_bloco_final) && submission && submission.status !== 'corrigida';
        const isLocked = item.lockedByProfessor || (item.tipo === 'prova' && isPendingCorrection);
        
        const getIcon = () => {
            if (item.tipo === 'gravada' || item.tipo === 'video' || item.tipo === 'ao_vivo' || item.video_url) return <PlayCircle size={36} color="var(--primary)" />;
            if (item.tipo === 'prova' || item.is_bloco_final) return <Award size={36} color="#EAB308" />;
            if (item.tipo === 'atividade' || item.tipo === 'exercicio') return <ClipboardList size={36} color="var(--success)" />;
            if (item.pdf_url || item.arquivo_url) return <FileText size={36} color="var(--primary)" />;
            return <BookOpen size={36} color="var(--primary)" />;
        };

        const getCategoryName = () => {
            if (item.tipo === 'gravada' || item.tipo === 'video' || item.tipo === 'ao_vivo' || item.video_url) return "Vídeo Aula";
            if (item.tipo === 'prova' || item.is_bloco_final) return "Avaliação";
            if (item.tipo === 'atividade' || item.tipo === 'exercicio') return "Exercício de Fixação";
            if (item.pdf_url || item.arquivo_url) return "Lição (PDF/Texto)";
            return "Conteúdo";
        };

        return (
            <Link 
                key={item.id}
                to={ (item.pdf_url || (item.arquivo_url && !/\.html?$/i.test(item.arquivo_url))) && item.tipo !== 'prova' && !item.is_bloco_final ? `/book/${item.id}?type=aula` : `/lesson/${item.id}`}
                className={`content-icon-card ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
                style={{ 
                    position: 'relative',
                    pointerEvents: isLocked ? 'none' : 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: '2rem 1.5rem',
                    background: 'var(--glass)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '20px',
                    textDecoration: 'none',
                    color: 'inherit',
                    gap: '1rem',
                    opacity: isLocked ? 0.6 : 1,
                    transition: 'all 0.3s ease'
                }}
            >
                {/* Number Badge */}
                <div style={{ 
                    position: 'absolute', 
                    top: '12px', 
                    left: '12px', 
                    background: isCompleted ? 'var(--success)' : 'rgba(255,255,255,0.05)', 
                    color: '#fff', 
                    fontSize: '0.8rem', 
                    fontWeight: 900, 
                    padding: '4px 10px', 
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {String(index + 1).padStart(2, '0')}
                </div>

                <div className="icon-placeholder" style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {isLocked ? <Lock size={36} color="var(--text-muted)" /> : getIcon()}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)' }}>
                        {getCategoryName()}
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, display: 'block', lineHeight: 1.3 }}>{item.titulo}</span>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {isCompleted && <span style={{ fontSize: '0.7rem', color: '#fff', background: 'var(--success)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>CONCLUÍDO</span>}
                        {isLocked && <span style={{ fontSize: '0.7rem', color: '#fff', background: '#f43f5e', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>{isPendingCorrection ? 'EM CORREÇÃO' : 'BLOQUEADO'}</span>}
                    </div>
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
                                <BookOpen size={24} color="var(--primary)" /> Lições
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {licoes.map((item, i) => renderItemCard(item, i))}
                            </div>
                        </section>
                    )}

                    {/* Row 2: Exercises */}
                    {exercicios.length > 0 && (
                        <section>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', opacity: 0.8, fontSize: '1.2rem', fontWeight: 800 }}>
                                <ClipboardList size={24} color="var(--primary)" /> Exercícios
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {exercicios.map((item, i) => renderItemCard(item, i))}
                            </div>
                        </section>
                    )}

                    {/* Row 3: Videos */}
                    {videos.length > 0 && (
                        <section>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', opacity: 0.8, fontSize: '1.2rem', fontWeight: 800 }}>
                                <PlayCircle size={24} color="var(--primary)" /> Vídeos
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {videos.map((item, i) => renderItemCard(item, i))}
                            </div>
                        </section>
                    )}

                    {/* Row 4: Exams */}
                    {provas.length > 0 && (
                        <section>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', opacity: 0.8, fontSize: '1.2rem', fontWeight: 800 }}>
                                <Award size={24} color="#EAB308" /> Avaliações
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {provas.map((item, i) => renderItemCard(item, i))}
                            </div>
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
