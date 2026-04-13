import React, { useState } from 'react'
import { BookOpen, Edit, Trash2, ChevronRight, Plus, ClipboardList, Award, PlayCircle, Eye, FileText, Upload, Loader2, ChevronUp, ChevronDown, Layers, GripVertical } from 'lucide-react'
import { Link } from 'react-router-dom'

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
  handleDelete: (table: 'cursos' | 'livros' | 'aulas', id: string) => void
  handleRemoveFile: (table: 'livros' | 'aulas', id: string, column: string) => void
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, table: 'livros' | 'aulas', id: string, column: string) => Promise<void>
  handleReorder: (id: string, direction: 'up' | 'down', items: any[], fetchFn: () => void, table: 'livros' | 'aulas') => Promise<void>
  handleMoveTo: (id: string, targetId: string | null, items: any[], fetchFn: () => void, table: 'livros' | 'aulas', targetBlocoId?: number | null) => Promise<void>
  setShowAddCourse: (val: boolean) => void
  setShowAddBook: (val: boolean) => void
  setShowAddLesson: (val: boolean) => void
  setShowAddContent: (val: boolean) => void
  setAddingLessonType: (val: string) => void
  setAddingBloco: (val: number | null) => void
  setEditingItem: (val: { type: 'course' | 'book' | 'lesson' | 'content', data: any } | null) => void
  setEditingLessonContent: (val: any) => void
  setLessonBlocks: (val: any[]) => void
  setLessonMaterials: (val: any[]) => void
  setEditingQuiz: (val: any) => void
  setQuizQuestions: (val: any[]) => void
  uploading: string | null
  cleanupExcessExams?: () => Promise<void>
}

const groupByBloco = (items: any[]): Map<number, any[]> => {
  const map = new Map<number, any[]>()
  for (const item of items) {
    const key = item.bloco_id ?? 0
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  map.forEach((arr) => arr.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)))
  return map
}

const tipoLabel = (tipo: string) => {
  switch (tipo) {
    case 'gravada': return 'Vídeo Aula'
    case 'ao_vivo': return 'Aula ao Vivo'
    case 'atividade': return 'Exercício'
    case 'prova': return 'Prova Final'
    case 'material': return 'Lição/Material'
    default: return tipo
  }
}

