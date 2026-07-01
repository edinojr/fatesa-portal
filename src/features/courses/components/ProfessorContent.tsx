import React, { useState, useEffect } from 'react'
import { BookOpen, Eye, PlayCircle, ShieldCheck, CheckSquare, Clock, Lock, Unlock, ClipboardList, FileText, GraduationCap, ChevronDown, ChevronRight, CheckCircle, AlertCircle, ToggleLeft, ToggleRight, Zap } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { ProfessorCourse } from '../../../types/professor'
import ModuleCard from './cards/ModuleCard'
import ContentCard from './cards/ContentCard'
import { getTipoConfig, getRootForLesson } from './cards/contentTypes'
import QuizEditorModal from './modals/QuizEditorModal'

interface ProfessorContentProps {
  courses: ProfessorCourse[]
  selectedCourse: any | null
  setSelectedCourse: (val: any | null) => void
  books: any[]
  setBooks: (books: any[] | ((prev: any[]) => any[])) => void
  selectedBook: any | null
  setSelectedBook: (val: any | null) => void
  lessons: any[]
  setLessons: (lessons: any[] | ((prev: any[]) => any[])) => void
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
          } else if (q.type === 'matching') ans = q.matchingPairs?.map((p: any) => `${p.left} → ${p.right}`).join('; ') || '↔'
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
  setBooks,
  selectedBook,
  setSelectedBook,
  lessons,
  setLessons,
  fetchBooks,
  selectBookAndShowLessons,
  professorNucleos,
  submissions = [],
  hideReleaseControls = false
}) => {
  const navigate = useNavigate()
  const [releases, setReleases] = useState<any[]>([])
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)
  const [selectedNucleus, setSelectedNucleus] = useState<string>('')
  const [editingQuiz, setEditingQuiz] = useState<any>(null)
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])

  useEffect(() => {
    fetchReleases()
  }, [])

  const fetchReleases = async () => {
    const { data } = await supabase.from('liberacoes_nucleo').select('*')
    if (data) setReleases(data)
  }

  const toggleRelease = async (nucleoId: string, itemId: string, itemType: string) => {
    const existing = releases.find(r => r.nucleo_id === nucleoId && r.item_id === itemId && r.item_type === itemType)
    
    // Optimistic update for immediate UI response
    setReleases(prev => {
      if (existing) {
        return prev.filter(r => !(r.nucleo_id === nucleoId && r.item_id === itemId && r.item_type === itemType));
      } else {
        return [...prev, { nucleo_id: nucleoId, item_id: itemId, item_type: itemType, liberado: true, id: 'temp-' + Date.now() }];
      }
    });

    try {
      if (existing) {
        const { error } = await supabase.from('liberacoes_nucleo').delete().match({
          nucleo_id: nucleoId,
          item_id: itemId,
          item_type: itemType
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from('liberacoes_nucleo').upsert([{
          nucleo_id: nucleoId, item_id: itemId, item_type: itemType, liberado: true
        }], { onConflict: 'nucleo_id, item_id, item_type' })
        if (error) throw error
      }
      // Não busca do DB após sucesso — o update otimista é confiável
      // e evita RLS que esconda registros do admin.
    } catch (err: any) {
      alert('Erro ao atualizar liberação: ' + err.message)
      await fetchReleases() // Rollback state on error
    }
  }

  const toggleModuleActive = async (bookId: string, currentStatus: boolean) => {
    try {
      const { data: colCheck, error: colError } = await supabase.from('livros').select('professor_active').eq('id', bookId).maybeSingle()
      if (colError && colError.code === '42703') {
        alert('Coluna professor_active não existe na tabela livros. Execute a migration pendente.')
        return
      }
      const { error } = await supabase
        .from('livros')
        .update({ professor_active: !currentStatus })
        .eq('id', bookId)
      if (error) {
        console.error('[toggleModuleActive] Supabase error:', error)
        throw error
      }
      
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, professor_active: !currentStatus } : b))
      if (selectedBook && selectedBook.id === bookId) {
        setSelectedBook({ ...selectedBook, professor_active: !currentStatus })
      }
    } catch (err: any) {
      const msg = err?.message || err?.details || JSON.stringify(err)
      console.error('[toggleModuleActive] Exception:', err)
      alert('Erro ao ativar/desativar módulo: ' + msg)
    }
  }

    const handleReleaseContent = async (nucleoId: string, book: any) => {
      if (!window.confirm(`Liberar TODO o CONTEÚDO (vídeos e lições) do módulo "${book.titulo}" para o polo selecionado? (Provas não serão liberadas)`)) return
      try {
        const { data: allLessons } = await supabase.from('aulas').select('id, tipo, is_bloco_final').eq('livro_id', book.id)
        if (!allLessons) return
        const releaseModulo = { nucleo_id: nucleoId, item_id: book.id, item_type: 'modulo', liberado: true }
        const itemsToRelease = allLessons
          .filter(l => !(l.tipo === 'prova' || l.tipo === 'avaliacao' || !!l.is_bloco_final))
          .map(l => {
            const isVideo = l.tipo === 'gravada' || l.tipo === 'ao_vivo' || l.tipo === 'video'
            return { 
              nucleo_id: nucleoId, 
              item_id: l.id, 
               item_type: isVideo ? 'video' : 'atividade', 
              liberado: true 
            }
          })
        const { data: upserted, error } = await supabase.from('liberacoes_nucleo').upsert([releaseModulo, ...itemsToRelease], { onConflict: 'nucleo_id, item_id, item_type' }).select()
        if (error) throw error
        if (upserted) {
          setReleases(prev => {
            const ids = new Set(upserted.map((u: any) => `${u.nucleo_id}_${u.item_id}_${u.item_type}`))
            return [...prev.filter(r => !ids.has(`${r.nucleo_id}_${r.item_id}_${r.item_type}`)), ...upserted]
          })
        }
        alert('Conteúdo liberado com sucesso!')
      } catch (err: any) {
        alert('Erro ao liberar conteúdo: ' + err.message)
      }
    }

    const handleReleaseExams = async (nucleoId: string, currentBook: any) => {
      try {
        const { data: currentExams } = await supabase
          .from('aulas')
          .select('id')
          .eq('livro_id', currentBook.id)
          .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true')
          .order('ordem', { ascending: true })
          .limit(1);

        let itemsToRelease: Array<{ nucleo_id: string; item_id: any; item_type: string; liberado: boolean }> = [];

        if (currentExams) {
          currentExams.forEach(exam => {
            itemsToRelease.push({
              nucleo_id: nucleoId,
              item_id: exam.id,
              item_type: 'atividade',
              liberado: true
            });
          });
        }

        // Find next module by ordem
        let nextBook: any = null;
        if (typeof currentBook.ordem === 'number' && currentBook.curso_id) {
          const { data: nb } = await supabase
            .from('livros')
            .select('id')
            .eq('ordem', currentBook.ordem + 1)
            .eq('curso_id', currentBook.curso_id)
            .maybeSingle();
          nextBook = nb;
        }

        if (nextBook) {
          // Liberar conteúdo (lições + exercícios) do próximo módulo
          const { data: nextContent } = await supabase
            .from('aulas')
            .select('id, tipo')
            .eq('livro_id', nextBook.id)
            .not('tipo', 'eq', 'prova')
            .not('tipo', 'eq', 'avaliacao');

          if (nextContent) {
            nextContent.forEach(item => {
              const isVideo = item.tipo === 'video' || item.tipo === 'gravada' || item.tipo === 'ao_vivo';
              itemsToRelease.push({
                nucleo_id: nucleoId,
                item_id: item.id,
                item_type: isVideo ? 'video' : 'atividade',
                liberado: true
              });
            });
          }

          // Ativar o próximo módulo (professor_active = true) para que alunos o vejam
          await supabase.from('livros').update({ professor_active: true }).eq('id', nextBook.id);
          setBooks(prev => prev.map(b => b.id === nextBook.id ? { ...b, professor_active: true } : b));
          if (selectedBook && selectedBook.id === nextBook.id) {
            setSelectedBook({ ...selectedBook, professor_active: true });
          }
        }

        if (itemsToRelease.length === 0) return;

        const { data: upserted, error } = await supabase.from('liberacoes_nucleo').upsert(itemsToRelease, {
          onConflict: 'nucleo_id, item_id, item_type'
        }).select();
        if (error) throw error;

        if (upserted) {
          setReleases(prev => {
            const ids = new Set(upserted.map((u: any) => `${u.nucleo_id}_${u.item_id}_${u.item_type}`))
            return [...prev.filter(r => !ids.has(`${r.nucleo_id}_${r.item_id}_${r.item_type}`)), ...upserted]
          })
        }

        alert("Avaliação V1 liberada! O módulo seguinte foi ativado automaticamente com seu conteúdo (lições e exercícios) liberado para o polo.");
      } catch (error: any) {
        console.error("Erro na liberação circular:", error);
        alert('Erro ao liberar provas: ' + (error?.message || error));
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

  const isLessonReleased = (lessonId: string, lessonTipo: string, isBlocoFinal?: boolean) => {
    if (!selectedNucleus) return true
    const isVideo = lessonTipo === 'gravada' || lessonTipo === 'ao_vivo' || lessonTipo === 'video'
    const isExam = lessonTipo === 'prova' || lessonTipo === 'avaliacao' || isBlocoFinal
    
    if (isExam) {
      const itemType = isVideo ? 'video' : 'atividade'
      return releases.some(r => r.nucleo_id === selectedNucleus && r.item_id === lessonId && r.item_type === itemType)
    }
    
    return releases.some(r => {
      if (r.nucleo_id !== selectedNucleus || r.item_id !== lessonId) return false
      return r.item_type === 'video' || r.item_type === 'atividade'
    })
  }

  const getLessonGabarito = (lesson: any) => {
    if (!Array.isArray(lesson.questionario) || lesson.questionario.length === 0) return null
    const LETTERS = ['A', 'B', 'C', 'D', 'E']
    return lesson.questionario.map((q: any) => {
      if (q.type === 'true_false') return q.isTrue ? 'V' : 'F'
      if (q.type === 'multiple_choice' || !q.type) return typeof q.correct === 'number' ? (LETTERS[q.correct] || '?') : '?'
      if (q.type === 'matching') return q.matchingPairs?.map((p: any) => `${p.left} → ${p.right}`).join('; ') || '↔'
      if (q.type === 'discursive') return '✍'
      return '?'
    })
  }

  const handleToggleLessonRelease = async (lessonId: string, lessonTipo: string, isBlocoFinal?: boolean) => {
    if (!selectedNucleus) {
      alert('Selecione um polo primeiro.')
      return
    }
    const isVideo = lessonTipo === 'gravada' || lessonTipo === 'ao_vivo' || lessonTipo === 'video'
    const itemType = isVideo ? 'video' : 'atividade'
    await toggleRelease(selectedNucleus, lessonId, itemType)
  }

  const toggleLessonActive = async (lessonId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('aulas')
        .update({ professor_active: !currentStatus })
        .eq('id', lessonId)
      if (error) throw error
      
      setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, professor_active: !currentStatus } : l))
    } catch (err: any) {
      alert('Erro ao ativar/desativar avaliação: ' + err.message)
    }
  }

  const handleToggleBlockModule = async () => {
    if (!selectedBook) return
    const isCurrentlyActive = selectedBook.professor_active ?? true
    const isReleasedForNucleus = selectedNucleus ? releases.some(r => r.nucleo_id === selectedNucleus && r.item_id === selectedBook.id && r.item_type === 'modulo') : false

    if (!isCurrentlyActive || !isReleasedForNucleus) {
      const nucleusToUse = selectedNucleus || professorNucleos[0]?.id
      if (!nucleusToUse) {
        alert('Selecione um polo primeiro.')
        return
      }
      try {
        const { data: allLessons } = await supabase.from('aulas').select('id, tipo, is_bloco_final').eq('livro_id', selectedBook.id)
        const releaseModulo = { nucleo_id: nucleusToUse, item_id: selectedBook.id, item_type: 'modulo', liberado: true }
        const itemsToRelease = (allLessons || [])
          .filter(l => !(l.tipo === 'prova' || l.tipo === 'avaliacao' || !!l.is_bloco_final))
          .map(l => {
            const isVideo = l.tipo === 'gravada' || l.tipo === 'ao_vivo' || l.tipo === 'video'
            return { nucleo_id: nucleusToUse, item_id: l.id, item_type: isVideo ? 'video' : 'atividade', liberado: true }
          })
        await supabase.from('liberacoes_nucleo').upsert([releaseModulo, ...itemsToRelease], { onConflict: 'nucleo_id, item_id, item_type' })
        await supabase.from('livros').update({ professor_active: true }).eq('id', selectedBook.id)
        setBooks(prev => prev.map(b => b.id === selectedBook.id ? { ...b, professor_active: true } : b))
        setSelectedBook({ ...selectedBook, professor_active: true })
        await fetchReleases()
        alert('Módulo liberado com sucesso!')
      } catch (err: any) {
        alert('Erro ao liberar módulo: ' + err.message)
      }
    } else {
      if (!window.confirm(`Bloquear TODO o conteúdo do módulo "${selectedBook.titulo}"? Os alunos não podrán mais ver este módulo.`)) return
      try {
        await supabase.from('livros').update({ professor_active: false }).eq('id', selectedBook.id)
        await supabase.from('liberacoes_nucleo').delete().eq('item_id', selectedBook.id).eq('item_type', 'modulo')
        setBooks(prev => prev.map(b => b.id === selectedBook.id ? { ...b, professor_active: false } : b))
        setSelectedBook({ ...selectedBook, professor_active: false })
        await fetchReleases()
        setSelectedBook(null)
        alert('Módulo bloqueado! Alunos não verão mais este conteúdo.')
      } catch (err: any) {
        alert('Erro ao bloquear módulo: ' + err.message)
      }
    }
  }

  const getV1Status = (avaliacoes: any[]) => {
    const v1 = avaliacoes.find((a: any) => (a.versao || 1) === 1)
    if (!v1) return { hasV1: false, v1Active: false, v1Id: null }
    return {
      hasV1: true,
      v1Active: v1.professor_active !== false,
      v1Id: v1.id,
      v1Lesson: v1
    }
  }

  const isV2Unlocked = (avaliacoes: any[]) => {
    const v1 = avaliacoes.find((a: any) => (a.versao || 1) === 1)
    if (!v1) return false
    if (v1.professor_active === false) return false
    const hasGab = Array.isArray(v1.questionario) && v1.questionario.length > 0
    if (!hasGab) return false
    // V2 unlocks ONLY if student FAILED V1 (nota < min_grade)
    const v1Failed = (submissions || []).some(
      (s: any) => s.aula_id === v1.id && s.status === 'corrigida' && (s.nota || 0) < (v1.min_grade || 7)
    )
    return v1Failed
  }

  const isV3Unlocked = (avaliacoes: any[]) => {
    const v2 = avaliacoes.find((a: any) => (a.versao || 1) === 2)
    if (!v2) return isV2Unlocked(avaliacoes)
    if (v2.professor_active === false) return false
    const hasGab = Array.isArray(v2.questionario) && v2.questionario.length > 0
    if (!hasGab) return false
    // V3 unlocks ONLY if student FAILED V2 (nota < min_grade)
    const v2Failed = (submissions || []).some(
      (s: any) => s.aula_id === v2.id && s.status === 'corrigida' && (s.nota || 0) < (v2.min_grade || 7)
    )
    return v2Failed
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
                            const itemType = isVideo ? 'video' : 'atividade';
                           return !releases.some(r => r.item_id === lesson.id && r.item_type === itemType);
                         } : undefined}
