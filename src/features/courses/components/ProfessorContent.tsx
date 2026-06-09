import React, { useState, useEffect } from 'react'
import { BookOpen, Eye, PlayCircle, ShieldCheck, CheckSquare, Clock, Lock, Unlock, ClipboardList, FileText, GraduationCap, ChevronDown, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Link } from 'react-router-dom'
import { ProfessorCourse } from '../../../types/professor'
import ModuleCard from './cards/ModuleCard'
import ContentCard from './cards/ContentCard'
import { getTipoConfig, getRootForLesson } from './cards/contentTypes'

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
  hideReleaseControls?: boolean
}

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  gravada:   { label: 'Vídeo Aula',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: <PlayCircle size={18} /> },
  ao_vivo:   { label: 'Ao Vivo',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   icon: <PlayCircle size={18} /> },
  video:     { label: 'Vídeo',       color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: <PlayCircle size={18} /> },
  atividade: { label: 'Atividade',   color: '#10b981', bg: 'rgba(16,185,129,0.12)',   icon: <ClipboardList size={18} /> },
  exercicio: { label: 'Exercício de Fixação', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: <ClipboardList size={18} /> },
  prova:     { label: 'Prova',       color: '#eab308', bg: 'rgba(234,179,8,0.12)',    icon: <GraduationCap size={18} /> },
  licao:     { label: 'Lição',       color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   icon: <FileText size={18} /> },
  aula:      { label: 'Aula',        color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   icon: <FileText size={18} /> },
}

const DEFAULT_TIPO = { label: 'Aula', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: <FileText size={18} /> }

