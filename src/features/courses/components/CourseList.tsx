import React from 'react'
import { BookOpen, PlayCircle, ClipboardList, Award, CheckCircle2, FileText, Lock } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { Course } from '../../../types/dashboard'

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

  const isExamLocked = (aula: any, allAulas: any[], atividades: any[]) => {
    if (aula.tipo !== 'prova') return false;
    
    // Get all exams in this module, sorted by their 'ordem'
    const exams = allAulas
      .filter((a: any) => a.tipo === 'prova')
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    
    const currentIndex = exams.findIndex(e => e.id === aula.id);
    if (currentIndex <= 0) return false; // First exam always available
    
    const previousExam = exams[currentIndex - 1];
    const prevSub = (atividades || []).find(at => at.aula_id === previousExam.id);
    
    // Is locked if NO submission exists OR if the submission is not graded ('corrigida')
    return !prevSub || prevSub.status !== 'corrigida';
  }

  return (
    <div className="courses-grid">
      {(courses || []).map(course => {
        const releasedBooks = (course.livros || []).filter(l => l.isReleased);
        
        const submittedIds = (atividades || []).map((at: any) => at.aula_id);
        const watchedIds = (progressoAulas || []).filter(p => p.concluida).map(p => p.aula_id);

        const getBookStats = (l: any) => {
          const allAulas = l.aulas || [];
          const itemsForProgress = allAulas.filter((a: any) => a.tipo !== 'prova');
          const totalItems = itemsForProgress.length;
          if (totalItems === 0) return { percent: 0, completed: 0, total: 0, averageGrade: 0, isFinished: false, isApproved: true };
          
          const completedItems = itemsForProgress.filter((a: any) => 
            a.tipo === 'atividade' ? submittedIds.includes(a.id) : watchedIds.includes(a.id)
          ).length;
          
          const bookGrades = (atividades || []).filter((at: any) => 
            allAulas.some((a: any) => a.id === at.aula_id) && at.nota !== null
          );
          
          const averageGrade = bookGrades.length > 0 
            ? bookGrades.reduce((a, b) => a + (b.nota || 0), 0) / bookGrades.length 
            : 0;
            
          // Rule: Approved if has a 'prova' and grade >= min_grade (default 7), OR if no 'prova' exists
          const finalExam = allAulas.find((a: any) => a.tipo === 'prova');
          let isApproved = true;
          if (finalExam) {
            const examResult = bookGrades.find(g => g.aula_id === finalExam.id);
            const minGrade = finalExam.min_grade || 7.0;
            isApproved = examResult ? (examResult.status === 'corrigida' && examResult.nota >= minGrade) : false;
          }
          
          return {
            percent: Math.round((completedItems / totalItems) * 100),
            completed: completedItems,
            total: totalItems,
            averageGrade: averageGrade,
            isApproved: isApproved,
            isFinished: completedItems === totalItems && isApproved
          };
        };

        const activeBooks = releasedBooks.filter(l => !getBookStats(l).isFinished);
        const archivedBooks = releasedBooks.filter(l => getBookStats(l).isFinished);
        const isOpen = showArchives[course.id];

        return (
          <div key={course.id} style={{ marginBottom: '4rem' }}>
            <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '4px', height: '24px', background: 'var(--primary)', borderRadius: '4px' }}></div>
              {course.nome}
            </h3>

            {/* Active Modules Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              {activeBooks.map(currentBook => {
                const stats = getBookStats(currentBook);
                return (
                  <div key={currentBook.id} className="book-highlight-card">
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
                        <div style={{ textAlign: 'right' }}>
                          {stats.percent === 100 && !stats.isApproved ? (
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--warning)', display: 'block' }}>REPROVADO</span>
                          ) : null}
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: stats.percent === 100 && !stats.isApproved ? 'var(--warning)' : 'var(--primary)' }}>
                            {stats.percent}% concluído
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
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
                        <button 
                          onClick={() => setSelectedBook(selectedBook === currentBook.id ? null : currentBook.id)} 
                          className="btn btn-primary"
                        >
                          <PlayCircle size={20} /> {selectedBook === currentBook.id ? 'Fechar' : 'AULAS'}
                        </button>
                      </div>

                      {selectedBook === currentBook.id && (
                        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {(() => {
                            const allAulas = currentBook.aulas || [];
                            // Top level items: everything that doesn't have a parent OR videos (even if they have a parent that is a licao, we show them at top level now based on request)
                            // Actually, better: things with no parent_aula_id are top level.
                            // If a video has a parent_aula_id, we'll check if we should still show it at top level.
                            // User: "videos somente no bloco e não nas lições" -> if parent is a 'licao', it should NOT be in that licao.
                            
                            const isCompleted = (aula: any) => (aula.tipo === 'atividade' || aula.tipo === 'prova') 
                              ? submittedIds.includes(aula.id) 
                              : watchedIds.includes(aula.id);

                            const topLevelAulas = allAulas
                              .filter((a: any) => !a.parent_aula_id)
                              .sort((a: any, b: any) => {
                                const compA = isCompleted(a);
                                const compB = isCompleted(b);
                                if (compA !== compB) return compA ? 1 : -1;
                                return (a.ordem || 0) - (b.ordem || 0);
                              });

                            return (
                              <>
                                {topLevelAulas.map((aula: any) => {
                                  const isCompleted = (aula.tipo === 'atividade' || aula.tipo === 'prova') 
                                    ? submittedIds.includes(aula.id) 
                                    : watchedIds.includes(aula.id);
                                    
                                  if (aula.tipo === 'licao') {
                                    const children = allAulas
                                      .filter((a: any) => a.parent_aula_id === aula.id)
                                      .sort((a: any, b: any) => {
                                        const compA = (a.tipo === 'atividade' || a.tipo === 'prova') ? submittedIds.includes(a.id) : watchedIds.includes(a.id);
                                        const compB = (b.tipo === 'atividade' || b.tipo === 'prova') ? submittedIds.includes(b.id) : watchedIds.includes(b.id);
                                        if (compA !== compB) return compA ? 1 : -1;
                                        return (a.ordem || 0) - (b.ordem || 0)
                                      });
                                    
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
                                            
                                            const examLocked = isExamLocked(child, allAulas, atividades);
                                            const profLocked = child.lockedByProfessor;
                                            const isLocked = examLocked || profLocked;

                                            if (isLocked) {
                                              return (
                                                <div 
                                                  key={child.id}
                                                  style={{ 
                                                    padding: '0.5rem 0.75rem', 
                                                    background: 'rgba(255,255,255,0.01)', 
                                                    borderRadius: '8px', 
                                                    cursor: 'not-allowed',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    border: '1px dashed rgba(255,255,255,0.1)',
                                                    opacity: 0.5
                                                  }}
                                                >
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <Lock size={14} color="var(--text-muted)" />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                      {child.titulo} 
                                                      <span style={{ fontSize: '0.7rem', fontStyle: 'italic', marginLeft: '0.5rem' }}>
                                                        {profLocked ? '(Aguardando liberação do professor)' : '(Aguardando correção da anterior)'}
                                                      </span>
                                                    </span>
                                                  </div>
                                                  <Lock size={14} color="var(--text-muted)" />
                                                </div>
                                              );
                                            }
                                            
                                            return (
                                              <Link 
                                                key={child.id} 
                                                to={ (child.arquivo_url || child.pdf_url) ? `/book/${child.id}?type=aula` : `/lesson/${child.id}`}
                                                style={{ 
                                                  padding: '0.5rem 0.75rem', 
                                                  background: 'rgba(255,255,255,0.02)', 
                                                  borderRadius: '8px', 
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  border: isChildCompleted ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255,255,255,0.03)',
                                                  textDecoration: 'none',
                                                  color: 'inherit'
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
                                              </Link>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  }

                                  const examLocked = isExamLocked(aula, allAulas, atividades);
                                  const profLocked = aula.lockedByProfessor;
                                  const isLocked = examLocked || profLocked;

                                  if (isLocked) {
                                    return (
                                      <div 
                                        key={aula.id} 
                                        style={{ 
                                          padding: '0.75rem 1rem', 
                                          background: 'rgba(255,255,255,0.01)', 
                                          borderRadius: '12px', 
                                          cursor: 'not-allowed', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'space-between', 
                                          border: '1px dashed rgba(255,255,255,0.1)',
                                          opacity: 0.5
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                          <Lock size={16} color="var(--text-muted)" />
                                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            {aula.titulo} 
                                            <span style={{ fontSize: '0.75rem', fontStyle: 'italic', marginLeft: '0.5rem' }}>
                                              {profLocked ? '(Aguardando liberação do professor)' : '(Aguardando correção da anterior)'}
                                            </span>
                                          </span>
                                        </div>
                                        <Lock size={16} color="var(--text-muted)" />
                                      </div>
                                    );
                                  }

                                  return (
                                    <Link 
                                      key={aula.id} 
                                      to={ (aula.arquivo_url || aula.pdf_url) ? `/book/${aula.id}?type=aula` : `/lesson/${aula.id}`}
                                      className="lesson-link-card" 
                                      style={{ 
                                        padding: '0.75rem 1rem', 
                                        background: aula.tipo === 'prova' ? 'rgba(234, 179, 8, 0.05)' : 'rgba(255,255,255,0.02)', 
                                        borderRadius: '12px', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between', 
                                        border: isCompleted ? '1px solid var(--success)' : (aula.tipo === 'prova' ? '1px solid rgba(234, 179, 8, 0.1)' : '1px solid rgba(255,255,255,0.03)'),
                                        textDecoration: 'none',
                                        color: 'inherit'
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
                                    </Link>
                                  );
                                })}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {activeBooks.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum módulo ativo no momento.</p>}
            </div>
            
            {/* Archived Modules Section */}
            {archivedBooks.length > 0 && (
              <div style={{ marginTop: '3rem' }}>
                <button 
                  onClick={() => setShowArchives({...showArchives, [course.id]: !isOpen})} 
                  className="btn" 
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto', padding: '0.5rem 1.5rem', borderRadius: '10px' }}
                >
                  <Award size={18} color="var(--success)" /> 
                  <span style={{ fontWeight: 600 }}>{isOpen ? 'Esconder Módulos Arquivados' : 'Ver Módulos Arquivados'}</span>
                  <span style={{ background: 'var(--success)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', marginLeft: '4px' }}>{archivedBooks.length}</span>
                </button>
                
                {isOpen && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem', animation: 'fadeIn 0.4s ease-out' }}>
                    {archivedBooks.map(b => {
                      const stats = getBookStats(b);
                      return (
                        <Link 
                          key={b.id} 
                          className="course-card archived"
                          to={`/book/${b.id}`}
                          style={{ 
                            cursor: 'pointer', 
                            padding: '1.5rem', 
                            background: 'rgba(16, 185, 129, 0.05)', 
                            borderRadius: '20px',
                            border: '1px solid rgba(16, 185, 129, 0.1)',
                            position: 'relative',
                            overflow: 'hidden',
                            textDecoration: 'none',
                            color: 'inherit'
                          }}
                        >
                          <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 size={24} color="var(--success)" style={{ marginTop: '10px', marginRight: '10px' }} />
                          </div>
                          <h4 style={{ marginBottom: '1rem', paddingRight: '2rem' }}>{b.titulo}</h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Nota Final</span>
                              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{stats.averageGrade.toFixed(1)}</span>
                            </div>
                            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Revisar</button>
                          </div>
                        </Link>
                      );
                    })}
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