const tipoIcon = (tipo: string, size = 20) => {
  switch (tipo) {
    case 'gravada': return <PlayCircle size={size} color="var(--primary)" />
    case 'ao_vivo': return <PlayCircle size={size} color="#38bdf8" />
    case 'atividade': return <ClipboardList size={size} color="var(--success)" />
    case 'prova': return <Award size={size} color="#EAB308" />
    default: return <FileText size={size} color="var(--text-muted)" />
  }
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
  fetchBooks,
  fetchLessons,
  fetchLessonItems,
  handleDelete,
  handleRemoveFile,
  handleFileUpload,
  handleReorder,
  handleMoveTo,
  setShowAddCourse,
  setShowAddBook,
  setShowAddLesson,
  setShowAddContent,
  setAddingLessonType,
  setAddingBloco,
  setEditingItem,
  setEditingLessonContent,
  setLessonBlocks,
  setLessonMaterials,
  setEditingQuiz,
  setQuizQuestions,
  uploading,
  cleanupExcessExams
}) => {
  const [reorderLoading, setReorderLoading] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const canEdit = userRole === 'admin' || userRole === 'suporte' || userRole === 'professor'

  const nextBloco = lessonItems.length > 0
    ? Math.max(...lessonItems.map(i => i.bloco_id ?? 0)) + 1
    : 1

  const handleAddToBloco = (tipo: string, bloco: number) => {
    setAddingLessonType(tipo)
    setAddingBloco(bloco)
    setShowAddContent(true)
  }

  const doReorder = async (id: string, direction: 'up' | 'down', items: any[], fetchFn: () => void, table: 'livros' | 'aulas' = 'aulas') => {
    setReorderLoading(id + direction)
    await handleReorder(id, direction, items, fetchFn, table)
    setReorderLoading(null)
  }

  // HTML5 Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    // Optional: cursor feedback
    const ghost = e.currentTarget.cloneNode(true) as HTMLElement
    ghost.style.opacity = '0.5'
  }

  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (id !== dragOverId) setDragOverId(id)
  }

  const onDrop = async (e: React.DragEvent, targetId: string | null, items: any[], fetchFn: () => void, table: 'livros' | 'aulas' = 'aulas', targetBlocoId?: number | null) => {
    e.preventDefault()
    setDragOverId(null)
    const id = e.dataTransfer.getData('text/plain')
    if (id === targetId && targetBlocoId === undefined) return
    
    setReorderLoading(id + 'drag')
    await handleMoveTo(id, targetId, items, fetchFn, table, targetBlocoId)
    setReorderLoading(null)
    setDraggedId(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {selectedCourse && (
            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }}
              onClick={() => { setSelectedCourse(null); setSelectedBook(null); setSelectedLesson(null); }}>
              <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar Cursos
            </button>
          )}
          {selectedBook && (
            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }}
              onClick={() => { setSelectedBook(null); setSelectedLesson(null); }}>
              <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar Livros
            </button>
          )}
          {selectedLesson && (
            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }}
              onClick={() => setSelectedLesson(null)}>
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

        {canEdit && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!selectedCourse ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {cleanupExcessExams && (
                  <button className="btn btn-maintenance" style={{ width: 'auto', gap: '0.4rem' }}
                    onClick={cleanupExcessExams}
                    title="Limpar versões duplicadas de provas em todo o sistema">
                    <Trash2 size={16} /> Corrigir Sistema
                  </button>
                )}
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddCourse(true)}>
                  <Plus size={20} /> Novo Curso
                </button>
              </div>
            ) : !selectedBook ? (
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddBook(true)}>
                <Plus size={20} /> Novo Livro
              </button>
            ) : !selectedLesson ? (
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddLesson(true)}>
                <Plus size={18} /> Nova Lição
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" style={{ width: 'auto', gap: '0.4rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                  onClick={() => { setAddingBloco(null); setAddingLessonType('material'); setShowAddContent(true); }}
                  title="Upload de Múltiplos Arquivos">
                  <Upload size={16} /> Upload Múltiplo
                </button>
                <button className="btn btn-primary" style={{ width: 'auto', gap: '0.4rem' }}
                  onClick={() => { setAddingBloco(nextBloco); setAddingLessonType('material'); setShowAddContent(true); }}
                  title="Adicionar novo bloco">
                  <Layers size={16} /> Novo Bloco #{nextBloco}
                </button>
                <button className="btn btn-primary" style={{ width: 'auto', gap: '0.4rem', background: '#EAB308', borderColor: '#EAB308', color: '#000' }}
                  onClick={() => { setAddingBloco(nextBloco); setAddingLessonType('prova'); setShowAddContent(true); }}
                  title="Adicionar Avaliação Final em novo bloco">
                  <Award size={16} /> Prova Final
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Courses ── */}
      {!selectedCourse ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          {courses.map(course => (
            <div key={course.id} className="course-card" style={{ padding: '2.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '24px' }}>
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
                  <BookOpen size={18} color="var(--primary)" /> <strong>{course.livros?.[0]?.count || 0} Livros</strong>
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => { setSelectedCourse(course); fetchBooks(course.id); }}>Gerenciar Conteúdo</button>
            </div>
          ))}
        </div>

      /* ── Books ── */
      ) : !selectedBook ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {books.map(book => (
            <div key={book.id} className="course-card" style={{ padding: '2rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {book.capa_url ? (
                    <img src={book.capa_url} alt="Capa" style={{ width: '50px', height: '70px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)' }}
                      onClick={() => setEditingItem({ type: 'book', data: book })} title="Clique para editar capa" />
                  ) : (
                    <div style={{ width: '50px', height: '70px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px dashed var(--glass-border)' }}
                      onClick={() => setEditingItem({ type: 'book', data: book })} title="Clique para adicionar capa">
                      <BookOpen size={20} color="var(--primary)" />
                    </div>
                  )}
                  <h4 style={{ fontSize: '1.25rem', marginBottom: 0 }}>{book.titulo}</h4>
                </div>
                {canEdit && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* Reorder arrows for books */}
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem' }} 
                      disabled={books.findIndex(b => b.id === book.id) === 0}
                      onClick={() => doReorder(book.id, 'up', books, () => fetchBooks(selectedCourse.id), 'livros')}>
                      {reorderLoading === book.id + 'up' ? <Loader2 size={14} className="spinner" /> : <ChevronUp size={14} />}
                    </button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem' }} 
                      disabled={books.findIndex(b => b.id === book.id) === books.length - 1}
                      onClick={() => doReorder(book.id, 'down', books, () => fetchBooks(selectedCourse.id), 'livros')}>
                      {reorderLoading === book.id + 'down' ? <Loader2 size={14} className="spinner" /> : <ChevronDown size={14} />}
                    </button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setEditingItem({ type: 'book', data: book })}><Edit size={16} /></button>
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

      /* ── Lessons ── */
      ) : !selectedLesson ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {lessons.map((lesson, idx) => (
            <div key={lesson.id} className="course-card" style={{ padding: '2rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1.25rem', marginBottom: 0 }}>{lesson.titulo}</h4>
                {canEdit && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* Reorder arrows */}
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem' }} disabled={idx === 0}
                      onClick={() => doReorder(lesson.id, 'up', lessons, () => fetchLessons(selectedBook.id), 'aulas')}>
                      {reorderLoading === lesson.id + 'up' ? <Loader2 size={14} className="spinner" /> : <ChevronUp size={14} />}
                    </button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem' }} disabled={idx === lessons.length - 1}
                      onClick={() => doReorder(lesson.id, 'down', lessons, () => fetchLessons(selectedBook.id), 'aulas')}>
                      {reorderLoading === lesson.id + 'down' ? <Loader2 size={14} className="spinner" /> : <ChevronDown size={14} />}
                    </button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} onClick={() => setEditingItem({ type: 'lesson', data: lesson })}><Edit size={16} /></button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem', color: 'var(--error)' }} onClick={() => handleDelete('aulas', lesson.id)}><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Ordem: {lesson.ordem} • {lesson.children?.[0]?.count || 0} Itens de Conteúdo
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setSelectedLesson(lesson); fetchLessonItems(lesson.id); }}>Ver Conteúdo</button>
                {canEdit && (
                  <label className="btn btn-outline" style={{ width: 'auto', cursor: 'pointer', padding: '0.85rem' }} title={lesson.arquivo_url ? 'Alterar PDF anexado' : 'Anexar novo PDF'}>
                    {uploading === lesson.id ? <Loader2 size={18} className="spinner" /> : <Upload size={18} />}
                    <input type="file" hidden accept=".pdf" onChange={(e) => handleFileUpload(e, 'aulas', lesson.id, 'arquivo_url')} />
                  </label>
                )}
                {canEdit && lesson.arquivo_url && (
                  <button className="btn btn-outline" style={{ width: 'auto', padding: '0.85rem', color: 'var(--error)' }} title="Remover PDF" onClick={() => handleRemoveFile('aulas', lesson.id, 'arquivo_url')}>
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {lessons.length === 0 && <p style={{ textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-muted)' }}>Nenhuma lição cadastrada para este livro.</p>}
        </div>

      /* ── Lesson Items grouped by Bloco ── */
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {lessonItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--glass)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
              <Layers size={40} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Nenhum conteúdo adicionado. Crie o primeiro bloco.</p>
              <button className="btn btn-primary" style={{ width: 'auto' }}
                onClick={() => { setAddingBloco(1); setAddingLessonType('material'); setShowAddContent(true); }}>
                <Plus size={18} /> Criar Bloco 1
              </button>
            </div>
          ) : (
            <>
              {(() => {
              const grouped = groupByBloco(lessonItems)
              const sortedBlocoKeys = Array.from(grouped.keys()).sort((a, b) => a - b)

              return sortedBlocoKeys.map(blocoKey => {
                const items = grouped.get(blocoKey)!
                const hasVideo = items.some(i => i.tipo === 'gravada' || i.tipo === 'ao_vivo')
                const lessonsCount = items.filter(i => i.tipo === 'material' || (!['gravada','ao_vivo','atividade','prova'].includes(i.tipo))).length
                const exercisesCount = items.filter(i => i.tipo === 'atividade' || i.tipo === 'prova').length
                const videosCount = items.filter(i => i.tipo === 'gravada' || i.tipo === 'ao_vivo').length

                return (
                  <div key={blocoKey} style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '20px', overflow: 'hidden' }}>
                    {/* Block Header */}
                    <div 
                      onDragOver={(e) => onDragOver(e, 'bloco-' + blocoKey)}
                      onDrop={(e) => onDrop(e, null, lessonItems, () => fetchLessonItems(selectedLesson.id), 'aulas', blocoKey)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '1rem 1.5rem', 
                        background: blocoKey === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(var(--primary-rgb), 0.08)', 
                        borderBottom: '1px solid var(--glass-border)',
                        borderTop: dragOverId === 'bloco-' + blocoKey ? '2px solid var(--primary)' : 'none'
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Layers size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                          {blocoKey === 0 ? 'Sem Bloco Atribuído' : `Bloco ${blocoKey}`}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                          {lessonsCount} lição(ões) · {exercisesCount} exercício(s) · {videosCount} vídeo(s)
                        </span>
                      </div>
                      {canEdit && blocoKey !== 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
                            onClick={() => handleAddToBloco('material', blocoKey)} title="Adicionar lição/material a este bloco">
                            <Plus size={14} /> Lição
                          </button>
                          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: 'var(--success)' }}
                            onClick={() => handleAddToBloco('atividade', blocoKey)} title="Adicionar exercício a este bloco">
                            <Plus size={14} /> Exercício
                          </button>
                          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: 'var(--primary)' }}
                            onClick={() => handleAddToBloco('gravada', blocoKey)} title="Adicionar vídeo-aula a este bloco">
                            <Plus size={14} /> Vídeo
                          </button>
                          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: '#EAB308', borderColor: 'rgba(234, 179, 8, 0.3)' }}
                            onClick={() => handleAddToBloco('prova', blocoKey)} title="Adicionar Prova Final a este bloco">
                            <Award size={14} /> Prova Final
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Items list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {items.filter(i => !i.is_bloco_final).map((item, idx) => (
                        <div 
                          key={item.id} 
                          draggable={canEdit}
                          onDragStart={(e) => onDragStart(e, item.id)}
                          onDragOver={(e) => onDragOver(e, item.id)}
                          onDrop={(e) => onDrop(e, item.id, lessonItems, () => fetchLessonItems(selectedLesson.id), 'aulas')}
                          className={item.tipo === 'prova' || item.is_bloco_final ? 'prova-final-item' : ''}
                          style={{
                            padding: '1rem 1.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                            transition: 'all 0.2s ease',
                            borderTop: dragOverId === item.id ? '2px solid var(--primary)' : 'none',
                            opacity: draggedId === item.id ? 0.4 : 1,
                            background: item.tipo === 'gravada' || item.tipo === 'ao_vivo'
                              ? 'rgba(var(--primary-rgb), 0.04)'
                              : item.tipo === 'atividade' || item.tipo === 'prova'
                              ? 'rgba(16,185,129,0.03)'
                              : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {canEdit && (
                              <div style={{ cursor: 'grab', color: 'var(--text-muted)', opacity: 0.5, display: 'flex', alignItems: 'center' }} title="Clique e arraste para reordenar">
                                <GripVertical size={20} />
                              </div>
                            )}

                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {tipoIcon(item.tipo, 18)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{item.titulo}</h4>
                                {item.is_bloco_final && (
                                  <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: '#EAB308', color: '#000', borderRadius: '4px', fontWeight: 900, textTransform: 'uppercase' }}>
                                    Avaliação Final
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tipoLabel(item.tipo)}</span>
                                {item.tipo === 'gravada' && (
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(var(--primary-rgb),0.15)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '6px' }}>
                                    🔓 Auto-liberado ao concluir o bloco
                                  </span>
                                )}
                                {(item.tipo === 'atividade' || item.tipo === 'prova') && (
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '1px 6px', borderRadius: '6px' }}>
                                    🔐 Liberado pelo professor
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {(item.tipo !== 'atividade' && item.tipo !== 'prova') && (
                              <label className="btn btn-outline" style={{ width: 'auto', fontSize: '0.75rem', padding: '0.4rem 0.7rem', cursor: 'pointer' }}>
                                {uploading === item.id ? <Loader2 size={12} className="spinner" /> : <Upload size={12} />} {item.arquivo_url ? 'Alterar PDF' : 'Enviar PDF'}
                                <input type="file" hidden accept=".pdf" onChange={(e) => handleFileUpload(e, 'aulas', item.id, 'arquivo_url')} />
                              </label>
                            )}

                            {(item.tipo === 'gravada' || item.tipo === 'ao_vivo') && (
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem' }}
                                onClick={() => { setEditingLessonContent(item); setLessonBlocks(Array.isArray(item.conteudo) ? item.conteudo : []); setLessonMaterials(Array.isArray(item.materiais) ? item.materiais : []); }}
                                title="Editar Conteúdo">
                                <FileText size={14} />
                              </button>
                            )}

                            {(item.tipo === 'prova' || item.tipo === 'atividade') && (
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem' }}
                                onClick={() => { setEditingQuiz(item); setQuizQuestions(item.questionario || []); }}
                                title="Editar Questões">
                                <ClipboardList size={14} />
                              </button>
                            )}

                            <Link to={`/lesson/${item.id}`} className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem', textDecoration: 'none', color: 'inherit', display: 'flex' }} title="Visualizar">
                              <Eye size={14} />
                            </Link>

                            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem' }} onClick={() => setEditingItem({ type: 'content', data: item })} title="Editar"><Edit size={14} /></button>
                            <button className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem', color: 'var(--error)' }} onClick={() => handleDelete('aulas', item.id)} title="Excluir"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Block legend */}
                    {blocoKey !== 0 && (
                      <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: lessonsCount >= 2 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {lessonsCount >= 2 ? '✓' : '○'} {lessonsCount}/2 lições
                        </span>
                        <span style={{ fontSize: '0.7rem', color: exercisesCount >= 2 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {exercisesCount >= 2 ? '✓' : '○'} {exercisesCount}/2 exercícios
                        </span>
                        <span style={{ fontSize: '0.7rem', color: hasVideo ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {hasVideo ? '✓' : '○'} {videosCount}/1 vídeo-aula
                        </span>
                      </div>
                    )}
                  </div>
                )
              })
              })()}

              {/* Dedicated Final Assessment Section at the bottom */}
              {canEdit && (
                <div style={{ marginTop: '2rem', padding: '2rem', background: 'rgba(234, 179, 8, 0.05)', border: '2px dashed #EAB308', borderRadius: '24px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Award size={40} color="#EAB308" />
                    <div>
                      <h3 style={{ margin: 0, color: '#EAB308', fontSize: '1.25rem', fontWeight: 800 }}>AVALIAÇÃO FINAL DO MÓDULO</h3>
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Esta prova será exibida ao aluno somente após a conclusão de todos os blocos acima.
                      </p>
                    </div>
                    
                    {lessonItems.filter(i => i.is_bloco_final).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '600px' }}>
                        {lessonItems.filter(i => i.is_bloco_final)
                          .sort((a,b) => (a.versao || 0) - (b.versao || 0))
                          .map(item => (
                          <div key={item.id} className="prova-final-item" style={{ width: '100%', background: 'var(--glass)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(234, 179, 8, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
                              <div style={{ width: '40px', height: '40px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Award size={20} color="#EAB308" />
                              </div>
                              <div>
                                <strong style={{ display: 'block' }}>{item.titulo}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nota Mínima: {item.min_grade || 7}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} 
                                onClick={() => { setEditingQuiz(item); setQuizQuestions(item.questionario || []); }}
                                title="Questões"><ClipboardList size={16} /></button>
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem' }} 
                                onClick={() => setEditingItem({ type: 'content', data: item })}
                                title="Editar"><Edit size={16} /></button>
                              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem', color: 'var(--error)' }} 
                                onClick={() => handleDelete('aulas', item.id)}
                                title="Excluir"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button className="btn btn-primary" style={{ width: 'auto', background: '#EAB308', color: '#000', marginTop: '1rem' }}
                        onClick={() => { setAddingBloco(nextBloco); setAddingLessonType('prova'); setShowAddContent(true); }}>
                        <Plus size={20} /> Criar Prova Final
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ContentManagement
