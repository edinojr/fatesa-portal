import React from 'react'
import { BookOpen, Edit, Trash2, ChevronRight, Plus, ClipboardList, Award, PlayCircle, Eye, FileText, Upload, CheckCircle2, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ContentManagementProps {
  courses: any[]
  selectedCourse: any | null
  setSelectedCourse: (course: any | null) => void
  selectedBook: any | null
  setSelectedBook: (book: any | null) => void
  books: any[]
  lessons: any[]
  userRole: string | null
  actionLoading: string | null
  fetchData: () => Promise<void>
  fetchBooks: (courseId: string) => Promise<void>
  fetchLessons: (bookId: string) => Promise<void>
  handleDelete: (table: 'cursos' | 'livros' | 'aulas', id: string) => Promise<void>
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, table: 'livros' | 'aulas', id: string, column: string) => Promise<void>
  setShowAddCourse: (val: boolean) => void
  setShowAddBook: (val: boolean) => void
  setShowAddLesson: (val: boolean) => void
  setAddingLessonType: (val: string) => void
  setEditingItem: (val: { type: 'course' | 'book' | 'lesson', data: any } | null) => void
  setEditingLessonContent: (val: any) => void
  setLessonBlocks: (val: any[]) => void
  setLessonMaterials: (val: any[]) => void
  setEditingQuiz: (val: any) => void
  setQuizQuestions: (val: any[]) => void
  uploading: string | null
}

