import React from 'react'
import { BookOpen, PlayCircle, ClipboardList, Award, Lock } from 'lucide-react'
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
}

const CourseList: React.FC<CourseListProps> = ({ 
  courses, 
  showArchives, 
  setShowArchives, 
  selectedBook, 
  setSelectedBook, 
  selectedLessonType, 
  setSelectedLessonType,
  atividades
}) => {
  const navigate = useNavigate()

  return (
    <div className="courses-grid">
      {courses.map(course => {
        const currentBook = course.livros.find(l => l.isCurrent) || course.livros.find(l => l.isReleased)
        const pastBooks = course.livros.filter(l => l.isReleased && l.id !== currentBook?.id)
        const isOpen = showArchives[course.id]

        return (
          <div key={course.id}>
            <h3 style={{ marginBottom: '2rem' }}>{course.nome}</h3>
            {currentBook && (
              <div className="book-highlight-card">
                <div 
                  onClick={() => navigate(`/book/${currentBook.id}`)} 
                  className="book-cover" 
                  style={{ background: currentBook.capa_url ? `url(${currentBook.capa_url}) center/cover` : 'var(--glass-border)' }}
                ></div>
                <div>
                  <h2>{currentBook.titulo}</h2>
                  <div className="book-actions">
                    <button onClick={() => navigate(`/book/${currentBook.id}`)} className="btn btn-primary">
                      <BookOpen size={20} /> Ler Livro
                    </button>
                    <button 
                      onClick={() => { 
                        setSelectedLessonType('video'); 
                        setSelectedBook(selectedBook === currentBook.id && selectedLessonType === 'video' ? null : currentBook.id) 
                      }} 
                      className="btn btn-outline"
                    >
                      <PlayCircle size={20} /> Vídeos
                    </button>
                    <button 
                      onClick={() => { 
                        setSelectedLessonType('atividade'); 
                        setSelectedBook(selectedBook === currentBook.id && selectedLessonType === 'atividade' ? null : currentBook.id) 
                      }} 
                      className="btn btn-outline"
                    >
                      <ClipboardList size={20} /> Atividades
                    </button>
                  </div>
                  {selectedBook === currentBook.id && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {currentBook.aulas.filter(a => selectedLessonType === 'video' ? (a.tipo === 'gravada' || a.tipo === 'ao_vivo') : (a.tipo === 'atividade' || a.tipo === 'prova')).map(a => {
                         const bookActivities = currentBook.aulas.filter(al => al.tipo === 'atividade');
                         const submittedIds = atividades.map((at: any) => at.aula_id);
                         const isLocked = a.tipo === 'prova' && bookActivities.some(bal => !submittedIds.includes(bal.id));
                         
                         return (
                           <div 
                             key={a.id} 
                             onClick={() => !isLocked && navigate(`/lesson/${a.id}`)} 
                             style={{ 
                               padding: '0.75rem 1rem', 
                               background: isLocked ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.02)', 
                               borderRadius: '8px', 
                               cursor: isLocked ? 'not-allowed' : 'pointer', 
                               display: 'flex', 
                               justifyContent: 'space-between',
                               alignItems: 'center', 
                               gap: '0.75rem', 
                               border: '1px solid rgba(255,255,255,0.05)',
                               opacity: isLocked ? 0.6 : 1
                             }} 
                             className="lesson-link-card"
                           >
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                               {a.tipo === 'prova' ? <Award size={18} color="#EAB308" /> : a.tipo === 'atividade' ? <ClipboardList size={18} color="var(--success)" /> : <PlayCircle size={18} color="var(--primary)" />} 
                               <span style={{ fontWeight: 500 }}>{a.titulo}</span>
                             </div>
                             {isLocked && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--error)', fontSize: '0.7rem' }}>
                               <Lock size={14} /> <span>Bloqueada</span>
                             </div>}
                           </div>
                         );
                       })}
                      {currentBook.aulas.filter(a => selectedLessonType === 'video' ? (a.tipo === 'gravada' || a.tipo === 'ao_vivo') : (a.tipo === 'atividade' || a.tipo === 'prova')).length === 0 && (
                         <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.5rem' }}>Nenhum item de {selectedLessonType === 'video' ? 'vídeo' : 'atividade'} disponível ainda.</p>
                      )}
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
