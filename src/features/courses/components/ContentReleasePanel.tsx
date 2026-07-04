import React, { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { BookOpen, CheckCircle, AlertCircle, Lock, Unlock, ShieldCheck, ToggleLeft, ToggleRight, GraduationCap, ChevronDown, ChevronRight, Zap } from 'lucide-react'

interface Course {
  id: string
  nome: string
}

interface Book {
  id: string
  titulo: string
  professor_active: boolean
  ordem: number
  numero_modulo?: number
  curso_id: string
}

interface Nucleus {
  id: string
  nome: string
}

interface Release {
  nucleo_id: string
  item_id: string
  item_type: string
  liberado: boolean
}

const ContentReleasePanel: React.FC<{ professorNucleos: Nucleus[]; profile?: any }> = ({ professorNucleos, profile }) => {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [books, setBooks] = useState<Book[]>([])
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCourse, setExpandedCourse] = useState<string>('')

  useEffect(() => {
    loadCourses()
    fetchReleases()
  }, [])

  const loadCourses = async () => {
    const { data } = await supabase.from('cursos').select('id, nome').order('nome')
    if (data) {
      setCourses(data)
      if (data.length > 0) {
        setSelectedCourse(data[0].id)
        setExpandedCourse(data[0].id)
        loadBooks(data[0].id)
      }
    }
    setLoading(false)
  }

  const loadBooks = async (courseId: string) => {
    const { data } = await supabase
      .from('livros')
      .select('id, titulo, professor_active, ordem, numero_modulo, curso_id')
      .eq('curso_id', courseId)
      .order('ordem')
    if (data) setBooks(data)
  }

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId)
    setExpandedCourse(courseId)
    loadBooks(courseId)
  }

  const fetchReleases = async () => {
    const { data } = await supabase.from('liberacoes_nucleo').select('*')
    if (data) setReleases(data)
  }

  const toggleModuleActive = async (bookId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('livros')
      .update({ professor_active: !currentStatus })
      .eq('id', bookId)
    if (error) { alert('Erro: ' + error.message); return }
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, professor_active: !currentStatus } : b))
  }

  const toggleRelease = async (nucleoId: string, itemId: string, itemType: string) => {
    const existing = releases.find(r => r.nucleo_id === nucleoId && r.item_id === itemId && r.item_type === itemType)
    setReleases(prev => {
      if (existing) return prev.filter(r => !(r.nucleo_id === nucleoId && r.item_id === itemId && r.item_type === itemType))
      return [...prev, { nucleo_id: nucleoId, item_id: itemId, item_type: itemType, liberado: true }]
    })
    try {
      if (existing) {
        await supabase.from('liberacoes_nucleo').delete().match({ nucleo_id: nucleoId, item_id: itemId, item_type: itemType })
      } else {
        await supabase.from('liberacoes_nucleo').upsert([{ nucleo_id: nucleoId, item_id: itemId, item_type: itemType, liberado: true }], { onConflict: 'nucleo_id, item_id, item_type' })
      }
    } catch (err: any) {
      alert('Erro: ' + err.message)
      await fetchReleases()
    }
  }

  const handleReleaseContent = async (nucleoId: string, book: Book) => {
    if (!window.confirm(`Liberar TODO o CONTEÚDO do módulo "${book.titulo}" para o polo selecionado?`)) return
    const { data: allLessons } = await supabase.from('aulas').select('id, tipo, is_bloco_final').eq('livro_id', book.id)
    if (!allLessons) return
    const itemsToRelease = allLessons
      .filter(l => !(l.tipo === 'prova' || l.tipo === 'avaliacao' || !!l.is_bloco_final))
      .map(l => {
        const isVideo = l.tipo === 'gravada' || l.tipo === 'ao_vivo' || l.tipo === 'video'
        return { nucleo_id: nucleoId, item_id: l.id, item_type: isVideo ? 'video' : 'atividade' as const, liberado: true }
      })
    const { error } = await supabase.from('liberacoes_nucleo').upsert(itemsToRelease, { onConflict: 'nucleo_id, item_id, item_type' })
    if (error) { alert('Erro: ' + error.message); return }
    setReleases(prev => {
      const ids = new Set(itemsToRelease.map((u: any) => `${u.nucleo_id}_${u.item_id}_${u.item_type}`))
      return [...prev.filter(r => !ids.has(`${r.nucleo_id}_${r.item_id}_${r.item_type}`)), ...itemsToRelease]
    })
    alert('Conteúdo liberado com sucesso!')
  }

  const handleReleaseExams = async (nucleoId: string, currentBook: Book) => {
    const { data: currentExams } = await supabase
      .from('aulas')
      .select('id')
      .eq('livro_id', currentBook.id)
      .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true')
      .order('ordem', { ascending: true })
      .limit(1)

    const itemsToRelease: any[] = []
    if (currentExams) {
      currentExams.forEach(exam => itemsToRelease.push({ nucleo_id: nucleoId, item_id: exam.id, item_type: 'atividade', liberado: true }))
    }

    // Find next module by ordem
    let nextBookId: string | null = null
    if (typeof currentBook.ordem === 'number' && currentBook.curso_id) {
      const { data: nb } = await supabase.from('livros').select('id').eq('ordem', currentBook.ordem + 1).eq('curso_id', currentBook.curso_id).maybeSingle()
      if (nb) nextBookId = nb.id
    }

    if (nextBookId) {
      // Liberar conteúdo (lições + exercícios) do próximo módulo
      const { data: nextContent } = await supabase.from('aulas').select('id, tipo').eq('livro_id', nextBookId).not('tipo', 'eq', 'prova').not('tipo', 'eq', 'avaliacao')
      if (nextContent) {
        nextContent.forEach(item => {
          const isVideo = item.tipo === 'video' || item.tipo === 'gravada' || item.tipo === 'ao_vivo'
          itemsToRelease.push({ nucleo_id: nucleoId, item_id: item.id, item_type: isVideo ? 'video' : 'atividade', liberado: true })
        })
      }

      // Ativar o próximo módulo para que alunos o vejam
      await supabase.from('livros').update({ professor_active: true }).eq('id', nextBookId)
      setBooks(prev => prev.map(b => b.id === nextBookId ? { ...b, professor_active: true } : b))
    }

    if (itemsToRelease.length === 0) return
    const { error } = await supabase.from('liberacoes_nucleo').upsert(itemsToRelease, { onConflict: 'nucleo_id, item_id, item_type' })
    if (error) { alert('Erro: ' + error.message); return }
    setReleases(prev => {
      const ids = new Set(itemsToRelease.map((u: any) => `${u.nucleo_id}_${u.item_id}_${u.item_type}`))
      return [...prev.filter(r => !ids.has(`${r.nucleo_id}_${r.item_id}_${r.item_type}`)), ...itemsToRelease]
    })
    alert('Prova V1 liberada! O módulo seguinte foi ativado com seu conteúdo (lições e exercícios) liberado para o polo.')
  }

  const isReleased = (itemId: string, itemType: string, nucleoId: string) =>
    releases.some(r => r.nucleo_id === nucleoId && r.item_id === itemId && r.item_type === itemType)

  const ALL_NUCLEI_OPTION = 'ALL'

  const bulkToggleNucleus = async (book: Book, nucleoId: string, action: 'ativar' | 'desativar') => {
    if (action === 'ativar') {
      await toggleRelease(nucleoId, book.id, 'modulo')
      const { data: allLessons } = await supabase.from('aulas').select('id, tipo, is_bloco_final').eq('livro_id', book.id)
      if (allLessons) {
        const items = allLessons.filter(l => !(l.tipo === 'prova' || l.tipo === 'avaliacao' || !!l.is_bloco_final)).map(l => {
          const isVideo = l.tipo === 'gravada' || l.tipo === 'ao_vivo' || l.tipo === 'video'
          return { nucleo_id: nucleoId, item_id: l.id, item_type: isVideo ? 'video' : 'atividade' as const, liberado: true }
        })
        const { error } = await supabase.from('liberacoes_nucleo').upsert(items, { onConflict: 'nucleo_id, item_id, item_type' })
        if (!error) {
          setReleases(prev => {
            const ids = new Set(items.map((u: any) => `${u.nucleo_id}_${u.item_id}_${u.item_type}`))
            return [...prev.filter(r => !ids.has(`${r.nucleo_id}_${r.item_id}_${r.item_type}`)), ...items]
          })
        }
      }
    } else {
      await supabase.from('liberacoes_nucleo').delete().match({ nucleo_id: nucleoId, item_id: book.id, item_type: 'modulo' })
      setReleases(prev => prev.filter(r => !(r.nucleo_id === nucleoId && r.item_id === book.id && r.item_type === 'modulo')))
    }
  }

  if (loading) return <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Carregando...</p>

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck size={24} color="var(--primary)" />
          Painel de Liberação de Conteúdos
        </h2>
        <select
          value={selectedCourse}
          onChange={(e) => handleCourseChange(e.target.value)}
          className="form-control"
          style={{ fontSize: '0.85rem', height: '38px', padding: '0 0.75rem', minWidth: '280px' }}
        >
          {courses.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {books.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', background: 'var(--glass)', borderRadius: '16px' }}>
          Nenhum módulo neste curso.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {books.map((book, idx) => {
            const isActive = book.professor_active !== false
            return (
              <div key={book.id} style={{
                background: 'var(--glass)', borderRadius: '16px', border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                overflow: 'hidden', transition: 'all 0.2s'
              }}>
                {/* Module Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1.25rem', cursor: 'pointer',
                  background: isActive ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                  borderBottom: expandedCourse === book.id ? '1px solid var(--glass-border)' : 'none',
                }}
                  onClick={() => setExpandedCourse(expandedCourse === book.id ? '' : book.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {expandedCourse === book.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <BookOpen size={18} color={isActive ? '#10b981' : '#ef4444'} />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{book.titulo}</span>
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: '12px',
                      background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: isActive ? '#10b981' : '#ef4444',
                    }}>
                      {isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => toggleModuleActive(book.id, isActive)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.35rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                        background: isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        border: `1px solid ${isActive ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                        color: isActive ? '#ef4444' : '#10b981',
                        fontWeight: 700, fontSize: '0.7rem',
                      }}
                    >
                      {isActive ? <><ToggleLeft size={14} /> Desativar</> : <><ToggleRight size={14} /> Ativar</>}
                    </button>
                  </div>
                </div>

                {/* Per-nucleus Controls */}
                {expandedCourse === book.id && (
                  <div style={{ padding: '0.75rem 1.25rem 1rem' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <ShieldCheck size={12} /> Liberações por Polo
                    </p>
                    {professorNucleos.map(n => {
                      const modReleased = isReleased(book.id, 'modulo', n.id)
                      return (
                        <div key={n.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem', marginBottom: '0.3rem',
                          borderRadius: '10px', flexWrap: 'wrap', gap: '0.5rem',
                          background: modReleased ? 'rgba(16,185,129,0.06)' : 'transparent',
                          border: `1px solid ${modReleased ? 'rgba(16,185,129,0.15)' : 'transparent'}`,
                        }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8rem', minWidth: '140px' }}>{n.nome}</span>

                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {/* Module toggle */}
                            <button
                              onClick={() => toggleRelease(n.id, book.id, 'modulo')}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.25rem 0.5rem', borderRadius: '6px', cursor: 'pointer',
                                background: modReleased ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${modReleased ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                color: modReleased ? '#10b981' : 'var(--text-muted)',
                                fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase',
                              }}
                            >
                              {modReleased ? <Unlock size={10} /> : <Lock size={10} />}
                              Módulo
                            </button>

                            {/* Bulk content release */}
                            <button
                              onClick={() => handleReleaseContent(n.id, book)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.25rem 0.5rem', borderRadius: '6px', cursor: 'pointer',
                                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                                color: 'var(--text-main)', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase',
                              }}
                            >
                              <BookOpen size={10} /> Conteúdo
                            </button>

                            {/* Bulk exam release */}
                            <button
                              onClick={() => handleReleaseExams(n.id, book)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.25rem 0.5rem', borderRadius: '6px', cursor: 'pointer',
                                background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)',
                                color: 'var(--text-main)', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase',
                              }}
                            >
                              <GraduationCap size={10} /> Provas
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button
                              onClick={() => bulkToggleNucleus(book, n.id, 'ativar')}
                              title="Ativar tudo para este polo"
                              style={{
                                padding: '0.2rem 0.4rem', borderRadius: '4px', cursor: 'pointer',
                                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                                color: '#10b981', fontWeight: 700, fontSize: '0.55rem',
                              }}
                            >
                              <Zap size={10} /> Ativar Tudo
                            </button>
                            <button
                              onClick={() => bulkToggleNucleus(book, n.id, 'desativar')}
                              title="Desativar módulo para este polo"
                              style={{
                                padding: '0.2rem 0.4rem', borderRadius: '4px', cursor: 'pointer',
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                color: '#ef4444', fontWeight: 700, fontSize: '0.55rem',
                              }}
                            >
                              <Lock size={10} /> Desativar Tudo
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {professorNucleos.length === 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Nenhum polo vinculado ao seu perfil.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ContentReleasePanel