const ContentManagement: React.FC<ContentManagementProps> = ({
  courses,
  selectedCourse,
  setSelectedCourse,
  selectedBook,
  setSelectedBook,
  books,
  lessons,
  userRole,
  actionLoading,
  fetchData,
  fetchBooks,
  fetchLessons,
  handleDelete,
  handleFileUpload,
  setShowAddCourse,
  setShowAddBook,
  setShowAddLesson,
  setAddingLessonType,
  setEditingItem,
  setEditingLessonContent,
  setLessonBlocks,
  setLessonMaterials,
  setEditingQuiz,
  setQuizQuestions,
  uploading
}) => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Header for Content Tab */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {selectedCourse && (
            <button 
              className="btn btn-outline" 
              style={{ width: 'auto', padding: '0.5rem' }} 
              onClick={() => { setSelectedCourse(null); setSelectedBook(null); }}
            >
              <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar Cursos
            </button>
          )}
          {selectedBook && (
            <button 
              className="btn btn-outline" 
              style={{ width: 'auto', padding: '0.5rem' }} 
              onClick={() => setSelectedBook(null)}
            >
              <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar Livros
            </button>
          )}
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {!selectedCourse ? 'Todos os Cursos' : !selectedBook ? `Livros de ${selectedCourse.nome}` : `Aulas de ${selectedBook.titulo}`}
          </h3>
        </div>
        {(userRole === 'admin' || userRole === 'suporte') && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!selectedCourse ? (
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddCourse(true)}>
                <Plus size={20} /> Novo Curso
              </button>
            ) : !selectedBook ? (
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddBook(true)}>
                <Plus size={20} /> Novo Livro
              </button>
            ) : (
              <>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setAddingLessonType('gravada'); setShowAddLesson(true); }}>
                  <Plus size={18} /> Nova Aula
                </button>
                <button className="btn btn-primary" style={{ width: 'auto', background: 'var(--success)' }} onClick={() => { setAddingLessonType('atividade'); setShowAddLesson(true); }}>
                  <ClipboardList size={18} /> Nova Atividade
                </button>
                <button className="btn btn-primary" style={{ width: 'auto', background: 'var(--accent)' }} onClick={() => { setAddingLessonType('prova'); setShowAddLesson(true); }}>
                  <Award size={18} /> Nova Prova
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Conditional Rendering of Lists */}
      {!selectedCourse ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          {courses.map(course => (
            <div key={course.id} className="course-card" style={{ 
              padding: '2.5rem', 
              background: 'var(--glass)', 
              border: '1px solid var(--glass-border)',
              borderRadius: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{course.nome}</h3>
                {(userRole === 'admin' || userRole === 'suporte') && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setEditingItem({ type: 'course', data: course })}><Edit size={16} /></button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem', color: 'var(--error)' }} onClick={() => handleDelete('cursos', course.id)}><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <BookOpen size={18} color="var(--primary)" /> 
                  <strong>{course.livros?.[0]?.count || 0} Livros</strong>
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => { setSelectedCourse(course); fetchBooks(course.id); }}>Gerenciar Conteúdo</button>
            </div>
          ))}
        </div>
      ) : !selectedBook ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {books.map(book => (
            <div key={book.id} className="course-card" style={{ 
              padding: '2rem', 
              background: 'var(--glass)', 
              border: '1px solid var(--glass-border)',
              borderRadius: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1.25rem', marginBottom: 0 }}>{book.titulo}</h4>
                {(userRole === 'admin' || userRole === 'suporte') && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setEditingItem({ type: 'book', data: book })} title="Editar Livro"><Edit size={16} /></button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem', color: 'var(--error)' }} onClick={() => handleDelete('livros', book.id)}><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Ordem: {book.ordem}</p>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>PDF do Livro:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', width: 'auto', cursor: 'pointer' }}>
                    {uploading === book.id ? <Loader2 className="spinner" /> : <Upload size={14} />} {book.pdf_url ? 'Alterar PDF' : 'Enviar PDF'}
                    <input type="file" hidden accept=".pdf" onChange={(e) => handleFileUpload(e, 'livros', book.id, 'pdf_url')} />
                  </label>
                  {book.pdf_url && <CheckCircle2 size={16} color="var(--success)" />}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setSelectedBook(book); fetchLessons(book.id); }}>Gerenciar Aulas</button>
                <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => navigate(`/book/${book.id}`)} title="Visualizar Livro"><Eye size={18} /></button>
              </div>
            </div>
          ))}
          {books.length === 0 && <p style={{ textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-muted)' }}>Nenhum livro cadastrado para este curso.</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {lessons.map(lesson => (
            <div key={lesson.id} style={{ 
              padding: '1.5rem', 
              background: 'var(--glass)', 
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', background: lesson.tipo === 'prova' ? 'rgba(234, 179, 8, 0.1)' : lesson.tipo === 'atividade' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(168, 85, 247, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {lesson.tipo === 'prova' ? <Award size={20} color="#EAB308" /> : lesson.tipo === 'atividade' ? <ClipboardList size={20} color="var(--success)" /> : <PlayCircle size={20} color="var(--primary)" />}
                </div>
                <div>
                  <h5 style={{ fontWeight: 600, fontSize: '1rem' }}>{lesson.titulo}</h5>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lesson.tipo === 'prova' ? 'Prova' : lesson.tipo === 'atividade' ? 'Atividade Prática' : lesson.tipo === 'gravada' ? 'Vídeo Aula' : 'Aula ao Vivo'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(lesson.tipo === 'gravada' || lesson.tipo === 'ao_vivo') && (
                  <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => navigate(`/lesson/${lesson.id}`)} title="Visualizar Aula"><Eye size={18} /></button>
                )}
                {(userRole === 'admin' || userRole === 'suporte') && (
                  <>
                    {(lesson.tipo === 'gravada' || lesson.tipo === 'ao_vivo') && (
                      <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => {
                        setEditingLessonContent(lesson);
                        setLessonBlocks(Array.isArray(lesson.conteudo) ? lesson.conteudo : []);
                        setLessonMaterials(Array.isArray(lesson.materiais) ? lesson.materiais : []);
                      }} title="Editor de Conteúdo"><FileText size={18} /></button>
                    )}
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setEditingItem({ type: 'lesson', data: lesson })} title="Editar Nome"><Edit size={16} /></button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem 0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { setEditingQuiz(lesson); setQuizQuestions(lesson.questionario || []) }} title="Estruturar">
                      <ClipboardList size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{lesson.tipo === 'prova' ? 'Estruturar Prova' : lesson.tipo === 'atividade' ? 'Estruturar Atividade' : 'Adicionar Atividade'}</span>
                    </button>
                    <button className="btn" style={{ width: 'auto', color: 'var(--error)', padding: '0.5rem' }} onClick={() => handleDelete('aulas', lesson.id)}><Trash2 size={16} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
          {lessons.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma aula cadastrada para este livro.</p>}
        </div>
      )}
    </div>
  );
};

export default ContentManagement;
