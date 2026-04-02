import React, { useState, useEffect } from 'react'
import { BookOpen, Eye, PlayCircle, ShieldCheck, CheckSquare, Clock } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { ProfessorCourse } from '../../../types/professor'

interface ProfessorContentProps {
  courses: ProfessorCourse[]
  selectedCourse: any | null
  setSelectedCourse: (val: any | null) => void
  books: any[]
  selectedBook: any | null
  setSelectedBook: (val: any | null) => void
  lessons: any[]
  fetchBooks: (id: string) => void
  selectBookAndShowLessons: (book: any) => void
  professorNucleos: any[]
  submissions?: any[]
  profile?: any
}

const ProfessorContent: React.FC<ProfessorContentProps> = ({
  courses,
  selectedCourse,
  setSelectedCourse,
  books,
  selectedBook,
  setSelectedBook,
  lessons,
  fetchBooks,
  selectBookAndShowLessons,
  professorNucleos,
  submissions = [],
  profile
}) => {
  const [releases, setReleases] = useState<any[]>([])

  useEffect(() => {
    fetchReleases()
  }, [])

  const fetchReleases = async () => {
    const { data } = await supabase.from('liberacoes_nucleo').select('*')
    if (data) setReleases(data)
  }

  const toggleRelease = async (nucleoId: string, itemId: string, itemType: 'modulo' | 'atividade' | 'video') => {
    const existing = releases.find(r => r.nucleo_id === nucleoId && r.item_id === itemId && r.item_type === itemType)
    
    try {
      if (existing) {
        const { error } = await supabase.from('liberacoes_nucleo').delete().eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('liberacoes_nucleo').insert([{
          nucleo_id: nucleoId,
          item_id: itemId,
          item_type: itemType,
          liberado: true
        }])
        if (error) throw error
      }
      fetchReleases()
    } catch (err: any) {
      alert('Erro ao atualizar liberação: ' + err.message)
    }
  }

  // Count how many students passed/finished this book
  const getBookCompletionStats = (book: any) => {
    const bookLessonIds = (book.aulas || []).map((l: any) => l.id)
    const finishedCount = (submissions || []).filter(sub => {
      const aulaId = sub.aulas?.id || sub.aula_id
      return bookLessonIds.includes(aulaId) && sub.status === 'corrigida' && (sub.nota || 0) >= 7.0
    }).length
    return finishedCount
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {selectedCourse && (
            <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => { setSelectedCourse(null); setSelectedBook(null); }}>
              Voltar para Cursos
            </button>
          )}
          {selectedBook && (
            <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => setSelectedBook(null)}>
              Voltar para Livros
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <ShieldCheck size={16} color="var(--success)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase' }}>Visualização Protegida</span>
        </div>
      </div>

      {!selectedCourse ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {courses.map(course => (
            <div key={course.id} className="course-card" style={{ padding: '2rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '20px' }}>
              <h3 style={{ marginBottom: '1rem' }}>{course.nome}</h3>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <BookOpen size={16} color="var(--primary)" /> <strong>{course.livros?.length || 0} Livros</strong>
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => { setSelectedCourse(course); fetchBooks(course.id); }}>Ver Conteúdo</button>
            </div>
          ))}
        </div>
      ) : !selectedBook ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {books.map(book => {
            const completionCount = getBookCompletionStats(book)
            return (
              <div key={book.id} className="course-card" style={{ padding: '1.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>{book.titulo}</h4>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckSquare size={12} /> {completionCount} Alunos Finalizados
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.02)', flexGrow: 1 }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Ativar para Núcleo:</p>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {professorNucleos.map(n => {
                        const isReleased = releases.some(r => r.nucleo_id === n.id && r.item_id === book.id && r.item_type === 'modulo');
                        return (
                          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem 0.25rem 0.25rem 0.75rem', borderRadius: '8px', border: `1px solid ${isReleased ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: isReleased ? '#fff' : 'rgba(255,255,255,0.5)' }}>{n.nome}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleRelease(n.id, book.id, 'modulo'); }}
                              style={{ 
                                fontSize: '0.6rem', 
                                padding: '4px 8px', 
                                borderRadius: '6px',
                                background: isReleased ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                border: `1px solid ${isReleased ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                                color: isReleased ? 'var(--error)' : 'var(--success)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}
                              title={isReleased ? 'Desativar Módulo' : 'Ativar Módulo'}
                            >
                              {isReleased ? 'Desativar' : 'Ativar'}
                            </button>
                          </div>
                        )
                      })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => selectBookAndShowLessons(book)}>Aulas</button>
                  <Link 
                    className="btn btn-outline" 
                    style={{ width: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                    to={`/book/${book.id}`} 
                    title="Ver Módulo como Aluno"
                  >
                    <Eye size={18} />
                  </Link>
                </div>
              </div>
            )
          })}
          {books.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum livro neste curso.</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', borderLeft: '4px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ color: 'var(--primary)', margin: 0 }}>Aulas de {selectedBook.titulo}</h4>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} /> {lessons.length} aulas disponíveis
            </div>
          </div>
          {lessons.map(lesson => (
            <div key={lesson.id} style={{ padding: '1.25rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <PlayCircle size={24} color="var(--primary)" />
                <div>
                  <h5 style={{ fontSize: '1rem', fontWeight: 600 }}>{lesson.titulo}</h5>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lesson.tipo === 'gravada' ? 'Vídeo Aula' : lesson.tipo === 'atividade' ? 'Atividade' : lesson.tipo === 'prova' ? 'Prova' : 'Aula ao Vivo'}</p>
                </div>
              </div>

              {(() => {
                const isExam = lesson.tipo === 'prova' || !!lesson.is_bloco_final;
                const isAutoExam = isExam && (lesson.titulo?.toUpperCase().includes('V2') || lesson.titulo?.toUpperCase().includes('V3'));
                const itemType = isExam ? 'atividade' : (lesson.tipo === 'gravada' || lesson.tipo === 'ao_vivo') ? 'video' : null;

                if (!itemType || isAutoExam) return null;

                return (
                  <div style={{ flex: 1, margin: '0 1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                      Controle de Acesso ({lesson.tipo === 'prova' ? 'Prova V1' : 'Vídeo-Aula'}):
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {professorNucleos.map(n => {
                        const isReleased = releases.some(r => r.nucleo_id === n.id && r.item_id === lesson.id && r.item_type === itemType);
                        return (
                          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem 0.25rem 0.25rem 0.75rem', borderRadius: '8px', border: `1px solid ${isReleased ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isReleased ? '#fff' : 'rgba(255,255,255,0.5)' }}>{n.nome}</span>
                            <button 
                              onClick={() => toggleRelease(n.id, lesson.id, itemType)}
                              style={{ 
                                fontSize: '0.65rem', 
                                padding: '4px 8px', 
                                borderRadius: '6px',
                                background: isReleased ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                border: `1px solid ${isReleased ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                                color: isReleased ? 'var(--error)' : 'var(--success)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}
                            >
                              {isReleased ? 'Desativar' : 'Ativar'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link 
                  className="btn btn-outline" 
                  style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }} 
                  to={`/lesson/${lesson.id}`}
                >
                  <Eye size={18} /> Ver Aula
                </Link>
              </div>
            </div>
          ))}
          {lessons.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma aula cadastrada ainda.</p>}
        </div>
      )}
    </div>
  )
}

export default ProfessorContent
