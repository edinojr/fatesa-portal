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
  selectedLessonType,
  setSelectedLessonType,
  atividades = [],
  progressoAulas = []
}) => {
  const navigate = useNavigate()

  const isExamLocked = (aula: any, allAulas: any[], atividades: any[]) => {
    return false; // Desativado para permitir fluxo contínuo autorizado pelo professor
  }

  return (
    <div className="courses-grid">
      {(courses || []).map(course => {
        const releasedBooks = (course.livros || []).filter(l => l.isReleased);
        
        const submittedIds = (atividades || []).map((at: any) => at.aula_id);
        const watchedIds = (progressoAulas || []).filter(p => p.concluida).map(p => p.aula_id);

        const getBookStats = (l: any) => {
          const allAulas = l.aulas || [];
          const itemsForProgress = allAulas.filter((a: any) => a.tipo !== 'prova' && a.tipo !== 'licao');
          const totalItems = itemsForProgress.length;
          if (totalItems === 0) return { percent: 0, completed: 0, total: 0, averageGrade: 10, isFinished: true, isApproved: true, examGrade: 10 };
          
          const completedItems = itemsForProgress.filter((a: any) => 
            a.tipo === 'atividade' ? submittedIds.includes(a.id) : watchedIds.includes(a.id)
          ).length;
          
          // Rule: Approved if has a 'prova' and grade >= min_grade (default 7), OR if no 'prova' exists
          const finalExam = allAulas.find((a: any) => a.tipo === 'prova');
          let isApproved = false;
          let examGrade = 0;
          let attemptsCount = 0;
          let isFinished = false;
          
          if (finalExam) {
            const examSubmissions = (atividades || []).filter(at => at.aula_id === finalExam.id);
            attemptsCount = examSubmissions.length;
            const bestSub = examSubmissions.sort((a,b) => (b.nota || 0) - (a.nota || 0))[0];
            examGrade = bestSub?.nota || 0;
            const minGrade = finalExam.min_grade || 7.0;
            isApproved = bestSub ? (bestSub.status === 'corrigida' && bestSub.nota >= minGrade) : false;
            // Finished if passed or exhausted
            isFinished = isApproved || attemptsCount >= 3;
          } else {
            // If no exam, the student is NEVER "approved" (system-wise), 
            // but can "finish" by consuming 100% of the content.
            isApproved = false;
            isFinished = (completedItems === totalItems && totalItems > 0);
          }
          
          return {
            percent: Math.round((completedItems / totalItems) * 100),
            completed: completedItems,
            total: totalItems,
            examGrade: examGrade,
            isApproved: isApproved,
            isFinished: isFinished,
            attemptsCount,
            hasExam: !!finalExam
          };
        };

        const sortedBooks = [...releasedBooks].sort((a,b) => {
          const statsA = getBookStats(a);
          const statsB = getBookStats(b);
          if (statsA.isFinished !== statsB.isFinished) return statsA.isFinished ? 1 : -1;
          return (a.ordem || 0) - (b.ordem || 0);
        });

        return (
          <div key={course.id} style={{ marginBottom: '4rem' }}>
            <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '4px', height: '24px', background: 'var(--primary)', borderRadius: '4px' }}></div>
              {course.nome}
            </h3>

            {/* All Modules List (Finished go to bottom) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              {sortedBooks.map(currentBook => {
                const stats = getBookStats(currentBook);
                return (
                  <div key={currentBook.id} className={`${stats.isFinished ? 'book-card-finished' : 'book-highlight-card'}`}>
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
                          {stats.isFinished ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span style={{ 
                                fontSize: '0.85rem', 
                                fontWeight: 800, 
                                color: stats.hasExam ? (stats.isApproved ? 'var(--success)' : 'var(--error)') : 'var(--primary)',
                                background: stats.hasExam ? (stats.isApproved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'rgba(var(--primary-rgb), 0.1)',
                                padding: '2px 10px',
                                borderRadius: '6px',
                                marginBottom: '4px'
                              }}>
                                {stats.hasExam 
                                  ? (stats.isApproved ? 'APROVADO' : 'REPROVADO - REFAZER NO FINAL')
                                  : 'CONCLUÍDO'}
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
                          className="btn btn-primary" 
                          style={{ width: 'auto', padding: '0.75rem 2rem', borderRadius: '12px' }}
                          onClick={() => setSelectedBook(selectedBook === currentBook.id ? null : currentBook.id)}
                        >
                          {selectedBook === currentBook.id ? 'Fechar Aulas' : (stats.isFinished ? 'Revisar Conteúdo' : 'Continuar Estudando')}
                        </button>
                      </div>

                      {/* Expanded Lessons Grid */}
                      {selectedBook === currentBook.id && (
                        <div style={{ marginTop: '2rem', animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {(() => {
                              const allAulas = currentBook.aulas || [];
                              const submittedIds = (atividades || []).map((at: any) => at.aula_id);
                              const watchedIds = (progressoAulas || []).filter(p => p.concluida).map(p => p.aula_id);

                              const isCompleted = (aula: any) => {
                                if (aula.tipo === 'gravada') return watchedIds.includes(aula.id);
                                return submittedIds.includes(aula.id);
                              };

                              const topLevelAulas = allAulas
                                .filter((a: any) => !a.parent_aula_id && !a.parent_id)
                                .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

                              return (
                                <>
                                  {topLevelAulas.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', gridColumn: '1/-1', textAlign: 'center' }}>Nenhum conteúdo disponível neste capítulo.</p>}
                                  
                                  {topLevelAulas.map(aula => {
                                    if (aula.tipo === 'licao') {
                                      const children = allAulas
                                        .filter((a: any) => a.id !== aula.id && (a.parent_aula_id === aula.id || a.parent_id === aula.id))
                                        .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
                                      
                                      const isAllCompleted = children.length > 0 && children.every((c: any) => 
                                        (c.tipo === 'atividade' || c.tipo === 'prova') ? submittedIds.includes(c.id) : watchedIds.includes(c.id)
                                      );

                                      return (
                                        <div key={aula.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: isAllCompleted ? '1px solid rgba(16, 185, 129, 0.1)' : '1px solid rgba(255,255,255,0.03)' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <BookOpen size={16} color="var(--primary)" />
                                            </div>
                                            <h4 style={{ margin: 0, fontSize: '1rem' }}>{aula.titulo}</h4>
                                          </div>
                                          
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {children.map(child => {
                                              const isChildCompleted = (child.tipo === 'atividade' || child.tipo === 'prova') ? submittedIds.includes(child.id) : watchedIds.includes(child.id);
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
                                          border: isCompleted(aula) ? '1px solid var(--success)' : (aula.tipo === 'prova' ? '1px solid rgba(234, 179, 8, 0.1)' : '1px solid rgba(255,255,255,0.03)'),
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
                                        {isCompleted(aula) && <CheckCircle2 size={16} color="var(--success)" />}
                                      </Link>
                                    );
                                  })}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {sortedBooks.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum módulo ativo no momento.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CourseList
