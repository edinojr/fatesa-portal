import { BookOpen, PlayCircle, CheckCircle2, LayoutGrid, Lock, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Course } from '../../../types/dashboard'
import { getBookStats } from '../utils/courseUtils'

interface CourseListProps {
  courses: Course[]
  selectedBook?: string | null // Keep for backward compat but won't use for accordion
  setSelectedBook?: (val: string | null) => void
  atividades: any[]
  progressoAulas: any[]
  showOnlyOngoing?: boolean
  showOnlyFinished?: boolean
}

const CourseList: React.FC<CourseListProps> = ({ 
  courses, 
  atividades = [],
  progressoAulas = [],
  showOnlyOngoing = false,
  showOnlyFinished = false
}) => {
  const navigate = useNavigate();
  const getBookStatsWrapper = (l: any) => getBookStats(l, atividades, progressoAulas);

  const renderBookCard = (currentBook: any) => {
    const stats = getBookStatsWrapper(currentBook);
    return (
      <div key={currentBook.id} className={`${stats.isFinished ? 'book-card-finished' : 'book-highlight-card'}`}>
        <div 
          onClick={() => navigate(`/module/${currentBook.id}`)} 
          className="book-cover" 
          style={{ background: currentBook.capa_url ? `url(${currentBook.capa_url}) center/cover` : 'var(--glass-border)', cursor: 'pointer' }}
        ></div>
        <div style={{ flex: 1 }}>
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem', cursor: 'pointer' }}
            onClick={() => navigate(`/module/${currentBook.id}`)}
          >
            <h2 style={{ margin: 0 }}>{currentBook.titulo}</h2>
            <div style={{ textAlign: 'right' }}>
              {stats.isFinished ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 800, 
                    color: stats.hasExam ? (stats.isApproved ? 'var(--success)' : '#eab308') : 'var(--primary)',
                    background: stats.hasExam ? (stats.isApproved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)') : 'rgba(var(--primary-rgb), 0.1)',
                    padding: '2px 10px',
                    borderRadius: '6px',
                    marginBottom: '4px'
                  }}>
                    {stats.hasExam 
                      ? (stats.isApproved ? 'FINALIZADO' : 'PENDENTE DE REINGRESSO (D.P.)')
                      : 'FINALIZADO'}
                  </span>
                  {stats.hasExam && <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>Nota: {stats.examGrade.toFixed(1)}</span>}
                </div>
              ) : (
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {stats.percent}% concluído
                </span>
              )}
            </div>
          </div>
          
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ 
              height: '100%', 
              width: `${stats.percent}%`, 
              background: stats.percent === 100 && !stats.isApproved 
                ? 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)' 
                : 'linear-gradient(90deg, var(--primary) 0%, #a855f7 100%)', 
              boxShadow: stats.percent === 100 && !stats.isApproved 
                ? '0 0 10px rgba(234, 179, 8, 0.3)' 
                : '0 0 10px rgba(156, 39, 176, 0.5)', 
              transition: 'width 1s ease-out' 
            }}></div>
          </div>

          <div className="book-actions">
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {currentBook.isUnlocked ? (
                (() => {
                  const firstLesson = currentBook.aulas?.find((a: any) => !a.isHidden);
                  return (
                    <button 
                      className="nav-btn-premium"
                      style={{ width: 'auto' }}
                      onClick={() => {
                        if (firstLesson) {
                          if (firstLesson.tipo === 'material' || firstLesson.pdf_url || firstLesson.arquivo_url) {
                            navigate(`/book/${firstLesson.id}?type=aula`);
                          } else {
                            navigate(`/lesson/${firstLesson.id}`);
                          }
                        } else {
                          navigate(`/module/${currentBook.id}`);
                        }
                      }}
                    >
                      <PlayCircle size={18} /> Continuar Estudando
                    </button>
                  );
                })()
              ) : (
                <button className="nav-btn-premium locked" style={{ width: 'auto', opacity: 0.6, cursor: 'not-allowed' }}>
                  <Lock size={18} /> Módulo Bloqueado
                </button>
              )}
              
              {currentBook.isUnlocked && (
                <button 
                  className="btn btn-outline"
                  style={{ width: 'auto', padding: '0.6rem 1.2rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', borderColor: 'var(--glass-border)' }}
                  onClick={() => navigate(`/module/${currentBook.id}`)}
                >
                  <LayoutGrid size={18} /> Ver Tudo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const basicCourses = (courses || []).filter(c => c.nivel === 'basico' || !c.nivel);
  const medioCourses = (courses || []).filter(c => c.nivel === 'medio');

  const renderNivelSection = (label: string, coursesList: Course[]) => {
    if (coursesList.length === 0) return null;
    return (
      <div key={label} style={{ marginBottom: '5rem', animation: 'fadeIn 0.6s' }}>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--primary)' }}>
          <div style={{ width: '8px', height: '36px', background: 'var(--primary)', borderRadius: '10px' }}></div>
          {label}
        </h2>

        {coursesList.map(course => {
          const releasedBooks = (course.livros || []).filter(l => l.isReleased);
          
          // Módulos em Curso: Liberados e não finalizados
          const ongoingBooks = releasedBooks.filter(b => !b.isFinished).sort((a,b) => (a.ordem || 0) - (b.ordem || 0));
          
          // Módulos Finalizados: Já concluídos (Aprovado ou D.P.)
          const finishedBooks = releasedBooks.filter(b => b.isFinished).sort((a,b) => (a.ordem || 0) - (b.ordem || 0));

          return (
            <div key={course.id} style={{ marginBottom: '3.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', opacity: 0.9 }}>
                <BookOpen size={24} /> {course.nome}
              </h3>

              {/* SEÇÃO SUPERIOR: Módulo em Curso */}
              {!showOnlyFinished && ongoingBooks.length > 0 && (
                <div style={{ marginBottom: '3.5rem' }}>
                  <h4 style={{ color: 'var(--primary)', fontSize: '1rem', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(var(--primary-rgb), 0.05)', padding: '0.75rem 1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                    <PlayCircle size={20} /> Módulos em Curso
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {ongoingBooks.map(renderBookCard)}
                  </div>
                </div>
              )}

              {/* SEÇÃO INFERIOR: Meus Módulos Finalizados */}
              {!showOnlyOngoing && finishedBooks.length > 0 && (
                <div>
                  <h4 style={{ color: 'var(--success)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1rem' }}>
                    <CheckCircle2 size={16} /> Meus Módulos Finalizados
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {finishedBooks.map(b => (
                       <div 
                         key={b.id} 
                         onClick={() => navigate(`/module/${b.id}`)}
                         className="book-card-finished" 
                         style={{ 
                           padding: '1.25rem', 
                           background: 'var(--glass)', 
                           border: '1px solid var(--glass-border)', 
                           borderRadius: '16px', 
                           display: 'flex', 
                           alignItems: 'center', 
                           gap: '1.25rem', 
                           cursor: 'pointer',
                           transition: 'transform 0.2s ease'
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                         onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                       >
                          <div style={{ 
                            width: '60px', 
                            height: '80px', 
                            borderRadius: '8px', 
                            background: b.capa_url ? `url(${b.capa_url}) center/cover` : 'rgba(255,255,255,0.05)',
                            flexShrink: 0
                          }}></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.titulo}</h5>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 900, 
                                padding: '3px 8px', 
                                borderRadius: '50px',
                                background: b.isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                color: b.isApproved ? 'var(--success)' : '#eab308',
                                border: `1px solid ${b.isApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)'}`
                              }}>
                                {b.isApproved ? 'APROVADO' : 'D.P.'}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Somente Leitura</span>
                            </div>
                          </div>
                          <ChevronRight size={18} style={{ opacity: 0.3 }} />
                       </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="courses-container">
      {renderNivelSection('Teologia Básico', basicCourses)}
      {renderNivelSection('Teologia Médio', medioCourses)}
      {courses.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '1rem', textAlign: 'center', marginTop: '3rem' }}>Nenhum módulo disponível no momento.</p>}
    </div>
  );
};

export default CourseList
