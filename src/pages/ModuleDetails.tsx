import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  Lock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { supabase, fetchAllRows } from '../lib/supabase'
import { handleSupabaseError } from '../lib/authUtils'
import { collectExamAttempts, isRecoveryUnlocked, getExamVersion, getExamLabel, isModuleApproved } from '../lib/examRules'
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

    const isStaff = profile?.tipo === 'admin' || profile?.tipo === 'suporte' || profile?.tipo === 'professor' || profile?.tipo === 'colaborador' ||
                    (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte', 'colaborador'].includes(r));

    const currentBook = useMemo(() => {
        for (const course of courses) {
            const found = course.livros.find(l => l.id === id);
            if (found) return { book: found, courseName: course.nome };
        }
        return null;
    }, [courses, id]);

    useEffect(() => {
        if (!profileLoading && profile?.id) {
            fetchStudentDashboardData();
            fetchNucleusReleases();
            fetchIndividualExceptions();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileLoading, profile?.id, id]);

    const fetchNucleusReleases = async () => {
      const { data, error } = await fetchAllRows((from, to) =>
        supabase
          .from('liberacoes_nucleo')
          .select('item_id, item_type, nucleo_id')
          .eq('liberado', true)
          .range(from, to)
      );
      if (error) {
        await handleSupabaseError(error);
        return;
      }
      if (data) {
        const studentNucleoId = profile?.nucleo_id;
        const releasesForStudent = studentNucleoId
          ? data.filter((r: any) => r.nucleo_id === studentNucleoId)
          : [];
        const filtered = data.filter((r: any) => {
          if (!r.nucleo_id || !studentNucleoId || r.nucleo_id === studentNucleoId) return true;
          return releasesForStudent.length === 0;
        });
        setNucleusReleases(filtered);
      }
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
    const isManualOrExamApproved = !!book.isApproved || !!book.isFinished ||
      (book.notaHistorico != null && Number(book.notaHistorico) >= 7) ||
      (book.nota != null && Number(book.nota) >= 7);

    if (!book.isUnlocked && !isManualOrExamApproved && !isStaff && !moduleException) {
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

    const rawAvaliacoes = sortedAulas
      .filter((a: any) => a.tipo === 'avaliacao' || a.tipo === 'prova' || !!a.is_bloco_final);

    const avaliacoes = rawAvaliacoes
      .map((a: any, idx: number) => {
        const v = getExamVersion(a);
        const resolvedVersao = v > 1 ? v : (rawAvaliacoes.length > 1 && idx < 3 ? idx + 1 : 1);
        return { ...a, versao: resolvedVersao };
      })
      .sort((a: any, b: any) => (a.versao || 1) - (b.versao || 1));

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
      // Módulo finalizado ou aprovado (online ou por nota manual): grade 100% aberta para revisão
      if (currentBook?.book?.isFinished || isManualOrExamApproved) return false;

      const versao = getExamVersion(item);
      const isExam = item.tipo === 'prova' || item.tipo === 'avaliacao' || !!item.is_bloco_final;

      // Exceção individual de módulo desbloqueia conteúdo e V1, mas NÃO V2/V3
      if (moduleException) {
        if (!isExam || versao <= 1) return false;
      }

      // Exceção individual de prova específica desbloqueia aquela prova
      const hasIndividualExamRelease = examExceptions.includes(item.id);
      if (hasIndividualExamRelease) return false;

      const moduleSubs = (atividades || []).filter((s: any) => s.book_id === currentBook?.book.id);

      // Regra de Provas e Avaliações Finais
      if (isExam) {
        const moduleAttempts = collectExamAttempts(allAulas, moduleSubs);
        const approved = isModuleApproved(moduleAttempts) || !!currentBook?.book?.isApproved;

        // Se o aluno já foi aprovado na 1ª tentativa (V1) ou versão anterior, não precisa de recuperação
        if (approved && versao > 1) {
          return true; // Bloqueia V2/V3 pois já está aprovado
        }

        // V2/V3 (Recuperação): liberado apenas se a versão anterior foi reprovada
        if (versao > 1) {
          return !isRecoveryUnlocked(versao, moduleAttempts);
        }

        // V1: liberada se houver liberação por núcleo, professor_active, ou se o módulo foi liberado
        const hasNucleusRelease = nucleusReleases.some(r =>
          r.item_id === item.id &&
          (r.item_type === 'atividade' || r.item_type === 'prova' || r.item_type === 'avaliacao')
        );
        if (hasNucleusRelease || item.professor_active === true) return false;
        if (item.professor_active === false) return true;
        if (item.lockedByProfessor) return true;
        return isLocked(item);
      }

      // Conteúdo de Estudo (Panorama, Lições, Vídeos, Exercícios):
      // Se o módulo está desbloqueado para o aluno, o conteúdo está aberto para estudos!
      if (currentBook?.book?.isUnlocked) {
        if (item.professor_active === false) return true;
        if (item.lockedByProfessor) return true;
        if (item.status_liberacao === false) return true;
        if (item.data_liberacao && new Date(item.data_liberacao) > new Date()) return true;
        return false;
      }

      // Fallback: caso o módulo não esteja com flag isUnlocked (mas tenha liberação avulsa)
      const hasNucleusRelease = nucleusReleases.some(r =>
        r.item_id === item.id &&
        (r.item_type === 'atividade' || r.item_type === 'video' || r.item_type === 'modulo')
      );
      if (hasNucleusRelease) return false;
      if (item.professor_active === true) return false;
      if (item.professor_active === false) return true;
      if (item.lockedByProfessor) return true;
      return isLocked(item);
    };

    // ── Grid Content Preparation ──
    // Row 0 (Panorama) + Rows 1..N (Content) — piso de 10 linhas de conteúdo
    // (padrão visual Fatesa); a grade cresce se o módulo tiver mais itens
    const contentRows = Math.max(licoes.length, exercicios.length, videos.length, 10);
    const totalRows = contentRows + 1;
    const sortedOrdens = Array.from({ length: totalRows }, (_, i) => i);
    
    // Align by sequence rather than absolute ordem to ensure Lesson 1 aligns with Exercise 1
    const gridData = {
      lessons: [panorama, ...licoes].slice(0, totalRows),
      exercises: [null, ...exercicios].slice(0, totalRows),
      videos: [null, ...videos].slice(0, totalRows),
      avaliacoes: Array(totalRows).fill(null),
    };

    // Fill the lessons/exercises/videos arrays to exactly totalRows elements if they are shorter
    while (gridData.lessons.length < totalRows) gridData.lessons.push(null);
    while (gridData.exercises.length < totalRows) gridData.exercises.push(null);
    while (gridData.videos.length < totalRows) gridData.videos.push(null);

    // Evaluations must align with the last rows, filled from the bottom up
    const evalCount = avaliacoes.length;
    const evalLimit = Math.min(evalCount, totalRows);
    for (let i = 0; i < evalLimit; i++) {
      gridData.avaliacoes[totalRows - 1 - i] = avaliacoes[evalCount - 1 - i];
    }

    const hasAnyContent = 
      gridData.lessons.some(l => l !== null) || 
      gridData.exercises.some(e => e !== null) || 
      gridData.avaliacoes.some(a => a !== null) ||
      gridData.videos.some(v => v !== null);

    // Indica se o módulo possui prova cadastrada (independente da visibilidade
    // para o perfil atual — o hook pode ocultar provas não liberadas).
    const hasRawExam = (book as any).hasExamInModule === true || avaliacoes.length > 0;

    const renderGridItem = (item: any, label: string) => {
      if (!item) return <div style={{ height: '80px' }} />;
      
      const completed = isCompleted(item);
      const locked = isActuallyLocked(item);
      const isAvaliacao = item.tipo === 'avaliacao';
      const isExercicio = item.tipo === 'exercicio' || item.tipo === 'atividade';
      
      // Determine border color based on type
      let borderColor = 'var(--glass-border)';
      if (completed) borderColor = 'var(--success)';
      else if (isAvaliacao) borderColor = 'var(--primary, #0056b3)';
      else if (isExercicio) borderColor = '#10b981';
      
      return (
         <div 
           onClick={() => {
             if (locked) return;
             navigate(`/lesson/${item.id}`);
           }}
           style={{ 
            padding: '1rem', 
            background: locked ? '#f8fafd' : '#ffffff', 
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
            overflow: 'hidden',
            boxShadow: locked ? 'none' : '0 4px 12px rgba(0, 86, 179, 0.08), 0 0 6px rgba(0, 86, 179, 0.1)',
          }}
          onMouseEnter={(e) => { if(!locked) { e.currentTarget.style.background = '#f0f5fa'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 86, 179, 0.15), 0 0 10px rgba(0, 86, 179, 0.2)'; } }}
          onMouseLeave={(e) => { if(!locked) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 86, 179, 0.08), 0 0 6px rgba(0, 86, 179, 0.1)'; } }}
        >
          {locked && <Lock size={14} color="#64748b" />}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isAvaliacao ? '#0056b3' : isExercicio ? '#059669' : '#0056b3', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#003366', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.titulo}
            </div>
          </div>
          {completed && <CheckCircle size={16} color="#10b981" />}
        </div>
      );
    };

    return (
        <div className="admin-layout">
            <header className="dashboard-header-modern" style={{ justifyContent: 'space-between', padding: '0 1.5rem', height: '60px', minHeight: '60px', maxHeight: '60px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, overflow: 'hidden' }}>
                    <button onClick={() => goToPanel()} className="nav-btn-premium" style={{ width: 'auto', padding: '0.4rem 0.6rem', flexShrink: 0 }} title="Voltar">
                        <ChevronLeft size={16} />
                    </button>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.titulo}</h1>
                        <p className="mobile-hide" style={{ margin: 0, opacity: 0.8, fontSize: '0.72rem', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{courseName} • Caminho de Aprendizado</p>
                    </div>
                </div>
            </header>


                <main className="admin-main" style={{ padding: '1rem' }}>
                <div className="nav-breadcrumb-modern" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span onClick={() => navigate('/dashboard')} style={{ color: '#0056b3', textDecoration: 'none', fontWeight: 600, cursor: 'pointer' }}>Início</span>
                    <ChevronRight size={14} style={{ color: '#0056b3', opacity: 0.5 }} />
                    <span onClick={() => navigate('/dashboard?tab=cursos')} style={{ color: '#0056b3', textDecoration: 'none', fontWeight: 600, cursor: 'pointer' }}>Meus Cursos</span>
                    <ChevronRight size={14} style={{ color: '#0056b3', opacity: 0.5 }} />
                    <span className="active" style={{ color: '#003366', fontWeight: 800 }}>{book.titulo}</span>
                </div>
                <div className="gold-separator-line" style={{ marginBottom: '1.75rem' }} />

                {!hasAnyContent ? (
                  <div style={{ textAlign: 'center', padding: '6rem 2rem', background: 'var(--glass)', borderRadius: '32px', border: '1px dashed rgba(245, 158, 11, 0.4)' }}>
                    <AlertTriangle size={64} color="#f59e0b" style={{ opacity: 0.4, marginBottom: '1.5rem' }} />
                    <h2 style={{ color: '#f59e0b', marginBottom: '0.75rem' }}>Módulo em Manutenção</h2>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                      Este módulo ainda não possui conteúdo ou processo de avaliação disponível.
                      O aluno não será aprovado automaticamente.
                      Aguarde a introdução do conteúdo e do processo de avaliação pela administração.
                    </p>
                    <button onClick={() => goToPanel('/dashboard?tab=cursos')} className="btn btn-primary" style={{ width: 'auto' }}>
                      Voltar para Meus Cursos
                    </button>
                  </div>
                ) : (
                  <React.Fragment>
                    {!avaliacoes.length && (
                      <div style={{ textAlign: 'center', padding: '1.25rem 2rem', background: 'rgba(245, 158, 11, 0.06)', borderRadius: '16px', border: '1px dashed rgba(245, 158, 11, 0.35)', marginBottom: '2rem' }}>
                        {hasRawExam ? (
                          <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                            A prova final está configurada, mas ainda não foi liberada para este perfil.
                            O professor liberará a avaliação em breve. As lições acima já estão disponíveis para estudo.
                          </p>
                        ) : (
                          <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                            <AlertTriangle size={16} color="#f59e0b" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                            As lições estão disponíveis para estudo, mas o módulo ainda não possui prova final configurada.
                            O aluno não será aprovado automaticamente até que o processo de avaliação seja introduzido.
                          </p>
                        )}
                      </div>
                    )}
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
                     <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary, #0056b3)', fontSize: '0.9rem', padding: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Avaliações</div>
 
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
                                const label = getExamLabel(av);
                                return renderGridItem(av, label);
                              })()}
                          </React.Fragment>
                        ))}
                   </div>
                  </React.Fragment>
                )}
            </main>
        </div>
    );
};

export default ModuleDetails;