function GabaritoSummary({ questions }: { questions: any[] }) {
  const LETTERS = ['A', 'B', 'C', 'D', 'E']
  if (!questions || questions.length === 0) return null
  return (
    <div style={{
      marginTop: '0.75rem', padding: '0.75rem 1rem',
      background: 'rgba(34, 197, 94, 0.07)', border: '1px solid rgba(34, 197, 94, 0.2)',
      borderRadius: '12px'
    }}>
      <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <CheckCircle size={12} /> Gabarito Oficial ({questions.length} questões)
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {questions.map((q: any, idx: number) => {
          let ans = '?'
          if (q.type === 'true_false') ans = q.isTrue ? 'V' : 'F'
          else if (q.type === 'multiple_choice' || !q.type) {
            ans = typeof q.correct === 'number' ? (LETTERS[q.correct] || '?') : '?'
          } else if (q.type === 'matching') ans = '↔'
          else if (q.type === 'discursive') ans = '✍'
          const hasAns = ans !== '?'
          return (
            <div key={idx} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: hasAns ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${hasAns ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '8px', padding: '0.25rem 0.45rem', minWidth: '36px'
            }}>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: 1 }}>Q{idx + 1}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 900, color: hasAns ? '#22c55e' : 'var(--text-muted)', lineHeight: 1.3 }}>{ans}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
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
  hideReleaseControls = false
}) => {
  const [releases, setReleases] = useState<any[]>([])
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)

  useEffect(() => {
    fetchReleases()
  }, [])

  const fetchReleases = async () => {
    const { data } = await supabase.from('liberacoes_nucleo').select('*')
    if (data) setReleases(data)
  }

   const toggleRelease = async (nucleoId: string, itemId: string, itemType: string) => {
     const existing = releases.find(r => r.nucleo_id === nucleoId && r.item_id === itemId && r.item_type === itemType)
     try {
       if (existing) {
         const { error } = await supabase.from('liberacoes_nucleo').delete().eq('id', existing.id)
         if (error) throw error
       } else {
         const { error } = await supabase.from('liberacoes_nucleo').insert([{
           nucleo_id: nucleoId, item_id: itemId, item_type: itemType, liberado: true
         }])
         if (error) throw error
       }
       fetchReleases()
     } catch (err: any) {
       alert('Erro ao atualizar liberação: ' + err.message)
     }
   }

  const toggleModuleActive = async (bookId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('livros')
        .update({ professor_active: !currentStatus })
        .eq('id', bookId)
      if (error) throw error
      // Since we are not fetching books again in this component (they come from props), 
      // we might need to tell the parent to refresh or just rely on the fact that 
      // the UI will update on next load. However, we should ideally update the state.
      // But the 'books' are props.
    } catch (err: any) {
      alert('Erro ao ativar/desativar módulo: ' + err.message)
    }
  }

    const handleReleaseContent = async (nucleoId: string, book: any) => {
      if (!window.confirm(`Liberar TODO o CONTEÚDO (vídeos e lições) do módulo "${book.titulo}" para o polo selecionado? (Provas não serão liberadas)`)) return
      try {
        const { data: allLessons } = await supabase.from('aulas').select('id, tipo, is_bloco_final').eq('livro_id', book.id)
        if (!allLessons) return
        const releaseModulo = { nucleo_id: nucleoId, item_id: book.id, item_type: 'modulo', liberado: true }
        const itemsToRelease = allLessons
          .filter(l => !(l.tipo === 'prova' || !!l.is_bloco_final))
          .map(l => {
            const isVideo = l.tipo === 'gravada' || l.tipo === 'ao_vivo' || l.tipo === 'video'
            return { 
              nucleo_id: nucleoId, 
              item_id: l.id, 
               item_type: isVideo ? 'video' : 'atividade', 
              liberado: true 
            }
          })
        const { error } = await supabase.from('liberacoes_nucleo').upsert([releaseModulo, ...itemsToRelease], { onConflict: 'nucleo_id,item_id,item_type' })
        if (error) throw error
        fetchReleases()
        alert('Conteúdo liberado com sucesso!')
      } catch (err: any) {
        alert('Erro ao liberar conteúdo: ' + err.message)
      }
    }

    const handleReleaseExams = async (nucleoId: string, book: any) => {
      if (!window.confirm(`Liberar TODAS as PROVAS/ATIVIDADES do módulo "${book.titulo}" para o polo selecionado?`)) return
      try {
        const { data: allLessons } = await supabase.from('aulas').select('id, tipo, is_bloco_final').eq('livro_id', book.id)
        if (!allLessons) return
        const itemsToRelease = allLessons
          .filter(l => l.tipo === 'prova' || !!l.is_bloco_final)
          .map(l => ({ 
            nucleo_id: nucleoId, 
            item_id: l.id, 
            item_type: 'atividade', 
            liberado: true 
          }))
        
        if (itemsToRelease.length === 0) {
          alert('Nenhuma prova ou atividade encontrada neste módulo.');
          return;
        }

        const { error } = await supabase.from('liberacoes_nucleo').upsert(itemsToRelease, { onConflict: 'nucleo_id,item_id,item_type' })
        if (error) throw error
        fetchReleases()
        alert('Provas liberadas com sucesso!')
      } catch (err: any) {
        alert('Erro ao liberar provas: ' + err.message)
      }
    }
 
  const getBookCompletionStats = (book: any) => {
    const bookLessonIds = (book.aulas || []).map((l: any) => l.id)
    return (submissions || []).filter(sub => {
      const aulaId = sub.aulas?.id || sub.aula_id
      return bookLessonIds.includes(aulaId) && sub.status === 'corrigida' && (sub.nota || 0) >= 7.0
    }).length
  }

  const getBookGabaritoStats = (bookLessons: any[]) => {
    const withGabarito = bookLessons.filter(l =>
      (l.tipo === 'atividade' || l.tipo === 'exercicio' || l.tipo === 'avaliacao' || l.tipo === 'prova') &&
      Array.isArray(l.questionario) &&
      l.questionario.length > 0
    )
    const total = bookLessons.filter(l => l.tipo === 'atividade' || l.tipo === 'exercicio' || l.tipo === 'avaliacao' || l.tipo === 'prova').length
    return { filled: withGabarito.length, total }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {selectedCourse && (
            <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => { setSelectedCourse(null); setSelectedBook(null) }}>
              ← Voltar para Cursos
            </button>
          )}
          {selectedBook && (
            <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => setSelectedBook(null)}>
              ← Voltar para Módulos
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <ShieldCheck size={16} color="var(--success)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase' }}>Visualização Protegida</span>
        </div>
      </div>

      {/* === LISTA DE CURSOS === */}
      {!selectedCourse ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {courses.map(course => (
            <div key={course.id} className="course-card" style={{ padding: '2rem', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '20px' }}>
              <h3 style={{ marginBottom: '1rem' }}>{course.nome}</h3>
                       <div style={{ background: 'var(--glass)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <BookOpen size={16} color="var(--primary)" /> <strong>{course.livros?.length || 0} Módulos</strong>
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => { setSelectedCourse(course); fetchBooks(course.id) }}>Ver Módulos</button>
            </div>
          ))}
        </div>

      /* === LISTA DE MÓDULOS (LIVROS) === */
      ) : !selectedBook ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {books.map((book, idx) => {
            const completionCount = getBookCompletionStats(book)
            const bookLessons: any[] = book.aulas || []
            const gab = getBookGabaritoStats(bookLessons)
            return (
              <ModuleCard
                key={book.id}
                book={book}
                index={idx}
                completionCount={completionCount}
                gabaritoStats={gab}
                showReleaseControls={!hideReleaseControls}
                onOpenLessons={() => selectBookAndShowLessons(book)}
                         showReleaseBadges={!hideReleaseControls ? (lesson) => {
                           const isVideo = (lesson.tipo === 'gravada' || lesson.tipo === 'ao_vivo' || lesson.tipo === 'video');
                           const isExam = (lesson.tipo === 'prova' || !!lesson.is_bloco_final);
                           const itemType = isVideo ? 'video' : (isExam ? 'atividade' : 'licao');
                           return !releases.some(r => r.item_id === lesson.id && r.item_type === itemType);
                         } : undefined}
                 releaseControls={!hideReleaseControls && (
                   <div style={{ background: 'var(--glass)', padding: '0.85rem', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldCheck size={12} /> Acesso por Polo
                    </p>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                       <button onClick={() => toggleModuleActive(book.id, book.professor_active ?? true)} style={{
                         display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                         padding: '0.55rem 0.85rem', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '0.5rem',
                         background: (book.professor_active ?? true) ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                         border: `1px solid ${(book.professor_active ?? true) ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                          color: 'var(--text-main)', fontWeight: 800, fontSize: '0.8rem'
                        }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                           {(book.professor_active ?? true) ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                           <span>Status Global: {(book.professor_active ?? true) ? 'Ativo' : 'Inativo'}</span>
                         </div>
                            <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', background: 'rgba(0,0,0,0.1)', padding: '2px 8px', borderRadius: '20px', color: 'var(--text-main)' }}>
                            {(book.professor_active ?? true) ? 'Desativar' : 'Ativar'}
                          </span>
                       </button>
                       {professorNucleos.map(n => {
                         const isModReleased = releases.some(r => r.nucleo_id === n.id && r.item_id === book.id && r.item_type === 'modulo')
                         return (
                            <button key={n.id} onClick={() => toggleRelease(n.id, book.id, 'modulo')} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '0.55rem 0.85rem', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                              background: isModReleased ? 'rgba(16,185,129,0.15)' : 'var(--glass)',
                              border: `1px solid ${isModReleased ? 'rgba(16,185,129,0.3)' : 'var(--glass-border)'}`,
                            }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {isModReleased ? <Unlock size={14} color="#10b981" /> : <Lock size={14} style={{ opacity: 0.5, color: 'var(--primary)' }} />}
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isModReleased ? '#10b981' : 'var(--text-main)' }}>{n.nome}</span>
                          </div>
                          <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', background: isModReleased ? '#10b981' : 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: '20px' }}>
                            {isModReleased ? 'Ativo' : 'Ativar'}
                          </span>
                           </button>
                         )
                       })}
                     </div>

                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.6rem' }}>
                       <select onChange={(e) => { if (e.target.value) handleReleaseContent(e.target.value, book); e.target.value = '' }} className="form-control" style={{ fontSize: '0.7rem', height: '30px', padding: '0 0.5rem' }}>
                         <option value="">📚 Liberar CONTEÚDO para polo...</option>
                         {professorNucleos.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
                       </select>
                       <select onChange={(e) => { if (e.target.value) handleReleaseExams(e.target.value, book); e.target.value = '' }} className="form-control" style={{ fontSize: '0.7rem', height: '30px', padding: '0 0.5rem' }}>
                         <option value="">🎓 Liberar PROVAS para polo...</option>
                         {professorNucleos.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
                       </select>
                     </div>
                  </div>
                )}
              />
            )
          })}
          {books.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum módulo neste curso.</p>}
        </div>

      /* === GRID 4 COLUNAS - AULAS DO MÓDULO === */
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header do módulo */}
          <div style={{ padding: '1.5rem 2rem', background: 'rgba(168,85,247,0.08)', borderRadius: '20px', borderLeft: '5px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: 'var(--primary)', margin: 0, fontWeight: 800, fontSize: '1.3rem' }}>{selectedBook.titulo}</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                <Clock size={14} /> {lessons.length} aulas neste módulo
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {(() => {
                const gab = getBookGabaritoStats(lessons)
                return (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.5rem 1.2rem', borderRadius: '24px', background: gab.filled === gab.total && gab.total > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', color: gab.filled === gab.total && gab.total > 0 ? '#22c55e' : 'var(--text-muted)', border: `1px solid ${gab.filled === gab.total && gab.total > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                      ✓ Gabarito {gab.filled}/{gab.total}
                    </span>
                )
              })()}
            </div>
          </div>

          {/* Grid 4 colunas */}
          {(() => {
            const isVideoType = (t: string) => t === 'gravada' || t === 'ao_vivo' || t === 'video' || t === 'aula_video'
            const sortedAulas = [...lessons].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

            const panorama = sortedAulas.find((a: any) => a.ordem === 0 || a.titulo?.trim()?.toLowerCase() === 'panorama')

            const licoes = sortedAulas
              .filter((a: any) => {
                if (a.tipo === 'atividade' || a.tipo === 'exercicio' || a.tipo === 'avaliacao' || a.tipo === 'prova' || a.is_bloco_final) return false
                if (isVideoType(a.tipo)) return false
                if (a.video_url || a.url_video) return false
                if (a.ordem === 0) return false
                if (a.titulo?.trim()?.toLowerCase() === 'panorama') return false
                return true
              })
              .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

            const exercicios = sortedAulas
              .filter((a: any) => (a.tipo === 'atividade' || a.tipo === 'exercicio') && a.tipo !== 'prova' && !a.is_bloco_final)
              .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

            const videos = sortedAulas
              .filter((a: any) => isVideoType(a.tipo) || !!a.video_url || !!a.url_video)
              .filter((a: any) => a.tipo !== 'atividade' && a.tipo !== 'exercicio' && a.tipo !== 'avaliacao' && a.tipo !== 'prova' && !a.is_bloco_final)
              .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

            const avaliacoes = sortedAulas
              .filter((a: any) => a.tipo === 'avaliacao' || a.tipo === 'prova' || !!a.is_bloco_final)
              .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

            const avaliacoesGrid = Array.from({ length: 11 }, (_, i) => {
              const pos = i - 8
              return pos >= 0 && pos < avaliacoes.length ? avaliacoes[pos] : null
            })

            const gridData = {
              lessons: [panorama, ...licoes].slice(0, 11),
              exercises: [null, ...exercicios].slice(0, 11),
              avaliacoes: avaliacoesGrid,
              videos: [null, ...videos].slice(0, 11),
            }

            const maxRows = Math.max(gridData.lessons.length, gridData.exercises.length, gridData.avaliacoes.length, gridData.videos.length, 11)

            const hasAnyContent = gridData.lessons.some(l => l !== null) || gridData.exercises.some(e => e !== null) || gridData.avaliacoes.some(a => a !== null) || gridData.videos.some(v => v !== null)

            if (!hasAnyContent) {
              return (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--glass)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
                  <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '1rem', margin: '0 auto' }} />
                  <p style={{ color: 'var(--text-muted)' }}>Nenhuma aula cadastrada neste módulo.</p>
                </div>
              )
            }

            const renderGridItem = (item: any, label: string) => {
              if (!item) return <div style={{ height: '90px' }} />

              const hasGabarito = Array.isArray(item.questionario) && item.questionario.length > 0
              const isAvaliacao = item.tipo === 'avaliacao' || item.tipo === 'prova' || item.is_bloco_final
              const isExercicio = item.tipo === 'exercicio' || item.tipo === 'atividade'

              let borderColor = 'var(--glass-border)'
              if (isAvaliacao) borderColor = '#eab308'
              else if (isExercicio) borderColor = '#10b981'

              return (
                <Link
                  to={`/lesson/${item.id}`}
                  style={{
                    padding: '1.1rem',
                    background: 'var(--glass)',
                    border: `1px solid ${borderColor}`,
                    borderLeft: `5px solid ${borderColor}`,
                    borderRadius: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    transition: 'all 0.2s',
                    marginBottom: '0.5rem',
                    height: '90px',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: 'inherit'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass)' }}
                >
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isAvaliacao ? '#eab308' : isExercicio ? '#10b981' : 'var(--primary)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.titulo}
                    </div>
                    {hasGabarito && (
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#22c55e', marginTop: '2px' }}>
                        ✓ Gabarito
                      </div>
                    )}
                  </div>
                  <Eye size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </Link>
              )
            }

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '1rem', padding: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Lições</div>
                <div style={{ textAlign: 'center', fontWeight: 800, color: '#10b981', fontSize: '1rem', padding: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Exercícios</div>
                <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '1rem', padding: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Vídeos</div>
                <div style={{ textAlign: 'center', fontWeight: 800, color: '#eab308', fontSize: '1rem', padding: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Avaliações</div>

                {Array.from({ length: maxRows }).map((_, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {renderGridItem(gridData.lessons[rowIndex], rowIndex === 0 ? 'Panorama' : `Lição ${String(rowIndex).padStart(2, '0')}`)}
                    {renderGridItem(gridData.exercises[rowIndex], rowIndex === 0 ? '' : `Exercício ${String(rowIndex).padStart(2, '0')}`)}
                    {renderGridItem(gridData.videos[rowIndex], rowIndex === 0 ? '' : `Vídeo ${String(rowIndex).padStart(2, '0')}`)}
                    {renderGridItem(gridData.avaliacoes[rowIndex], rowIndex === 8 ? 'Avaliação' : rowIndex === 9 ? 'Recuperação' : rowIndex === 10 ? '2ª Recuperação' : '')}
                  </React.Fragment>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default ProfessorContent
