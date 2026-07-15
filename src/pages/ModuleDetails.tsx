import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Lock,
  CheckCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { handleSupabaseError } from '../lib/authUtils'
import { useProfile } from '../hooks/useProfile'
import { useStudentCourses } from '../features/courses/hooks/useStudentCourses'

const ModuleDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { profile, loading: profileLoading } = useProfile();
    const { courses, progressoAulas, atividades, loading: coursesLoading, fetchStudentDashboardData } = useStudentCourses(profile);
    const [nucleusReleases, setNucleusReleases] = useState<any[]>([]);
    const [moduleException, setModuleException] = useState<boolean>(false);
    const [examExceptions, setExamExceptions] = useState<string[]>([]);

    const goToPanel = (path = '/dashboard') => {
        navigate(path);
    };

    const isStaff = profile?.tipo === 'admin' || profile?.tipo === 'suporte' || profile?.tipo === 'professor' ||
                    (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte'].includes(r));

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
            fetchNucleusReleases();
            fetchIndividualExceptions();
        }
    }, [profileLoading, profile, fetchStudentDashboardData, id]);

    const fetchNucleusReleases = async () => {
      if (!profile?.nucleo_id) return;
      const { data, error } = await supabase.from('liberacoes_nucleo').select('item_id, item_type').eq('nucleo_id', profile.nucleo_id).eq('liberado', true);
      if (error) {
        await handleSupabaseError(error)
        return
      }
      if (data) setNucleusReleases(data);
    };

    const fetchIndividualExceptions = async () => {
      if (!profile?.id || !id) return;
      const { data: modEx } = await supabase
        .from('liberacoes_excecao')
        .select('id')
        .eq('user_id', profile.id)
        .eq('livro_id', id)
        .maybeSingle();
      setModuleException(!!modEx);

      const { data: examEx } = await supabase
        .from('liberacoes_excecao_atividade')
        .select('aula_id')
        .eq('user_id', profile.id);
      if (examEx) setExamExceptions(examEx.map((e: any) => e.aula_id));
    };

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
                <button onClick={() => goToPanel()} className="btn btn-primary" style={{ width: 'auto' }}>Voltar ao Painel</button>
            </div>
        );
    }

    const { book, courseName } = currentBook;

    if (!book.isUnlocked && !isStaff && !moduleException) {
        return (
            <div className="auth-container">
                <Lock size={64} color="var(--primary)" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
                <h2>Módulo Bloqueado</h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 2rem' }}>
                    Este módulo ainda não foi liberado para o seu perfil.
                    Aguarde a liberação pelo seu professor ou polo.
                </p>
                <button onClick={() => goToPanel()} className="btn btn-primary" style={{ width: 'auto' }}>Voltar ao Painel</button>
            </div>
        );
    }

    const allAulas: any[] = book.aulas || [];
    const sortedAulas = [...allAulas].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    const watchedIds = (progressoAulas || []).filter((p: any) => p.concluida).map((p: any) => p.aula_id);

    const isVideoType = (t: string) =>
      t === 'gravada' || t === 'ao_vivo' || t === 'video' || t === 'aula_video';

    // Panorama: ordem 0 OU titulo "Panorama" (criado pelo admin)
    const panorama = sortedAulas.find((a: any) =>
      a.ordem === 0 || a.titulo?.trim()?.toLowerCase() === 'panorama'
    );

    // Lições: matched with Admin panel logic (tipo licao or material)
    const licoes = sortedAulas
      .filter((a: any) => {
        if (a.tipo !== 'licao' && a.tipo !== 'material') return false;
        if (a.ordem === 0) return false;
        if (a.titulo?.trim()?.toLowerCase() === 'panorama') return false;
        return true;
      })
      .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    const exercicios = sortedAulas
      .filter((a: any) => (a.tipo === 'atividade' || a.tipo === 'exercicio') && a.tipo !== 'prova' && !a.is_bloco_final)
      .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    const avaliacoes = sortedAulas
      .filter((a: any) => a.tipo === 'avaliacao' || a.tipo === 'prova' || !!a.is_bloco_final)
      .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    const videos = sortedAulas
      .filter((a: any) => isVideoType(a.tipo) || !!a.video_url || !!a.url_video)
      .filter((a: any) => a.tipo !== 'atividade' && a.tipo !== 'exercicio' && a.tipo !== 'avaliacao' && a.tipo !== 'prova' && !a.is_bloco_final)
      .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    const submissionFor = (aulaId: string) => (atividades || []).find((at: any) => at.aula_id === aulaId);
    const isCompleted = (item: any) => {
      if (item.tipo === 'atividade' || item.tipo === 'exercicio' || item.tipo === 'avaliacao' || item.tipo === 'prova' || item.is_bloco_final) {
        const s = submissionFor(item.id);
        return !!(s && (s.status === 'corrigida' || s.status === 'concluido'));
      }
      return watchedIds.includes(item.id);
    };
    const isLocked = (item: any) => {
      if (item.status_liberacao === false) return true;
      if (item.data_liberacao && new Date(item.data_liberacao) > new Date()) return true;
      return false;
    };
    const isActuallyLocked = (item: any) => {
      if (isStaff) return false;

      const versao = item.versao || 1;
      const isExam = item.tipo === 'prova' || item.tipo === 'avaliacao' || !!item.is_bloco_final;

      // Exceção individual de módulo desbloqueia conteúdo e V1, mas NÃO V2/V3
      if (moduleException) {
        if (!isExam || versao <= 1) return false;
      }

      // Exceção individual de prova específica desbloqueia aquela prova
      const hasIndividualExamRelease = examExceptions.includes(item.id);

      const moduleSubs = (atividades || []).filter((s: any) => s.book_id === currentBook?.book.id);
      const examSubs = moduleSubs.filter((s: any) => s.lesson_type === 'prova' || s.is_bloco_final || (s.aulas?.tipo === 'prova'));

      // V2: liberado se aluno reprovou na V1
      // V3: liberado se aluno reprovou na V2
      // Bloco final: usa regra padrão de liberação por núcleo
      if (isExam && versao > 1 && !hasIndividualExamRelease) {
        const prevExam = examSubs.find((s: any) => {
          const sv = s.aulas?.versao || 1;
          return sv === versao - 1 && s.status === 'corrigida';
        });
        if (!prevExam) return true; // Versão anterior não feita → bloqueado
        const prevMinGrade = prevExam.aulas?.min_grade || 7.0;
        const failed = (prevExam.nota || 0) < prevMinGrade;
        if (!failed) return true; // Passou na anterior → aprovado, bloqueado
        return false; // Reprovou na anterior → V2/V3 liberado
      }

      // Se o professor desativou a avaliação, fica bloqueada independente da liberação por núcleo
      // A MENOS que haja exceção individual
      if (item.professor_active === false && !hasIndividualExamRelease) return true;

      // V1 ou conteúdo regular: verificar liberação por núcleo
      const hasNucleusRelease = nucleusReleases.some(r => 
        r.item_id === item.id && 
        (r.item_type === 'atividade' || r.item_type === 'video' || r.item_type === 'modulo')
      );
      if (hasNucleusRelease || hasIndividualExamRelease) return false;
  
      if (!!item.lockedByProfessor) return true;
      return isLocked(item);
    };

    // ── Grid Content Preparation ──
    // We want exactly 11 rows: Row 0 (Panorama) + Rows 1-10 (Content)
    const sortedOrdens = Array.from({ length: 11 }, (_, i) => i);
    
    // Align by sequence rather than absolute ordem to ensure Lesson 1 aligns with Exercise 1
    const gridData = {
      lessons: [panorama, ...licoes].slice(0, 11),
      exercises: [null, ...exercicios].slice(0, 11),
      videos: [null, ...videos].slice(0, 11),
      avaliacoes: Array(11).fill(null),
    };

    // Fill the lessons/exercises/videos arrays to exactly 11 elements if they are shorter
    while (gridData.lessons.length < 11) gridData.lessons.push(null);
    while (gridData.exercises.length < 11) gridData.exercises.push(null);
    while (gridData.videos.length < 11) gridData.videos.push(null);

    // Evaluations must align with the last 3 rows (8, 9, 10)
    // We fill from the bottom (row 10) up to 3 items
    const evalCount = avaliacoes.length;
    const evalLimit = Math.min(evalCount, 3);
    for (let i = 0; i < evalLimit; i++) {
      gridData.avaliacoes[10 - i] = avaliacoes[evalCount - 1 - i];
    }

    const maxRows = sortedOrdens.length;

    const hasAnyContent = 
      gridData.lessons.some(l => l !== null) || 
      gridData.exercises.some(e => e !== null) || 
      gridData.avaliacoes.some(a => a !== null) ||
      gridData.videos.some(v => v !== null);

    const renderGridItem = (item: any, label: string) => {
      if (!item) return <div style={{ height: '80px' }} />;
      
      const completed = isCompleted(item);
      const locked = isActuallyLocked(item);
      const isAvaliacao = item.tipo === 'avaliacao';
      const isExercicio = item.tipo === 'exercicio' || item.tipo === 'atividade';
      
      // Determine border color based on type
      let borderColor = 'var(--glass-border)';
      if (completed) borderColor = 'var(--success)';
      else if (isAvaliacao) borderColor = '#eab308';
      else if (isExercicio) borderColor = '#10b981';
      
      return (
         <div 
           onClick={() => {
             if (locked) return;
             navigate(`/lesson/${item.id}`);
           }}
           style={{ 
            padding: '1rem', 
            background: locked ? 'rgba(255,255,255,0.02)' : 'var(--glass)', 
            borderTop: `1px solid ${borderColor}`,
            borderRight: `1px solid ${borderColor}`,
            borderBottom: `1px solid ${borderColor}`,
            borderLeft: `4px solid ${borderColor}`,
            borderRadius: '12px', 
            cursor: locked ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            transition: 'all 0.2s',
            position: 'relative',
            marginBottom: '0.5rem',
            height: '80px',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => { if(!locked) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={(e) => { if(!locked) e.currentTarget.style.background = 'var(--glass)'; }}
        >
          {locked && <Lock size={14} color="var(--text-muted)" />}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isAvaliacao ? '#eab308' : isExercicio ? '#10b981' : 'var(--primary)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.titulo}
            </div>
          </div>
          {completed && <CheckCircle size={16} color="var(--success)" />}
        </div>
      );
    };

    return (
        <div className="admin-layout">
            <header className="dashboard-header-modern" style={{ justifyContent: 'space-between', padding: '1rem 2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => goToPanel()} className="nav-btn-premium" style={{ width: 'auto', padding: '0.5rem' }} title="Voltar">
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{book.titulo}</h1>
                        <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>{courseName} • Caminho de Aprendizado</p>
                    </div>
                </div>
            </header>


                <main className="admin-main" style={{ padding: '1rem' }}>
                <div className="nav-breadcrumb-modern" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span onClick={() => navigate('/dashboard')} style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7, cursor: 'pointer' }}>Início</span>
                    <ChevronRight size={14} style={{ opacity: 0.3 }} />
                    <span onClick={() => navigate('/dashboard?tab=cursos')} style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7, cursor: 'pointer' }}>Meus Cursos</span>
                    <ChevronRight size={14} style={{ opacity: 0.3 }} />
                    <span className="active" style={{ color: 'var(--primary)', fontWeight: 700 }}>{book.titulo}</span>
                </div>

                {!hasAnyContent ? (
                  <div style={{ textAlign: 'center', padding: '6rem 2rem', background: 'var(--glass)', borderRadius: '32px', border: '1px dashed var(--glass-border)' }}>
                    <BookOpen size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                    <h2 style={{ opacity: 0.5 }}>Nenhum conteúdo liberado para visualização no momento.</h2>
                  </div>
                ) : (
                   <div style={{ 
                     display: 'grid', 
                      gridTemplateColumns: 'repeat(4, 1fr)', 
                     gap: '1rem',
                     animation: 'fadeIn 0.5s ease-out'
                   }}>
                     {/* Headers */}
                     <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem', padding: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Lições</div>
                     <div style={{ textAlign: 'center', fontWeight: 800, color: '#10b981', fontSize: '0.9rem', padding: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Exercícios</div>
                     <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem', padding: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Vídeos</div>
                     <div style={{ textAlign: 'center', fontWeight: 800, color: '#eab308', fontSize: '0.9rem', padding: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Avaliações</div>
 
                      {/* Rows */}
                        {sortedOrdens.map((ordem, idx) => (
                          <React.Fragment key={ordem}>
                            {renderGridItem(
                              gridData.lessons[idx], 
                              ordem === 0 ? 'Panorama' : `Lição ${String(ordem).padStart(2, '0')}`
                            )}
                            {renderGridItem(
                              gridData.exercises[idx], 
                              ordem === 0 ? '' : `Exercício ${String(ordem).padStart(2, '0')}`
                            )}
                            {renderGridItem(
                              gridData.videos[idx], 
                              ordem === 0 ? '' : `Vídeo ${String(ordem).padStart(2, '0')}`
                            )}
                              {(() => {
                                const av = gridData.avaliacoes[idx];
                                if (!av) return <div style={{ height: '80px' }} />;
                                const versao = av.versao || 1;
                                const label = versao === 1 ? 'Avaliação 01' : versao === 2 ? 'Avaliação 02 (Recuperação)' : 'Avaliação 03 (2ª Recuperação)';
                                return renderGridItem(av, label);
                              })()}
                          </React.Fragment>
                        ))}
                   </div>
                )}
            </main>
        </div>
    );
};

export default ModuleDetails;
