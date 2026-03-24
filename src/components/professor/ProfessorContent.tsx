import React from 'react'
import { BookOpen, Eye, PlayCircle, Plus, Trash2, Edit2, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import QuizEditorModal from '../admin/modals/QuizEditorModal'
import { useNavigate } from 'react-router-dom'
import { ProfessorCourse } from '../../types/professor'

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
  profile: any
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
  profile
}) => {
  const navigate = useNavigate()
  const [addingActivity, setAddingActivity] = React.useState(false)
  const [editingQuiz, setEditingQuiz] = React.useState<any>(null)
  const [quizQuestions, setQuizQuestions] = React.useState<any[]>([])
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)

  const handleAddActivity = async () => {
    if (!selectedBook) return
    setAddingActivity(true)
    try {
      const { data, error } = await supabase
        .from('aulas')
        .insert([{
          titulo: 'Nova Atividade',
          tipo: 'atividade',
          livro_id: selectedBook.id,
          nucleo_id: profile?.nucleo_id,
          questionario: [],
          ordem: lessons.length + 1
        }])
        .select()
        .single()
      
      if (error) throw error
      if (data) {
        setQuizQuestions([])
        setEditingQuiz(data)
        selectBookAndShowLessons(selectedBook) // Refresh list
      }
    } catch (err: any) {
      alert('Erro ao criar atividade: ' + err.message)
    } finally {
      setAddingActivity(false)
    }
  }

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('Excluir esta atividade?')) return
    try {
      const { error } = await supabase.from('aulas').delete().eq('id', id)
      if (error) throw error
      selectBookAndShowLessons(selectedBook)
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {books.map(book => (
            <div key={book.id} className="course-card" style={{ padding: '1.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '16px' }}>
              <h4 style={{ marginBottom: '1.5rem' }}>{book.titulo}</h4>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => selectBookAndShowLessons(book)}>Aulas</button>
                <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => navigate(`/book/${book.id}`)}><Eye size={18} /></button>
              </div>
            </div>
          ))}
          {books.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum livro neste curso.</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', borderLeft: '4px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ color: 'var(--primary)', margin: 0 }}>Aulas de {selectedBook.titulo}</h4>
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleAddActivity} disabled={addingActivity}>
              {addingActivity ? <Loader2 className="spinner" /> : <><Plus size={18} /> Nova Atividade</>}
            </button>
          </div>
          {lessons.map(lesson => (
            <div key={lesson.id} style={{ padding: '1.25rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <PlayCircle size={24} color="var(--primary)" />
                <div>
                  <h5 style={{ fontSize: '1rem', fontWeight: 600 }}>{lesson.titulo}</h5>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lesson.tipo === 'gravada' ? 'Vídeo Aula' : 'Aula ao Vivo'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => navigate(`/lesson/${lesson.id}`)}><Eye size={18} /> Ver</button>
                {lesson.tipo === 'atividade' && lesson.nucleo_id === profile?.nucleo_id && (
                  <>
                    <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => { setEditingQuiz(lesson); setQuizQuestions(lesson.questionario || []); }}><Edit2 size={18} /></button>
                    <button className="btn btn-outline" style={{ width: 'auto', color: 'var(--error)' }} onClick={() => handleDeleteActivity(lesson.id)}><Trash2 size={18} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
          {lessons.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma aula cadastrada ainda.</p>}
        </div>
      )}

      {editingQuiz && (
        <QuizEditorModal 
          editingQuiz={editingQuiz}
          setEditingQuiz={setEditingQuiz}
          quizQuestions={quizQuestions}
          setQuizQuestions={setQuizQuestions}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          supabase={supabase}
          showToast={(msg) => alert(msg)}
          fetchLessons={async () => selectBookAndShowLessons(selectedBook)}
          selectedBook={selectedBook}
        />
      )}
    </div>
  )
}

export default ProfessorContent