releaseControls={!hideReleaseControls && (
                    <div style={{ background: 'var(--glass)', padding: '0.85rem', borderRadius: '14px', border: '1px solid var(--glass-border)', position: 'relative', zIndex: 10 }}>
                     <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                       <ShieldCheck size={12} /> Acesso por Polo
                     </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleModuleActive(book.id, book.professor_active ?? true); }} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.55rem 0.85rem', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '0.5rem',
                          background: (book.professor_active ?? true) ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                          border: `1px solid ${(book.professor_active ?? true) ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                           color: 'var(--text-main)', fontWeight: 800, fontSize: '0.8rem', position: 'relative', zIndex: 11
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
                             <button type="button" key={n.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleRelease(n.id, book.id, 'modulo'); }} style={{
                               display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                               padding: '0.55rem 0.85rem', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                               background: isModReleased ? 'rgba(16,185,129,0.15)' : 'var(--glass)',
                               border: `1px solid ${isModReleased ? 'rgba(16,185,129,0.3)' : 'var(--glass-border)'}`, position: 'relative', zIndex: 11
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
                       <select onChange={(e) => { if (e.target.value) handleReleaseContent(e.target.value, book); e.target.value = '' }} className="form-control" style={{ fontSize: '0.7rem', height: '30px', padding: '0 0.5rem', position: 'relative', zIndex: 11 }}>
                          <option value="">📚 Liberar CONTEÚDO para polo...</option>
                          {professorNucleos.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
                        </select>
                        <select onChange={(e) => { if (e.target.value) handleReleaseExams(e.target.value, book); e.target.value = '' }} className="form-control" style={{ fontSize: '0.7rem', height: '30px', padding: '0 0.5rem', position: 'relative', zIndex: 11 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Header do módulo */}
          <div style={{ padding: '1rem 1.5rem', background: 'rgba(168,85,247,0.08)', borderRadius: '14px', borderLeft: '4px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              {!hideReleaseControls && selectedBook && (
                <button
                  onClick={handleToggleBlockModule}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.5rem 1rem', borderRadius: '10px', cursor: 'pointer',
                    background: (selectedBook.professor_active ?? true) ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                    border: `1px solid ${(selectedBook.professor_active ?? true) ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
                    color: (selectedBook.professor_active ?? true) ? '#ef4444' : '#10b981',
                    fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.2s'
                  }}
                >
                  {(selectedBook.professor_active ?? true) ? <><Lock size={14} /> Bloquear Módulo</> : <><Unlock size={14} /> Liberar Módulo</>}
                </button>
              )}
            </div>
          </div>

          {/* Controles de liberação do módulo */}
          {!hideReleaseControls && (
            <div style={{ padding: '1rem 1.5rem', background: 'var(--glass)', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={16} color="var(--primary)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>Controle de Liberação do Módulo</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Polo:</span>
                  <select
                    value={selectedNucleus}
                    onChange={(e) => setSelectedNucleus(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.75rem', height: '32px', padding: '0 0.5rem', minWidth: '180px' }}
                  >
                    <option value="">Selecione um polo...</option>
                    {professorNucleos.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleModuleActive(selectedBook.id, selectedBook.professor_active ?? true); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 1rem', borderRadius: '10px', cursor: 'pointer',
                    background: (selectedBook.professor_active ?? true) ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${(selectedBook.professor_active ?? true) ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: 'var(--text-main)', fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.2s'
                  }}
                >
                  {(selectedBook.professor_active ?? true) ? <ToggleRight size={16} color="#10b981" /> : <ToggleLeft size={16} color="#ef4444" />}
                  {(selectedBook.professor_active ?? true) ? 'Módulo Ativo' : 'Módulo Inativo'}
                </button>

                {selectedNucleus ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleRelease(selectedNucleus, selectedBook.id, 'modulo'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 1rem', borderRadius: '10px', cursor: 'pointer',
                      background: releases.some(r => r.nucleo_id === selectedNucleus && r.item_id === selectedBook.id && r.item_type === 'modulo') ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${releases.some(r => r.nucleo_id === selectedNucleus && r.item_id === selectedBook.id && r.item_type === 'modulo') ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      color: 'var(--text-main)', fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.2s'
                    }}
                  >
                    {releases.some(r => r.nucleo_id === selectedNucleus && r.item_id === selectedBook.id && r.item_type === 'modulo') ? <Unlock size={14} color="#10b981" /> : <Lock size={14} />}
                    {releases.some(r => r.nucleo_id === selectedNucleus && r.item_id === selectedBook.id && r.item_type === 'modulo') ? 'Módulo Liberado' : 'Liberar Módulo'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); alert('Selecione um polo primeiro.'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 1rem', borderRadius: '10px', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.2s'
                    }}
                  >
                    <Lock size={14} /> Selecione polo para liberar
                  </button>
                )}

                {selectedNucleus && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleReleaseContent(selectedNucleus, selectedBook); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem', borderRadius: '10px', cursor: 'pointer',
                        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                        color: 'var(--text-main)', fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.2s'
                      }}
                    >
                      <BookOpen size={14} color="#3b82f6" /> Liberar Conteúdo
                    </button>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleReleaseExams(selectedNucleus, selectedBook); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem', borderRadius: '10px', cursor: 'pointer',
                        background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)',
                        color: 'var(--text-main)', fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.2s'
                      }}
                    >
                      <GraduationCap size={14} color="#eab308" /> Liberar Provas
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

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

            const totalGridRows = Math.max(
              [panorama, ...licoes].length,
              [null, ...exercicios].length,
              [null, ...videos].length,
              avaliacoes.length,
              1
            )
            const avaliacoesStartRow = totalGridRows - avaliacoes.length
            const avaliacoesGrid = Array.from({ length: totalGridRows }, (_, i) => {
              const pos = i - avaliacoesStartRow
              return pos >= 0 && pos < avaliacoes.length ? avaliacoes[pos] : null
            })

            const gridData = {
              lessons: [panorama, ...licoes],
              exercises: [null, ...exercicios],
              avaliacoes: avaliacoesGrid,
              videos: [null, ...videos],
            }

            const maxRows = Math.max(gridData.lessons.length, gridData.exercises.length, gridData.avaliacoes.length, gridData.videos.length)

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
              if (!item) return <div style={{ height: '80px' }} />

              const hasGabarito = Array.isArray(item.questionario) && item.questionario.length > 0
              const isAvaliacao = item.tipo === 'avaliacao' || item.tipo === 'prova' || item.is_bloco_final
              const isExercicio = item.tipo === 'exercicio' || item.tipo === 'atividade'
              const isReleased = isLessonReleased(item.id, item.tipo, item.is_bloco_final)
              const gabarito = getLessonGabarito(item)

              let borderColor = 'var(--glass-border)'
              if (isAvaliacao) borderColor = '#eab308'
              else if (isExercicio) borderColor = '#10b981'

              const content = (
                <div
                  style={{
                    padding: '1rem',
                    background: isReleased ? 'var(--glass)' : 'rgba(255,255,255,0.02)',
                    borderTop: `1px solid ${isReleased ? borderColor : 'rgba(255,255,255,0.05)'}`,
                    borderRight: `1px solid ${isReleased ? borderColor : 'rgba(255,255,255,0.05)'}`,
                    borderBottom: `1px solid ${isReleased ? borderColor : 'rgba(255,255,255,0.05)'}`,
                    borderLeft: `4px solid ${isReleased ? borderColor : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '12px',
                    cursor: isReleased ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.2s',
                    marginBottom: '0',
                    height: '80px',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: 'inherit',
                    opacity: isReleased ? 1 : 0.55,
                  }}
                  onMouseEnter={(e) => { if (isReleased) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={(e) => { if (isReleased) e.currentTarget.style.background = 'var(--glass)' }}
                >
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isAvaliacao ? '#eab308' : isExercicio ? '#10b981' : 'var(--primary)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {label}
                      {!isReleased && <Lock size={10} style={{ opacity: 0.6 }} />}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.titulo}
                    </div>
                    {hasGabarito && gabarito && (
                      <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#22c55e', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                        <CheckCircle size={9} /> {gabarito.slice(0, 8).join(' ')}{gabarito.length > 8 ? '...' : ''}
                      </div>
                    )}
                  </div>
                  {!hideReleaseControls && selectedNucleus ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleToggleLessonRelease(item.id, item.tipo, item.is_bloco_final)
                      }}
                      style={{
                        padding: '0.3rem 0.5rem', fontSize: '0.6rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        background: isReleased ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${isReleased ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}`,
                        borderRadius: '8px', color: isReleased ? '#10b981' : '#ef4444',
                        cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                        textTransform: 'uppercase', letterSpacing: '0.3px'
                      }}
                    >
                      {isReleased ? <Unlock size={10} /> : <Lock size={10} />}
                      {isReleased ? 'Liberado' : 'Bloqueado'}
                    </button>
                  ) : (
                    <Eye size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  )}
                </div>
              )

              if (isReleased) {
                return (
                  <Link to={`/lesson/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {content}
                  </Link>
                )
              }
              return content
            }

            const renderAvaliacaoItem = (item: any, avaliacoes: any[]) => {
              if (!item) return <div style={{ height: '110px' }} />

              const versao = item.versao || 1
              const isActive = item.professor_active !== false
              const hasGabarito = Array.isArray(item.questionario) && item.questionario.length > 0
              const gabarito = getLessonGabarito(item)
              const isReleased = isLessonReleased(item.id, item.tipo, item.is_bloco_final)

              const v1Status = getV1Status(avaliacoes)
              const v2Unlocked = isV2Unlocked(avaliacoes)
              const v3Unlocked = isV3Unlocked(avaliacoes)

              let isLocked = false
              let lockReason = ''
              if (versao === 2 && !v2Unlocked) {
                isLocked = true
                lockReason = 'Aguarda aprovação V1'
              } else if (versao === 3 && !v3Unlocked) {
                isLocked = true
                lockReason = 'Aguarda aprovação V2'
              }

              const canToggle = versao === 1 || (versao === 2 && v2Unlocked) || (versao === 3 && v3Unlocked)
              const versionLabel = versao === 1 ? 'AVALIAÇÃO' : versao === 2 ? 'RECUPERAÇÃO' : '2ª RECUPERAÇÃO'

              return (
                <div
                  style={{
                    padding: '0.85rem',
                    background: isActive && !isLocked ? 'rgba(234,179,8,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive && !isLocked ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    borderLeft: `5px solid ${isActive && !isLocked ? '#eab308' : isLocked ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.3)'}`,
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    marginBottom: '0.5rem',
                    minHeight: '110px',
                    opacity: isLocked ? 0.45 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                      <GraduationCap size={13} color={isActive && !isLocked ? '#eab308' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                      <span style={{
                        fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase',
                        padding: '1px 5px', borderRadius: '4px',
                        background: isActive && !isLocked ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.04)',
                        color: isActive && !isLocked ? '#eab308' : 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                      }}>
                        {versionLabel} V{versao}
                      </span>
                    </div>
                    {!hideReleaseControls && !isLocked && canToggle && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleLessonActive(item.id, isActive)
                        }}
                        style={{
                          padding: '0.2rem 0.4rem', fontSize: '0.55rem', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: '0.2rem',
                          background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                          border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}`,
                          borderRadius: '6px', color: isActive ? '#10b981' : '#ef4444',
                          cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                          textTransform: 'uppercase',
                        }}
                      >
                        {isActive ? <ToggleRight size={9} /> : <ToggleLeft size={9} />}
                        {isActive ? 'Ativo' : 'Inativo'}
                      </button>
                    )}
                    {isLocked && (
                      <span style={{
                        fontSize: '0.5rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                        background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: '0.2rem',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <Lock size={8} /> {lockReason}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.titulo}
                  </div>

                  {hasGabarito && gabarito && (
                    <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                      <CheckCircle size={8} /> {gabarito.slice(0, 10).join(' ')}{gabarito.length > 10 ? '...' : ''}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                    {!hideReleaseControls && selectedNucleus && canToggle && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleToggleLessonRelease(item.id, item.tipo, item.is_bloco_final)
                        }}
                        style={{
                          padding: '0.2rem 0.4rem', fontSize: '0.5rem', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: '0.2rem',
                          background: isReleased ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                          border: `1px solid ${isReleased ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}`,
                          borderRadius: '6px', color: isReleased ? '#10b981' : '#ef4444',
                          cursor: 'pointer', transition: 'all 0.2s',
                          textTransform: 'uppercase',
                        }}
                      >
                        {isReleased ? <Unlock size={8} /> : <Lock size={8} />}
                        {isReleased ? 'Lib' : 'Bloq'}
                      </button>
                    )}
                    {canToggle && (
                      <Link to={`/lesson/${item.id}`} style={{ textDecoration: 'none' }}>
                        <span style={{
                          padding: '0.2rem 0.4rem', fontSize: '0.5rem', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: '0.2rem',
                          background: 'transparent', border: '1px solid rgba(234,179,8,0.3)',
                          borderRadius: '6px', color: '#eab308', cursor: 'pointer',
                          textTransform: 'uppercase',
                        }}>
                          <Eye size={8} /> Ver
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem', padding: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Lições</div>
                <div style={{ textAlign: 'center', fontWeight: 800, color: '#10b981', fontSize: '0.9rem', padding: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Exercícios</div>
                <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem', padding: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Vídeos</div>
                <div style={{ textAlign: 'center', fontWeight: 800, color: '#eab308', fontSize: '0.9rem', padding: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Avaliações</div>

                {Array.from({ length: maxRows }).map((_, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {renderGridItem(gridData.lessons[rowIndex], rowIndex === 0 ? 'Panorama' : `Lição ${String(rowIndex).padStart(2, '0')}`)}
                    {renderGridItem(gridData.exercises[rowIndex], rowIndex === 0 ? '' : `Exercício ${String(rowIndex).padStart(2, '0')}`)}
                    {renderGridItem(gridData.videos[rowIndex], rowIndex === 0 ? '' : `Vídeo ${String(rowIndex).padStart(2, '0')}`)}
                    {renderAvaliacaoItem(gridData.avaliacoes[rowIndex], avaliacoes)}
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
