import React from 'react'
import { BookOpen, PlayCircle, ClipboardList, Award, CheckCircle2, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Course } from '../../types/dashboard'

interface CourseListProps {
  courses: Course[]
  showArchives: Record<string, boolean>
  setShowArchives: (val: Record<string, boolean>) => void
  selectedBook: string | null
  setSelectedBook: (val: string | null) => void
  selectedLessonType: 'video' | 'atividade'
  setSelectedLessonType: (val: 'video' | 'atividade') => void
  atividades: any[]
  progressoAulas: any[]
}

const CourseList: React.FC<CourseListProps> = ({ 
  courses, 
  showArchives, 
  setShowArchives, 
  selectedBook, 
  setSelectedBook, 
  atividades,
  progressoAulas
}) => {
  const navigate = useNavigate()

  return (
    <div className="courses-grid">
      {(courses || []).map(course => {
        const currentBook = (course.livros || []).find(l => l.isCurrent) || (course.livros || []).find(l => l.isReleased)
        const pastBooks = (course.livros || []).filter(l => l.isReleased && l.id !== currentBook?.id)
        const isOpen = showArchives[course.id]

        return (
          <div key={course.id}>
            <h3 style={{ marginBottom: '2rem' }}>{course.nome}</h3>
            {currentBook && (
              <div className="book-highlight-card">
                <div 
                  onClick={() => setSelectedBook(selectedBook === currentBook.id ? null : currentBook.id)} 
                  className="book-cover" 
                  style={{ background: currentBook.capa_url ? `url(${currentBook.capa_url}) center/cover` : 'var(--glass-border)', cursor: 'pointer' }}
                ></div>
                <div style={{ flex: 1 }}>
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem', cursor: 'pointer' }}
                    onClick={() => setSelectedBook(selectedBook === currentBook.id ? null : currentBook.id)}
                  >
                    <h2 style={{ margin: 0 }}>{currentBook.titulo}</h2>
                    {(() => {
                      const totalItems = currentBook.aulas?.length || 0;
                      if (totalItems === 0) return null;
                      const submittedIds = (atividades || []).map((at: any) => at.aula_id);
                      const watchedIds = (progressoAulas || []).filter(p => p.concluida).map(p => p.aula_id);
                      const completedItems = (currentBook.aulas || []).filter(a => 
                        (a.tipo === 'atividade' || a.tipo === 'prova') ? submittedIds.includes(a.id) : watchedIds.includes(a.id)
                      ).length;
                      const percent = Math.round((completedItems / totalItems) * 100);
                      return <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>{percent}% concluído</span>;
                    })()}
                  </div>
                  
                  {/* Progress Bar */}
                  {(() => {
                    const totalItems = currentBook.aulas?.length || 0;
                    if (totalItems === 0) return null;
                    const submittedIds = (atividades || []).map((at: any) => at.aula_id);
                    const watchedIds = (progressoAulas || []).filter(p => p.concluida).map(p => p.aula_id);
                    const completedItems = (currentBook.aulas || []).filter(a => 
                      (a.tipo === 'atividade' || a.tipo === 'prova') ? submittedIds.includes(a.id) : watchedIds.includes(a.id)
                    ).length;
                    const percent = (completedItems / totalItems) * 100;
                    return (
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <div style={{ height: '100%', width: `${percent}%`, background: 'linear-gradient(90deg, var(--primary) 0%, #a855f7 100%)', boxShadow: '0 0 10px rgba(156, 39, 176, 0.5)', transition: 'width 1s ease-out' }}></div>
                      </div>
                    );
                  })()}

                  <div className="book-actions">
                    <button 
                      onClick={() => { 
                        setSelectedBook(selectedBook === currentBook.id ? null : currentBook.id) 
                      }} 
                      className="btn btn-primary"
                    >
                      <PlayCircle size={20} /> {selectedBook === currentBook.id ? 'Fechar' : 'AULAS'}
                    </button>
                  </div>

                  {selectedBook === currentBook.id && (
                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {(() => {
                        const allAulas = currentBook.aulas || [];
                        const topLevelAulas = allAulas
                          .filter((a: any) => !a.parent_aula_id)
                          .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
                        
                        const submittedIds = (atividades || []).map((at: any) => at.aula_id);
                        const watchedIds = (progressoAulas || []).filter(p => p.concluida).map(p => p.aula_id);

                        return (
                          <>
                            {topLevelAulas.map((aula: any) => {
                              const isCompleted = (aula.tipo === 'atividade' || aula.tipo === 'prova') 
                                ? submittedIds.includes(aula.id) 
                                : watchedIds.includes(aula.id);
                                
                              if (aula.tipo === 'licao') {
                                const children = allAulas
                                  .filter((a: any) => a.parent_aula_id === aula.id)
                                  .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
                                
                                const isAllCompleted = children.length > 0 && children.every((c: any) => 
                                  (c.tipo === 'atividade' || c.tipo === 'prova') ? submittedIds.includes(c.id) : watchedIds.includes(c.id)
                                );

                                return (
                                  <div key={aula.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <div 
                                      style={{ 
                                        padding: '0.75rem 1rem', 
                                        background: 'rgba(255,255,255,0.03)', 
                                        borderRadius: '12px',
                                        border: isAllCompleted ? '1px solid var(--success)' : '1px solid var(--glass-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                      }}
                                      className="lesson-header-card"
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <BookOpen size={16} color="var(--primary)" />
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{aula.titulo}</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Módulo</span>
                                        {isAllCompleted && <CheckCircle2 size={14} color="var(--success)" />}
                                      </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginLeft: '1.2rem' }}>
                                      {children.map((child: any) => {
                                        const isChildCompleted = (child.tipo === 'atividade' || child.tipo === 'prova') 
                                          ? submittedIds.includes(child.id) 
                                          : watchedIds.includes(child.id);
                                        
                                        return (
                                          <div 
                                            key={child.id} 
                                            onClick={() => {
                                              if (child.arquivo_url || child.pdf_url) {
                                                navigate(`/book/${child.id}?type=aula`);
                                              } else {
                                                navigate(`/lesson/${child.id}`);
                                              }
                                            }}
                                            style={{ 
                                              padding: '0.5rem 0.75rem', 
                                              background: 'rgba(255,255,255,0.02)', 
                                              borderRadius: '8px', 
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              border: isChildCompleted ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255,255,255,0.03)'
                                            }}
                                            className="lesson-link-card"
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                              {child.tipo === 'gravada' ? <PlayCircle size={14} color="var(--primary)" /> : 
                                               (child.arquivo_url || child.pdf_url) ? <FileText size={14} color="var(--success)" /> :
                                               child.tipo === 'atividade' ? <ClipboardList size={14} color="var(--success)" /> : 
                                               child.tipo === 'prova' ? <Award size={14} color="#EAB308" /> : <FileText size={14} color="var(--text-muted)" />}
                                              <span style={{ fontSize: '0.8rem' }}>{child.titulo}</span>
                                            </div>
                                            {isChildCompleted && <CheckCircle2 size={14} color="var(--success)" />}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div 
                                  key={aula.id} 
                                  onClick={() => {
                                    if (aula.arquivo_url || aula.pdf_url) {
                                      navigate(`/book/${aula.id}?type=aula`);
                                    } else {
                                      navigate(`/lesson/${aula.id}`);
                                    }
                                  }}
                                  className="lesson-link-card" 
                                  style={{ 
                                    padding: '0.75rem 1rem', 
                                    background: aula.tipo === 'prova' ? 'rgba(234, 179, 8, 0.05)' : 'rgba(255,255,255,0.02)', 
                                    borderRadius: '12px', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    border: isCompleted ? '1px solid var(--success)' : (aula.tipo === 'prova' ? '1px solid rgba(234, 179, 8, 0.1)' : '1px solid rgba(255,255,255,0.03)') 
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {aula.tipo === 'gravada' ? <PlayCircle size={16} color="var(--primary)" /> : 
                                     (aula.arquivo_url || aula.pdf_url) ? <FileText size={16} color="var(--success)" /> :
                                     aula.tipo === 'atividade' ? <ClipboardList size={16} color="var(--success)" /> : 
                                     aula.tipo === 'prova' ? <Award size={16} color="#EAB308" /> : <FileText size={16} color="var(--text-muted)" />}
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{aula.titulo}</span>
                                  </div>
                                  {isCompleted && <CheckCircle2 size={16} color="var(--success)" />}
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {pastBooks.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <button 
                  onClick={() => setShowArchives({...showArchives, [course.id]: !isOpen})} 
                  className="btn" 
                  style={{ background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Award size={16} /> {isOpen ? 'Esconder anteriores' : 'Ver anteriores'}
                </button>
                {isOpen && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {pastBooks.map(b => (
                      <div 
                        key={b.id} 
                        onClick={() => navigate(`/book/${b.id}`)} 
                        style={{ cursor: 'pointer', padding: '1rem', background: 'var(--glass)', borderRadius: '12px' }}
                      >
                        {b.titulo}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default CourseList
