import { BookOpen, ChevronRight, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Course } from '../../../types/dashboard'
import { getBookStats } from '../utils/courseUtils'
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

  const renderBookCard = (currentBook: any) => {
    const stats = getBookStatsWrapper(currentBook);
    const isHistoricoSintetico = !currentBook.aulas || currentBook.aulas.length === 0;

    const rawNota = currentBook.notaHistorico ?? currentBook.nota ?? (stats.isApproved && stats.examGrade ? stats.examGrade : null);
    const numNota = rawNota != null && !isNaN(Number(rawNota)) ? Number(rawNota) : null;
    const isApprovedManual = (currentBook.notaHistorico != null && Number(currentBook.notaHistorico) >= 7) || (currentBook.nota != null && Number(currentBook.nota) >= 7);
    const isFinished = currentBook.isFinished || stats.isFinished || isApprovedManual;

    if (showOnlyFinished && !isFinished) return null;

    // Módulo em manutenção: sem conteúdo ou sem prova final configurada.
    // Só exibe o aviso se o aluno não foi finalizado manualmente nem por histórico.
    const isMaintenance = stats.isMaintenance && !isFinished && !isApprovedManual;

    let subtitulo = '';
    if (numNota != null) {
      subtitulo = `Nota ${numNota.toFixed(1)} • ${isApprovedManual ? 'Aprovado por Histórico' : 'Aprovado em Avaliação'}`;
    } else if (isMaintenance) {
      subtitulo = 'Módulo em manutenção — conteúdo indisponível';
    } else if (isFinished) {
      subtitulo = isHistoricoSintetico ? 'Finalizado por Histórico Manual' : `${stats.total > 0 ? `${stats.total} aulas • ` : ''}100% Concluído`;
    } else {
      subtitulo = `${stats.total} aulas • ${stats.percent}% concluído`;
    }

    const displayPercent = isFinished ? 100 : stats.percent;

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
                  color: '#f59e0b',
                  bg: 'rgba(245, 158, 11, 0.1)',
                }
              : isFinished
                ? {
                    label: (stats.isApproved || currentBook.isApproved || isApprovedManual) ? 'FINALIZADO' : 'D.P.',
                    color: (stats.isApproved || currentBook.isApproved || isApprovedManual) ? 'var(--success)' : '#eab308',
                    bg: (stats.isApproved || currentBook.isApproved || isApprovedManual) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                  }
                : undefined
          }
          status={!currentBook.isUnlocked ? 'locked' : isMaintenance ? 'locked' : (isFinished && (stats.isApproved || currentBook.isApproved || isApprovedManual)) ? 'completed' : 'default'}
          accentColor={isMaintenance ? '#f59e0b' : (isFinished && (stats.isApproved || currentBook.isApproved || isApprovedManual)) ? 'var(--success)' : 'var(--primary)'}
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

        {coursesList.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            background: 'var(--glass)',
            border: '1px dashed var(--glass-border)',
            borderRadius: '16px',
            opacity: 0.6
          }}>
            <BookOpen size={32} style={{ opacity: 0.2, margin: '0 auto 0.75rem' }} />
            <h3 style={{ opacity: 0.5, fontWeight: 600, marginBottom: '0.4rem', fontSize: '1rem' }}>Nenhum curso disponível</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Novos módulos serão disponibilizados em breve.</p>
          </div>
        ) : coursesList.map(course => (
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
      {renderNivelSection('Teologia Básica', basicCourses)}
      {renderNivelSection('Teologia Média', medioCourses)}
    </div>
  );
};

export default CourseList
