import React from 'react'
import { BookOpen, AlertCircle, Award, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Course } from '../../../types/dashboard'
import { getBookStats } from '../utils/courseUtils'
import { sortModulesByCurriculum } from '../../../lib/courseTitles'
import BaseCard from './cards/BaseCard'
import ModalityBadge from '../../../components/ui/ModalityBadge'

interface CourseListProps {
  courses: Course[]
  atividades: any[]
  progressoAulas: any[]
  showOnlyFinished?: boolean
}

const CourseList: React.FC<CourseListProps> = ({ 
  courses, 
  atividades = [],
  progressoAulas = [],
  showOnlyFinished = false,
}) => {
  const navigate = useNavigate();
  const getBookStatsWrapper = (l: any) => getBookStats(l, atividades, progressoAulas);

  const isBookVisible = (currentBook: any) => {
    const stats = getBookStatsWrapper(currentBook);
    const isApprovedManual = (currentBook.notaHistorico != null && Number(currentBook.notaHistorico) >= 7) || (currentBook.nota != null && Number(currentBook.nota) >= 7);
    const isApproved = currentBook.isApproved || stats.isApproved || isApprovedManual;
    const isDP = currentBook.isDP || (!isApproved && stats.isFinished);
    const isUnlocked = !!currentBook.isUnlocked;

    if (showOnlyFinished) {
      // No Meu Boletim / Histórico: exibe os módulos concluídos/aprovados e também os que estão em dependência (DP)
      return isApproved || isDP;
    }

    // No painel de estudo (Meus Cursos): respeitar a progressão pedagógica do aluno e do núcleo
    if (currentBook.isStudentProgressionUnlocked !== undefined) {
      return (currentBook.isStudentProgressionUnlocked || currentBook.isCurrent || currentBook.isVigente) && !isApproved;
    }

    return isUnlocked && !isApproved;
  };

  const renderBookCard = (currentBook: any) => {
    const stats = getBookStatsWrapper(currentBook);
    const isHistoricoSintetico = String(currentBook.id || '').startsWith('historico-');

    const rawNota = currentBook.notaHistorico ?? currentBook.nota ?? (stats.isApproved && stats.examGrade ? stats.examGrade : null);
    const numNota = rawNota != null && !isNaN(Number(rawNota)) ? Number(rawNota) : null;
    const isApprovedManual = (currentBook.notaHistorico != null && Number(currentBook.notaHistorico) >= 7) || (currentBook.nota != null && Number(currentBook.nota) >= 7);
    const isApproved = currentBook.isApproved || stats.isApproved || isApprovedManual;
    const isDP = currentBook.isDP || (!isApproved && stats.isFinished);
    const isFinished = isApproved;
    const isEffectivelyUnlocked = !!currentBook.isUnlocked || isApproved;

    // Módulo em manutenção: sem conteúdo ou sem prova final configurada.
    const isMaintenance = stats.isMaintenance && !isApproved;

    let subtitulo = '';
    if (numNota != null) {
      subtitulo = `Nota ${numNota.toFixed(1)} • ${isApprovedManual ? 'Aprovado / Liberado (Nota Manual)' : isDP ? (currentBook.isDPQueued ? 'Dependência (Na Fila)' : 'Dependência (Recuperação Aberta)') : 'Aprovado / Liberado'}`;
    } else if (isMaintenance) {
      subtitulo = 'Módulo em manutenção — conteúdo indisponível';
    } else if (isDP) {
      subtitulo = currentBook.isDPQueued 
        ? 'Módulo em dependência (na fila) — aguarde a aprovação do módulo anterior'
        : 'Módulo em dependência — realize a prova de recuperação';
    } else if (isApproved) {
      subtitulo = isHistoricoSintetico ? 'Aprovado / Liberado por Histórico Manual' : `${stats.total > 0 ? `${stats.total} aulas • ` : ''}100% Concluído • Liberado`;
    } else {
      subtitulo = `${stats.total} aulas • ${stats.percent}% concluído`;
    }

    const displayPercent = isApproved ? 100 : stats.percent;

    return (
      <div key={currentBook.id} style={{ marginBottom: '0.75rem' }}>
        <BaseCard
          href={isHistoricoSintetico || isMaintenance ? '#' : `/module/${currentBook.id}`}
          capaUrl={currentBook.capa_url}
          titulo={currentBook.titulo}
          subtitulo={subtitulo}
          badge={
            isMaintenance
              ? {
                  label: 'EM MANUTENÇÃO',
                  color: '#ffffff',
                  bg: 'var(--primary, #0056b3)',
                }
              : isDP
                ? {
                    label: currentBook.isDPQueued ? 'D.P. NA FILA' : 'D.P. (RECUPERAÇÃO)',
                    color: '#ffffff',
                    bg: currentBook.isDPQueued ? '#b45309' : 'var(--primary, #0056b3)',
                  }
              : isApproved
                ? {
                    label: 'APROVADO / LIBERADO',
                    color: '#ffffff',
                    bg: 'var(--success, #10b981)',
                  }
                : undefined
          }
          status={!isEffectivelyUnlocked ? 'locked' : isMaintenance ? 'locked' : isApproved ? 'completed' : 'default'}
          accentColor={isMaintenance ? 'var(--primary, #0056b3)' : isApproved ? 'var(--success)' : 'var(--primary)'}
        >
          <div style={{ marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ModalityBadge ensinoTipo={currentBook.ensino_tipo} />
            {isMaintenance && (
              <div style={{
                width: '100%',
                marginTop: '0.4rem',
                padding: '0.5rem 0.7rem',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <AlertCircle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', color: '#f59e0b', lineHeight: 1.4 }}>
                  Este módulo está em manutenção. Aguarde a introdução do conteúdo e do processo de avaliação.
                </span>
              </div>
            )}
            {!isMaintenance && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${displayPercent}%`, 
                  background: isFinished ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 'linear-gradient(90deg, var(--primary) 0%, #3b82f6 100%)', 
                  transition: 'width 1s ease-out' 
                }}></div>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isFinished ? 'var(--success)' : 'var(--primary)', minWidth: '35px' }}>{displayPercent}%</span>
            </div>
            )}
            {numNota != null && !isMaintenance && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{isApprovedManual ? 'Nota Oficial (Histórico)' : 'Nota da Prova'}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--success)' }}>
                  {numNota.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </BaseCard>
      </div>
    );
  };

  const basicCourses = (courses || []).filter(c => {
    const nivel = (c.nivel || '').toLowerCase();
    return nivel === 'basico' || nivel === 'básico' || !nivel;
  });
  const medioCourses = (courses || []).filter(c => {
    const nivel = (c.nivel || '').toLowerCase();
    return nivel === 'medio' || nivel === 'médio';
  });

  const filterCourses = (courseList: Course[]) => {
    return (courseList || [])
      .map(course => ({
        ...course,
        livros: sortModulesByCurriculum(
          (course.livros || []).filter(isBookVisible),
          (b: any) => b.titulo || ''
        )
      }))
      .filter(course => course.livros.length > 0);
  };

  const visibleBasicCourses = filterCourses(basicCourses);
  const visibleMedioCourses = filterCourses(medioCourses);
  const totalVisibleBooks = visibleBasicCourses.reduce((acc, c) => acc + c.livros.length, 0) +
                            visibleMedioCourses.reduce((acc, c) => acc + c.livros.length, 0);

  if (totalVisibleBooks === 0) {
    if (showOnlyFinished) {
      return (
        <div style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          background: 'var(--glass)',
          border: '1px dashed var(--glass-border)',
          borderRadius: '20px',
          opacity: 0.8,
          maxWidth: '560px',
          margin: '2rem auto'
        }}>
          <Award size={40} color="var(--primary)" style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 700 }}>Nenhum módulo finalizado encontrado</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Conforme você concluir os módulos e avaliações, suas notas e certificações aparecerão aqui.
          </p>
        </div>
      );
    }

    return (
      <div style={{
        padding: '3.5rem 2rem',
        textAlign: 'center',
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        borderRadius: '24px',
        maxWidth: '600px',
        margin: '2rem auto'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(var(--primary-rgb), 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem'
        }}>
          <CheckCircle size={32} color="var(--primary)" />
        </div>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: 800 }}>Nenhum módulo pendente para estudo</h3>
        <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Você não possui módulos em andamento no momento. Todos os seus módulos já concluídos podem ser consultados no seu boletim oficial.
        </p>
        <button 
          onClick={() => navigate('/modulos-finalizados')} 
          className="btn btn-primary"
          style={{ width: 'auto', padding: '0.75rem 1.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.6rem', margin: '0 auto' }}
        >
          <Award size={18} /> Ver Módulos Finalizados e Notas
        </button>
      </div>
    );
  }

  const renderNivelSection = (label: string, coursesList: Course[]) => {
    return (
      <div key={label} style={{ marginBottom: '3rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          marginBottom: '1.5rem', 
          paddingBottom: '0.75rem', 
          borderBottom: '2px solid var(--primary)' 
        }}>
          <div style={{ width: '4px', height: '24px', background: 'var(--primary)', borderRadius: '8px' }}></div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--primary)' }}>{label}</h2>
        </div>

        {coursesList.map(course => (
          <div key={course.id} style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', opacity: 0.8 }}>
               <BookOpen size={18} color="var(--primary)" />
               <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{course.nome}</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(course.livros || []).map(renderBookCard)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="courses-container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {visibleBasicCourses.length > 0 && renderNivelSection('Teologia Básica', visibleBasicCourses)}
      {visibleMedioCourses.length > 0 && renderNivelSection('Teologia Média', visibleMedioCourses)}
    </div>
  );
};

export default CourseList
