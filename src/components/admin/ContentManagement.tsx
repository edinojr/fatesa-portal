import React from 'react'
import { BookOpen, Edit, Trash2, ChevronRight, Plus, ClipboardList, Award, PlayCircle, Eye, FileText, Upload, CheckCircle2, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ContentManagementProps {
  courses: any[]
  selectedCourse: any | null
  setSelectedCourse: (course: any | null) => void
  selectedBook: any | null
  setSelectedBook: (book: any | null) => void
  selectedLesson: any | null
  setSelectedLesson: (lesson: any | null) => void
  books: any[]
  lessons: any[]
  lessonItems: any[]
  userRole: string | null
  actionLoading: string | null
  fetchData: () => Promise<void>
  fetchBooks: (courseId: string) => Promise<void>
  fetchLessons: (bookId: string) => Promise<void>
  fetchLessonItems: (lessonId: string) => Promise<void>
  handleDelete: (table: 'cursos' | 'livros' | 'aulas', id: string) => Promise<void>
  handleRemoveFile: (table: 'livros' | 'aulas', id: string, column: string) => Promise<void>
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, table: 'livros' | 'aulas', id: string, column: string) => Promise<void>
  setShowAddCourse: (val: boolean) => void
  setShowAddBook: (val: boolean) => void
  setShowAddLesson: (val: boolean) => void
  setShowAddContent: (val: boolean) => void
  setAddingLessonType: (val: string) => void
  setEditingItem: (val: { type: 'course' | 'book' | 'lesson' | 'content', data: any } | null) => void
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
  selectedLesson,
  setSelectedLesson,
  books,
  lessons,
  lessonItems,
  userRole,
  actionLoading,
  fetchData,
  fetchBooks,
  fetchLessons,
  fetchLessonItems,
  handleDelete,
  handleRemoveFile,
  handleFileUpload,
  setShowAddCourse,
  setShowAddBook,
  setShowAddLesson,
  setShowAddContent,
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
              onClick={() => { setSelectedCourse(null); setSelectedBook(null); setSelectedLesson(null); }}
            >
              <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar Cursos
            </button>
          )}
          {selectedBook && (
            <button 
              className="btn btn-outline" 
              style={{ width: 'auto', padding: '0.5rem' }} 
              onClick={() => { setSelectedBook(null); setSelectedLesson(null); }}
            >
              <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar Livros
            </button>
          )}
          {selectedLesson && (
            <button 
              className="btn btn-outline" 
              style={{ width: 'auto', padding: '0.5rem' }} 
              onClick={() => setSelectedLesson(null)}
            >
              <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar Lições
            </button>
          )}
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {!selectedCourse ? 'Todos os Cursos' : 
             !selectedBook ? `Livros de ${selectedCourse.nome}` : 
             !selectedLesson ? `Lições de ${selectedBook.titulo}` : 
             `Conteúdo de ${selectedLesson.titulo}`}
          </h3>
        </div>
        {(userRole === 'admin' || userRole === 'suporte' || userRole === 'professor') && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!selectedCourse ? (
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddCourse(true)}>
                <Plus size={20} /> Novo Curso
              </button>
            ) : !selectedBook ? (
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddBook(true)}>
                <Plus size={20} /> Novo Livro
              </button>
            ) : !selectedLesson ? (
              <button className="btn btn-primary" style={{ width: 'auto', background: 'var(--primary)' }} onClick={() => setShowAddLesson(true)}>
                <Plus size={18} /> Nova Lição
              </button>
            ) : (
              <>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setAddingLessonType('gravada'); setShowAddContent(true); }}>
                  <Plus size={18} /> Novo Vídeo
                </button>
                <button className="btn btn-primary" style={{ width: 'auto', background: 'var(--success)' }} onClick={() => { setAddingLessonType('atividade'); setShowAddContent(true); }}>
                  <ClipboardList size={18} /> Nova Atividade
                </button>
                <button className="btn btn-primary" style={{ width: 'auto', background: 'var(--accent)' }} onClick={() => { setAddingLessonType('prova'); setShowAddContent(true); }}>
                  <Award size={18} /> Nova Prova
                </button>
                <button className="btn btn-primary" style={{ width: 'auto', background: 'var(--text-muted)' }} onClick={() => { setAddingLessonType('material'); setShowAddContent(true); }}>
                  <FileText size={18} /> Novo Material
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {book.capa_url ? (
                    <img 
                      src={book.capa_url} 
                      alt="Capa" 
                      style={{ width: '50px', height: '70px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)' }} 
                      onClick={() => setEditingItem({ type: 'book', data: book })}
                      title="Clique para editar capa"
                    />
                  ) : (
                    <div 
                      style={{ width: '50px', height: '70px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px dashed var(--glass-border)' }}
                      onClick={() => setEditingItem({ type: 'book', data: book })}
                      title="Clique para adicionar capa"
                    >
                      <BookOpen size={20} color="var(--primary)" />
                    </div>
                  )}
                  <h4 style={{ fontSize: '1.25rem', marginBottom: 0 }}>{book.titulo}</h4>
                </div>
                {(userRole === 'admin' || userRole === 'suporte' || userRole === 'professor') && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setEditingItem({ type: 'book', data: book })} title="Editar Livro"><Edit size={16} /></button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem', color: 'var(--error)' }} onClick={() => handleDelete('livros', book.id)}><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Ordem: {book.ordem} • {book.aulas?.[0]?.count || 0} Lições
              </p>
              
              <button className="btn btn-primary" onClick={() => { setSelectedBook(book); fetchLessons(book.id); }}>Gerenciar Lições</button>
            </div>
          ))}
          {books.length === 0 && <p style={{ textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-muted)' }}>Nenhum livro cadastrado para este curso.</p>}
        </div>
      ) : !selectedLesson ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {lessons.map(lesson => (
            <div key={lesson.id} className="course-card" style={{ 
              padding: '2rem', 
              background: 'var(--glass)', 
              border: '1px solid var(--glass-border)',
              borderRadius: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1.25rem', marginBottom: 0 }}>{lesson.titulo}</h4>
                {(userRole === 'admin' || userRole === 'suporte' || userRole === 'professor') && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setEditingItem({ type: 'lesson', data: lesson })} title="Editar Lição"><Edit size={16} /></button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem', color: 'var(--error)' }} onClick={() => handleDelete('aulas', lesson.id)}><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Ordem: {lesson.ordem} • {lesson.children?.[0]?.count || 0} Itens de Conteúdo
              </p>
              
              <button className="btn btn-primary" onClick={() => { setSelectedLesson(lesson); fetchLessonItems(lesson.id); }}>Ver Conteúdo</button>
            </div>
          ))}
          {lessons.length === 0 && <p style={{ textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-muted)' }}>Nenhuma lição cadastrada para este livro.</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {lessonItems.map(item => (
            <div key={item.id} style={{ 
              padding: '1.5rem', 
              background: 'var(--glass)', 
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.05)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  {item.tipo === 'gravada' ? <PlayCircle size={24} /> : 
                   item.tipo === 'atividade' ? <ClipboardList size={24} /> : 
                   item.tipo === 'prova' ? <Award size={24} /> : 
                   item.tipo === 'material' ? <FileText size={24} /> : <FileText size={24} />}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{item.titulo}</h4>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {item.tipo === 'gravada' ? 'Vídeo Aula' : 
                     item.tipo === 'atividade' ? 'Atividade' : 
                     item.tipo === 'prova' ? 'Prova Final' : 
                     item.tipo === 'material' ? 'Material de Apoio' : item.tipo}
                    {item.ordem && ` • Ordem: ${item.ordem}`}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ marginRight: '1rem' }}>
                  <label className="btn btn-outline" style={{ width: 'auto', fontSize: '0.8rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
                    {uploading === item.id ? <Loader2 className="spinner" /> : <Upload size={14} />} {item.arquivo_url ? 'Alterar PDF' : 'Enviar PDF'}
                    <input type="file" hidden accept=".pdf" onChange={(e) => handleFileUpload(e, 'aulas', item.id, 'arquivo_url')} />
                  </label>
                </div>
                
                {(item.tipo === 'gravada' || item.tipo === 'ao_vivo') && (
                  <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => {
                    setEditingLessonContent(item);
                    setLessonBlocks(Array.isArray(item.conteudo) ? item.conteudo : []);
                    setLessonMaterials(Array.isArray(item.materiais) ? item.materiais : []);
                  }} title="Editar Conteúdo"><FileText size={18} /></button>
                )}
                
                {(item.tipo === 'prova' || item.tipo === 'atividade') && (
                  <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => { setEditingQuiz(item); setQuizQuestions(item.questionario || []); }} title="Editar Questões"><ClipboardList size={18} /></button>
                )}

                <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setEditingItem({ type: 'content', data: item })} title="Editar Detalhes"><Edit size={18} /></button>
                <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem', color: 'var(--error)' }} onClick={() => handleDelete('aulas', item.id)} title="Excluir"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
          {lessonItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--glass)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
              <p style={{ color: 'var(--text-muted)' }}>Nenhum conteúdo adicionado a esta lição.</p>
              <button className="btn btn-primary" style={{ width: 'auto', marginTop: '1rem' }} onClick={() => { setAddingLessonType('gravada'); setShowAddContent(true); }}>Adicionar Primeiro Item</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentManagement;
