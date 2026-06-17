import { BookOpen, PlayCircle, LayoutGrid, Lock, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Course } from '../../../types/dashboard'
import { getBookStats } from '../utils/courseUtils'
import { useState } from 'react'
import BaseCard from './cards/BaseCard'

interface CourseListProps {
  courses: Course[]
  atividades: any[]
  progressoAulas: any[]
  showOnlyFinished?: boolean
  showOnlyOngoing?: boolean
}

const CourseList: React.FC<CourseListProps> = ({ 
  courses, 
  atividades = [],
  progressoAulas = [],
  showOnlyFinished = false,
}) => {
  const navigate = useNavigate();
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const getBookStatsWrapper = (l: any) => getBookStats(l, atividades, progressoAulas);

  const renderLessonItem = (aula: any) => {
    const isReader = (aula.tipo === 'material' || aula.pdf_url || aula.arquivo_url) && aula.tipo !== 'prova' && !aula.is_bloco_final;
    return (
      <div 
        key={aula.id} 
        onClick={() => {
          if (isReader) navigate(`/book/${aula.id}?type=aula`);
          else navigate(`/lesson/${aula.id}`);
        }}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0.6rem 0.8rem', 
          background: 'rgba(255,255,255,0.03)', 
          borderRadius: '8px', 
          cursor: 'pointer',
          fontSize: '0.8rem',
          transition: 'all 0.2s',
          border: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '0.4rem'
        }}
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; 
          e.currentTarget.style.borderColor = 'var(--primary)'; 
        }}
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; 
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <PlayCircle size={14} opacity={0.6} color="var(--primary)" />
          <span>{aula.titulo}</span>
        </div>
        <ChevronRight size={12} opacity={0.4} />
      </div>
    );
  };

  const renderBookCard = (currentBook: any) => {
    const stats = getBookStatsWrapper(currentBook);
    const isExpanded = expandedBookId === currentBook.id;

    if (showOnlyFinished && !stats.isFinished) return null;

    return (
      <div key={currentBook.id} style={{ marginBottom: '0.75rem' }}>
        <BaseCard
          href={`/module/${currentBook.id}`}
          capaUrl={currentBook.capa_url}
          titulo={currentBook.titulo}
          subtitulo={`${stats.total} aulas • ${stats.percent}% concluído`}
          badge={
            stats.isFinished
              ? {
                  label: stats.hasExam ? (stats.isApproved ? 'FINALIZADO' : 'D.P.') : 'FINALIZADO',
                  color: stats.isApproved ? 'var(--success)' : '#eab308',
                  bg: stats.isApproved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                }
              : undefined
          }
          status={!currentBook.isUnlocked ? 'locked' : stats.isFinished && stats.isApproved ? 'completed' : 'default'}
          accentColor={stats.isFinished && stats.isApproved ? 'var(--success)' : 'var(--primary)'}
        >
          <div style={{ marginTop: '0.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${stats.percent}%`, 
                  background: 'linear-gradient(90deg, var(--primary) 0%, #3b82f6 100%)', 
                  transition: 'width 1s ease-out' 
                }}></div>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', minWidth: '35px' }}>{stats.percent}%</span>
            </div>
          </div>
        </BaseCard>

            {isExpanded && currentBook.aulas && currentBook.aulas.length > 0 && (
              <div style={{ 
                padding: '0.75rem', 
                marginTop: '0.5rem',
                background: 'rgba(0,0,0,0.15)', 
                border: '1px solid var(--glass-border)',
                borderRadius: '10px',
              }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <BookOpen size={14} /> Lições do Módulo
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {(currentBook.aulas || []).map(renderLessonItem)}
                </div>
              </div>
            )}
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
              {(course.livros || []).sort((a,b) => (a.ordem || 0) - (b.ordem || 0)).map(renderBookCard)}
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
