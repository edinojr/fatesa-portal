import React, { useState, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { BookOpen, MapPin, ChevronDown, ChevronUp, Loader2, Check, X, Users, GraduationCap, AlertCircle } from 'lucide-react'

interface BoletimPanelProps {
  courses: any[]
  submissions: any[]
  allStudents: any[]
  professorNucleos: { id: string; nome: string }[]
  onRefresh?: () => void
}

const BoletimPanel: React.FC<BoletimPanelProps> = ({
  courses,
  submissions,
  allStudents,
  professorNucleos,
  onRefresh,
}: BoletimPanelProps) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [selectedModuloId, setSelectedModuloId] = useState<string>('')
  const [selectedNucleo, setSelectedNucleo] = useState<string>('todos')
  const [editCell, setEditCell] = useState<{ alunoId: string; aulaId: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [expandedModulos, setExpandedModulos] = useState<Set<string>>(new Set())

  const cursosComModulos = useMemo(() => {
    return (courses || []).filter((c: any) =>
      c.livros?.some((l: any) =>
        l.aulas?.some((a: any) => a.tipo === 'prova' || a.tipo === 'avaliacao' || a.is_bloco_final)
      )
    )
  }, [courses])

  const aulasPorModulo = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const c of courses || []) {
      for (const l of c.livros || []) {
        if (l.aulas) {
          map[l.id] = l.aulas.filter((a: any) => a.tipo === 'prova' || a.tipo === 'avaliacao' || a.is_bloco_final)
        }
      }
    }
    return map
  }, [courses])

  const alunosFiltrados = useMemo(() => {
    let alunos = allStudents || []
    if (selectedNucleo !== 'todos') {
      alunos = alunos.filter((s: any) => (s.nucleos?.nome || 'Sem Polo') === selectedNucleo)
    }
    return alunos.sort((a: any, b: any) => a.nome?.localeCompare(b.nome || '') || 0)
  }, [allStudents, selectedNucleo])

  const submissionsPorAlunoModulo = useMemo(() => {
    const map: Record<string, Record<string, any[]>> = {}
    for (const sub of submissions || []) {
      const alunoId = sub.student_id || sub.aluno_id
      const livroId = sub.book_id
      if (!alunoId || !livroId) continue
      if (!map[alunoId]) map[alunoId] = {}
      if (!map[alunoId][livroId]) map[alunoId][livroId] = []
      map[alunoId][livroId].push(sub)
    }
    return map
  }, [submissions])

  const handleSaveGrade = async (alunoId: string, aulaId: string, newGrade: number) => {
    setSaving(`${alunoId}_${aulaId}`)
    try {
      const { error } = await supabase
        .from('respostas_aulas')
        .upsert({
          aluno_id: alunoId,
          aula_id: aulaId,
          nota: newGrade,
          status: 'corrigida',
          respostas: {},
          tentativas: 1
        }, { onConflict: 'aluno_id,aula_id' })
      if (error) throw error
      if (onRefresh) onRefresh()
    } catch (err: any) {
      alert('Erro ao salvar nota: ' + err.message)
    } finally {
      setSaving(null)
    }
  }

  const startEdit = (alunoId: string, aulaId: string, currentGrade: number | null) => {
    setEditCell({ alunoId, aulaId })
    setEditValue(currentGrade != null ? String(currentGrade) : '')
  }

  const confirmEdit = async (alunoId: string, aulaId: string) => {
    if (!editCell || editValue === '') {
      setEditCell(null)
      return
    }
    const parsed = parseFloat(editValue)
    if (isNaN(parsed) || parsed < 0 || parsed > 10) {
      alert('Nota inválida. Use valores entre 0 e 10.')
      return
    }
    await handleSaveGrade(alunoId, aulaId, parsed)
    setEditCell(null)
  }

  const getSubmissionId = (alunoId: string, livroId: string, aulaId: string): any | null => {
    const subs = submissionsPorAlunoModulo[alunoId]?.[livroId]
    if (subs) {
      const found = subs.find((s: any) => s.lesson_id === aulaId || s.aula_id === aulaId)
      if (found) return found
    }
    // Fallback: search all submissions for this student and lesson
    for (const sub of submissions || []) {
      const sAlunoId = sub.student_id || sub.aluno_id
      const sAulaId = sub.lesson_id || sub.aula_id
      if (sAlunoId === alunoId && sAulaId === aulaId) return sub
    }
    return null
  }

  const getStudentGrade = (alunoId: string, livroId: string, aulaId: string): { sub: any; nota: number | null } => {
    const sub = getSubmissionId(alunoId, livroId, aulaId)
    if (!sub) return { sub: null, nota: null }
    return { sub, nota: sub.nota ?? null }
  }

  const getSituacao = (alunoId: string, livroId: string): 'aprovado' | 'reprovado' | 'nao_avaliado' => {
    const aulas = aulasPorModulo[livroId] || []
    let hasAnySubmission = false
    for (const aula of aulas) {
      const { sub, nota } = getStudentGrade(alunoId, livroId, aula.id)
      if (sub) hasAnySubmission = true
      const minGrade = aula.min_grade ?? 7
      if (nota != null && nota >= minGrade) return 'aprovado'
    }
    if (hasAnySubmission) return 'reprovado'
    return 'nao_avaliado'
  }

  const modulosDisponiveis = useMemo(() => {
    if (!selectedCourseId) return []
    const curso = cursosComModulos.find((c: any) => c.id === selectedCourseId)
    return curso?.livros?.filter((l: any) =>
      l.aulas?.some((a: any) => a.tipo === 'prova' || a.tipo === 'avaliacao' || a.is_bloco_final)
    ) || []
  }, [cursosComModulos, selectedCourseId])

  const toggleModulo = (id: string) => {
    setExpandedModulos(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!courses?.length) {
    return (
      <div className="data-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <GraduationCap size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
        <h3 style={{ opacity: 0.5 }}>Nenhum curso disponível</h3>
      </div>
    )
  }

  return (
    <div className="data-card" style={{ animation: 'fadeIn 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <GraduationCap color="var(--primary)" /> Boletim de Notas
        </h3>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Curso</label>
          <select className="form-control" value={selectedCourseId} onChange={e => { setSelectedCourseId(e.target.value); setSelectedModuloId('') }} style={{ width: '100%' }}>
            <option value="">Selecione um curso...</option>
            {cursosComModulos.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Módulo</label>
          <select className="form-control" value={selectedModuloId} onChange={e => setSelectedModuloId(e.target.value)} style={{ width: '100%' }} disabled={!selectedCourseId}>
            <option value="">Todos os módulos</option>
            {modulosDisponiveis.map((l: any) => (
              <option key={l.id} value={l.id}>{l.titulo}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Núcleo / Polo</label>
          <select className="form-control" value={selectedNucleo} onChange={e => setSelectedNucleo(e.target.value)} style={{ width: '100%' }}>
            <option value="todos">Todos os Núcleos</option>
            {professorNucleos.map((n: any) => (
              <option key={n.id} value={n.nome}>{n.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedCourseId ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <BookOpen size={32} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
          <p>Selecione um curso e módulo para visualizar o boletim.</p>
        </div>
      ) : (
        <>
          {selectedModuloId ? (
            <ModuloBoletim
              livroId={selectedModuloId}
              aulas={aulasPorModulo[selectedModuloId] || []}
              alunos={alunosFiltrados}
               getStudentGrade={getStudentGrade}
               getSituacao={getSituacao}
               editCell={editCell}
               editValue={editValue}
               setEditValue={setEditValue}
               startEdit={startEdit}
               confirmEdit={confirmEdit}
               saving={saving}
             />
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {modulosDisponiveis.map((mod: any) => {
                 const isExpanded = expandedModulos.has(mod.id)
                 return (
                   <div key={mod.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                     <div
                       onClick={() => toggleModulo(mod.id)}
                       style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(var(--primary-rgb), 0.05)' }}
                     >
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                         <BookOpen size={18} color="var(--primary)" />
                         <span style={{ fontWeight: 800, fontSize: '1rem' }}>{mod.titulo}</span>
                         <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                           {alunosFiltrados.length} alunos
                         </span>
                       </div>
                       {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                     </div>
                     {isExpanded && (
                       <div style={{ padding: '1rem' }}>
                         <ModuloBoletim
                           livroId={mod.id}
                           aulas={aulasPorModulo[mod.id] || []}
                           alunos={alunosFiltrados}
                           getStudentGrade={getStudentGrade}
                           getSituacao={getSituacao}
                          editCell={editCell}
                          editValue={editValue}
                          setEditValue={setEditValue}
                          startEdit={startEdit}
                          confirmEdit={confirmEdit}
                          saving={saving}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              {modulosDisponiveis.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <AlertCircle size={32} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                  <p>Nenhum módulo com avaliações encontrado neste curso.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface ModuloBoletimProps {
  livroId: string
  aulas: any[]
  alunos: any[]
  getStudentGrade: (alunoId: string, livroId: string, aulaId: string) => { sub: any; nota: number | null }
  getSituacao: (alunoId: string, livroId: string) => 'aprovado' | 'reprovado' | 'nao_avaliado'
  editCell: { alunoId: string; aulaId: string } | null
  editValue: string
  setEditValue: (v: string) => void
  startEdit: (alunoId: string, aulaId: string, grade: number | null) => void
  confirmEdit: (alunoId: string, aulaId: string) => void
  saving: string | null
}

const ModuloBoletim: React.FC<ModuloBoletimProps> = ({
  livroId,
  aulas,
  alunos,
  getStudentGrade,
  getSituacao,
  editCell,
  editValue,
  setEditValue,
  startEdit,
  confirmEdit,
  saving,
}) => {
  if (aulas.length === 0) {
    return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Este módulo não possui avaliações.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
            <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', position: 'sticky', left: 0, background: 'var(--bg)' }}>
              Aluno
            </th>
            <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Núcleo
            </th>
            {aulas.map((aula: any) => (
              <th key={aula.id} style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '70px' }}>
                V{aula.versao || 1}
                <div style={{ fontSize: '0.55rem', fontWeight: 400, opacity: 0.6, marginTop: '2px' }}>{aula.titulo?.substring(0, 20)}</div>
              </th>
            ))}
            <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', minWidth: '80px' }}>
              Situação
            </th>
          </tr>
        </thead>
        <tbody>
          {alunos.map((aluno: any) => {
            const situacao = getSituacao(aluno.id, livroId)
            return (
              <tr key={aluno.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '0.6rem 1rem', position: 'sticky', left: 0, background: 'var(--bg)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={12} color="var(--primary)" />
                    {aluno.nome || 'Sem Nome'}
                  </span>
                </td>
                <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                  <MapPin size={10} style={{ display: 'inline', marginRight: '3px', opacity: 0.5 }} />
                  {aluno.nucleos?.nome || 'Sem Polo'}
                </td>
                {aulas.map((aula: any) => {
                  const { sub, nota } = getStudentGrade(aluno.id, livroId, aula.id)
                  const isEditing = editCell?.alunoId === aluno.id && editCell?.aulaId === aula.id
                  const isSaving = saving === `${aluno.id}_${aula.id}`

                  return (
                    <td key={aula.id} style={{ textAlign: 'center', padding: '0.4rem 0.3rem' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') confirmEdit(aluno.id, aula.id)
                              if (e.key === 'Escape') setEditValue('')
                            }}
                            style={{ width: '50px', padding: '2px 4px', fontSize: '0.75rem', textAlign: 'center', background: '#000', border: '1px solid var(--primary)', borderRadius: '4px', color: '#fff' }}
                            autoFocus
                          />
                          <button onClick={() => confirmEdit(aluno.id, aula.id)} style={{ padding: '2px', background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer' }}>
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditValue('')} style={{ padding: '2px', background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => startEdit(aluno.id, aula.id, nota)}
                          style={{
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            display: 'inline-block',
                            minWidth: '36px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            background: nota != null ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(255,255,255,0.02)',
                            color: nota != null ? '#fff' : 'var(--text-muted)',
                            border: '1px solid transparent',
                            transition: 'all 0.15s',
                          }}
                          title="Clique para editar"
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                          {isSaving ? <Loader2 size={12} className="spinner" /> : (nota != null ? nota.toFixed(1) : '—')}
                        </span>
                      )}
                    </td>
                  )
                })}
                <td style={{ textAlign: 'center', padding: '0.6rem 0.5rem' }}>
                  {situacao === 'aprovado' && (
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)' }}>
                      APROVADO
                    </span>
                  )}
                  {situacao === 'reprovado' && (
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)' }}>
                      REPROVADO
                    </span>
                  )}
                  {situacao === 'nao_avaliado' && (
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      Não avaliado
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {alunos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Users size={32} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
          <p>Nenhum aluno encontrado com o filtro atual.</p>
        </div>
      )}

      {alunos.length > 0 && (
        <div style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)', marginTop: '0.5rem' }}>
          Clique em qualquer nota para editar. Use Enter para salvar, ESC para cancelar.
        </div>
      )}
    </div>
  )
}

export default BoletimPanel
