import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  BookOpen,
  Users,
  ChevronDown,
  ChevronRight,
  Loader2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Lock,
  Unlock,
  Eye,
  RefreshCw,
  Filter,
} from 'lucide-react'

interface Nucleo { id: string; nome: string }
interface Book {
  id: string
  titulo: string
  ordem: number
  curso_id: string
  professor_active: boolean
  aulas?: any[]
}
interface Course { id: string; nome: string; nivel?: string; livros: Book[] }

interface StudentRow {
  id: string
  nome: string
  email: string
  nucleo_id?: string | null
  nucleo_nome?: string | null
  modulos_finalizados_manual?: string[]
}

interface SubmissionInfo {
  nota: number | null
  status: string
  lesson_type?: string
  is_bloco_final?: boolean
  is_aprovado: boolean
}

interface HistoryGrade { modulo_nome: string; nota: number }

interface ModuleResetPanelProps {
  professorNucleos: Nucleo[]
  onRefresh?: () => void
}

const ModuleResetPanel: React.FC<ModuleResetPanelProps> = ({ professorNucleos, onRefresh }) => {
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [submissions, setSubmissions] = useState<Record<string, Record<string, SubmissionInfo>>>({})
  const [historyGrades, setHistoryGrades] = useState<Record<string, HistoryGrade[]>>({})
  const [loading, setLoading] = useState(true)
  const [resetLoading, setResetLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNucleo, setSelectedNucleo] = useState<string>('todos')
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showOnlyFinalized, setShowOnlyFinalized] = useState<boolean>(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    console.log('[ModuleResetPanel] fetchAll iniciado')

    // Buscar cursos (mesmo padrão do useProfessorManagement.ts:48)
    try {
      const { data, error } = await supabase.from('cursos').select('id, nome, livros(*, aulas(*))').order('nome')
      if (error) {
        console.error('[ModuleResetPanel] cursos error:', error)
      } else {
        setCourses(data as any)
        console.log('[ModuleResetPanel] cursos carregados:', data?.length)
      }
    } catch (e) {
      console.error('[ModuleResetPanel] cursos exception:', e)
    }

    // Buscar alunos (mesmo padrão do useProfessorManagement.ts:53 — sem filtro de tipo)
    // Excluir staff (admin, professor, suporte, colaborador) no client-side
    try {
      const { data, error } = await supabase.from('users').select('*, nucleos(nome)').order('nome')
      if (error) {
        console.error('[ModuleResetPanel] students error:', error)
      } else if (data) {
        const staffTypes = ['admin', 'professor', 'suporte', 'colaborador', 'coordenador_polo']
        const normalized = (data as any[])
          .filter((s: any) => {
            // Excluir staff
            if (staffTypes.includes(s.tipo)) return false
            // Excluir usuários com caminhos_acesso de staff
            if (s.caminhos_acesso && Array.isArray(s.caminhos_acesso)) {
              if (s.caminhos_acesso.some((r: string) => staffTypes.includes(r))) return false
            }
            return true
          })
          .map((s: any) => ({
            id: s.id,
            nome: s.nome,
            email: s.email,
            nucleo_id: s.nucleo_id,
            nucleo_nome: s.nucleos?.nome || 'Sem Polo',
            modulos_finalizados_manual: s.modulos_finalizados_manual || [],
          }))
        setStudents(normalized)
        console.log('[ModuleResetPanel] alunos carregados:', normalized.length, '(total users:', data.length, ')')
      }
    } catch (e) {
      console.error('[ModuleResetPanel] students exception:', e)
    }

    // Buscar submissões (padrão do useProfessorGrading.ts:27-44)
    try {
      const { data: subsData, error: subsErr } = await supabase
        .from('respostas_aulas')
        .select('aluno_id, aula_id, nota, status')
        .order('created_at', { ascending: false })

      if (subsErr) {
        console.error('[ModuleResetPanel] submissions error:', subsErr)
      } else if (subsData && subsData.length > 0) {
        const aulaIds = Array.from(new Set(subsData.map(r => r.aula_id).filter(Boolean)))
        let aulasMap: Record<string, any> = {}
        if (aulaIds.length > 0) {
          const { data: aulasData, error: aulasErr } = await supabase
            .from('aulas')
            .select('id, titulo, tipo, is_bloco_final, livro_id, min_grade, versao')
            .in('id', aulaIds)
          if (aulasErr) {
            console.error('[ModuleResetPanel] aulas error:', aulasErr)
          } else {
            ;(aulasData || []).forEach((a: any) => { aulasMap[a.id] = a })
          }
        }

        const map: Record<string, Record<string, SubmissionInfo>> = {}
        for (const sub of subsData as any[]) {
          const alunoId = sub.aluno_id
          const aula = aulasMap[sub.aula_id]
          const livroId = aula?.livro_id
          if (!alunoId || !livroId) continue
          if (!map[alunoId]) map[alunoId] = {}
          if (!map[alunoId][livroId]) map[alunoId][livroId] = { nota: null, status: '', is_aprovado: false }
          const info = map[alunoId][livroId]
          const isExam = aula?.tipo === 'prova' || aula?.tipo === 'avaliacao' || aula?.is_bloco_final
          const minGrade = aula?.min_grade || 7
          const nota = sub.nota
          if (sub.status === 'corrigida' && isExam && nota != null) {
            if (info.nota == null || nota > info.nota) info.nota = nota
            if (nota >= minGrade) info.is_aprovado = true
          }
          info.status = sub.status
          info.lesson_type = aula?.tipo
          info.is_bloco_final = aula?.is_bloco_final
        }
        setSubmissions(map)
        console.log('[ModuleResetPanel] submissões carregadas:', Object.keys(map).length, 'alunos')
      } else {
        console.log('[ModuleResetPanel] sem submissões')
      }
    } catch (e) {
      console.error('[ModuleResetPanel] submissions exception:', e)
    }

    // Buscar histórico de notas
    try {
      const { data, error } = await supabase.from('historico_notas').select('aluno_id, modulo_nome, nota')
      if (error) {
        console.error('[ModuleResetPanel] history error:', error)
      } else if (data) {
        const map: Record<string, HistoryGrade[]> = {}
        for (const h of data as any[]) {
          if (!map[h.aluno_id]) map[h.aluno_id] = []
          map[h.aluno_id].push({ modulo_nome: h.modulo_nome, nota: h.nota })
        }
        setHistoryGrades(map)
        console.log('[ModuleResetPanel] histórico carregado:', Object.keys(map).length, 'alunos')
      }
    } catch (e) {
      console.error('[ModuleResetPanel] history exception:', e)
    }

    setLoading(false)
    console.log('[ModuleResetPanel] fetchAll concluído')
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const normalize = (s: string) =>
    (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')

  const getBookStatus = (aluno: StudentRow, book: Book): 'aprovado' | 'finalizado_manual' | 'finalizado_historico' | 'em_andamento' | 'bloqueado' | 'nao_iniciado' | 'manutencao' => {
    const hasAulas = (book.aulas || []).length > 0
    const hasExam = (book.aulas || []).some(a => a.tipo === 'prova' || a.tipo === 'avaliacao' || a.is_bloco_final)
    if (!hasAulas || !hasExam) return 'manutencao'

    const subs = submissions[aluno.id]?.[book.id]
    if (subs?.is_aprovado) return 'aprovado'

    if (aluno.modulos_finalizados_manual?.includes(book.id)) return 'finalizado_manual'

    const hist = historyGrades[aluno.id] || []
    if (hist.some(h => h.nota >= 7 && normalize(h.modulo_nome) === normalize(book.titulo))) return 'finalizado_historico'

    if (!book.professor_active) return 'bloqueado'

    if (subs) return 'em_andamento'
    return 'nao_iniciado'
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    aprovado: { label: 'Aprovado', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.1)', icon: CheckCircle2 },
    finalizado_manual: { label: 'Finalizado Manual', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', icon: Lock },
    finalizado_historico: { label: 'Finalizado por Histórico', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', icon: Lock },
    em_andamento: { label: 'Em Andamento', color: 'var(--primary)', bg: 'rgba(var(--primary-rgb), 0.1)', icon: Eye },
    bloqueado: { label: 'Bloqueado pelo Professor', color: 'var(--error)', bg: 'rgba(255, 77, 77, 0.1)', icon: XCircle },
    nao_iniciado: { label: 'Não Iniciado', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.03)', icon: BookOpen },
    manutencao: { label: 'Em Manutenção', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: AlertCircle },
  }

  const allBooks = useMemo(() => {
    const list: { book: Book; courseName: string; nivel: string }[] = []
    for (const c of courses) {
      for (const l of c.livros || []) {
        list.push({ book: l, courseName: c.nome, nivel: c.nivel || '' })
      }
    }
    return list.sort((a, b) => (a.book.ordem || 0) - (b.book.ordem || 0))
  }, [courses])

  const filteredStudents = useMemo(() => {
    let list = students
    if (selectedNucleo !== 'todos') {
      list = list.filter(s => s.nucleo_nome === selectedNucleo)
    }
    if (searchTerm.trim()) {
      const q = normalize(searchTerm)
      list = list.filter(s => normalize(s.nome).includes(q) || normalize(s.email).includes(q))
    }
    if (showOnlyFinalized) {
      list = list.filter(s => {
        return allBooks.some(({ book }) => {
          const status = getBookStatus(s, book)
          return status === 'finalizado_manual' || status === 'finalizado_historico' || status === 'aprovado'
        })
      })
    }
    return list
  }, [students, searchTerm, selectedNucleo, showOnlyFinalized, allBooks])

  const handleResetModule = async (alunoId: string, bookId: string, bookTitulo: string, alunoNome: string) => {
    const ok = window.confirm(
      `ATENÇÃO: Resetar o módulo "${bookTitulo}" do aluno "${alunoNome}"?\n\n` +
      `Esta ação irá:\n` +
      `• Remover o módulo de modulos_finalizados_manual\n` +
      `• Deletar registros de historico_notas deste módulo\n` +
      `• Deletar respostas_aulas (submissões de provas)\n` +
      `• Deletar progresso de aulas assistidas\n` +
      `• Adicionar liberação (liberacoes_excecao) para o módulo voltar ao painel\n\n` +
      `O aluno poderá refazer o módulo do zero. Deseja continuar?`
    )
    if (!ok) return

    setResetLoading(`${alunoId}_${bookId}`)
    try {
      const aulaIds = (allBooks.find(b => b.book.id === bookId)?.book.aulas || []).map(a => a.id)

      if (aulaIds.length > 0) {
        const { error: e1 } = await supabase.from('respostas_aulas').delete().eq('aluno_id', alunoId).in('aula_id', aulaIds)
        if (e1) throw e1
        const { error: e2 } = await supabase.from('progresso').delete().eq('aluno_id', alunoId).in('aula_id', aulaIds)
        if (e2) throw e2
      }

      const { data: userData } = await supabase.from('users').select('modulos_finalizados_manual').eq('id', alunoId).single()
      const currentManual = (userData as any)?.modulos_finalizados_manual || []
      if (currentManual.includes(bookId)) {
        const updatedManual = currentManual.filter((id: string) => id !== bookId)
        const { error: e3 } = await supabase.from('users').update({ modulos_finalizados_manual: updatedManual }).eq('id', alunoId)
        if (e3) throw e3
      }

      const { error: e4 } = await supabase
        .from('historico_notas')
        .delete()
        .eq('aluno_id', alunoId)
        .filter('modulo_nome', 'ilike', bookTitulo)
      if (e4) throw e4

      const { error: e5 } = await supabase
        .from('liberacoes_excecao')
        .upsert({ user_id: alunoId, livro_id: bookId, granted_at: new Date().toISOString() }, { onConflict: 'user_id,livro_id' })
      if (e5) throw e5

      showToast(`Módulo "${bookTitulo}" resetado para ${alunoNome}. Peça ao aluno para recarregar o painel.`, 'success')
      await fetchAll()
      if (onRefresh) onRefresh()
    } catch (err: any) {
      showToast('Erro ao resetar: ' + err.message, 'error')
    } finally {
      setResetLoading(null)
    }
  }

  const handleUnlockModule = async (alunoId: string, bookId: string, bookTitulo: string, alunoNome: string) => {
    setResetLoading(`unlock_${alunoId}_${bookId}`)
    try {
      const { error } = await supabase
        .from('liberacoes_excecao')
        .upsert({ user_id: alunoId, livro_id: bookId, granted_at: new Date().toISOString() }, { onConflict: 'user_id,livro_id' })
      if (error) throw error
      showToast(`Módulo "${bookTitulo}" liberado para ${alunoNome}.`, 'success')
      await fetchAll()
    } catch (err: any) {
      showToast('Erro ao liberar: ' + err.message, 'error')
    } finally {
      setResetLoading(null)
    }
  }

  const handleToggleProfessorBlock = async (bookId: string, currentActive: boolean, bookTitulo: string) => {
    const ok = window.confirm(
      `${currentActive ? 'BLOQUEAR' : 'DESBLOQUEAR'} o módulo "${bookTitulo}" para TODOS os alunos?\n\n` +
      `Módulos bloqueados ficam ocultos no painel de todos os alunos.`
    )
    if (!ok) return
    setResetLoading(`toggle_${bookId}`)
    try {
      const { error } = await supabase.from('livros').update({ professor_active: !currentActive }).eq('id', bookId)
      if (error) throw error
      showToast(`Módulo ${!currentActive ? 'desbloqueado' : 'bloqueado'}.`, 'success')
      await fetchAll()
    } catch (err: any) {
      showToast('Erro: ' + err.message, 'error')
    } finally {
      setResetLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="data-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <Loader2 size={40} className="spinner" style={{ marginBottom: '1rem' }} />
        <p>Carregando progresso dos alunos...</p>
      </div>
    )
  }

  return (
    <div className="data-card" style={{ animation: 'fadeIn 0.3s' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem 2rem',
          background: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: '#fff', borderRadius: '12px', zIndex: 9999, fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Users color="var(--primary)" /> Progresso dos Alunos & Reset de Módulos
        </h3>
        <button onClick={fetchAll} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Buscar Aluno</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-control"
              placeholder="Nome ou email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Núcleo / Polo</label>
          <select className="form-control" value={selectedNucleo} onChange={e => setSelectedNucleo(e.target.value)} style={{ width: '100%' }}>
            <option value="todos">Todos os Núcleos</option>
            {professorNucleos.map(n => (
              <option key={n.id} value={n.nome}>{n.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setShowOnlyFinalized(!showOnlyFinalized)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem',
            borderRadius: '10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
            border: showOnlyFinalized ? '1px solid var(--error)' : '1px solid var(--glass-border)',
            background: showOnlyFinalized ? 'rgba(255,77,77,0.1)' : 'rgba(255,255,255,0.02)',
            color: showOnlyFinalized ? 'var(--error)' : 'var(--text-muted)',
            transition: 'all 0.2s',
          }}
        >
          <Filter size={14} />
          {showOnlyFinalized ? 'Mostrando só finalizados' : 'Só finalizados'}
        </button>
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', background: cfg.bg, borderRadius: '8px', border: `1px solid ${cfg.color}30` }}>
              <Icon size={12} color={cfg.color} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
            </div>
          )
        })}
      </div>

      {filteredStudents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Users size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>
            {students.length === 0
              ? `Nenhum aluno encontrado. (Cursos: ${courses.length}, Núcleos: ${professorNucleos.length})`
              : 'Nenhum aluno encontrado com os filtros atuais.'}
          </p>
          {students.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Verifique o console do navegador (F12) por erros de carregamento.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredStudents.map(aluno => {
            const isExpanded = expandedStudent === aluno.id
            const moduleStatuses = allBooks.map(b => getBookStatus(aluno, b.book))
            const aprovados = moduleStatuses.filter(s => s === 'aprovado').length
            const finalizadosManual = moduleStatuses.filter(s => s === 'finalizado_manual' || s === 'finalizado_historico').length
            const emAndamento = moduleStatuses.filter(s => s === 'em_andamento').length

            return (
              <div key={aluno.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedStudent(isExpanded ? null : aluno.id)}
                  style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{aluno.nome}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{aluno.email} • {aluno.nucleo_nome}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {aprovados > 0 && (
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>{aprovados} Aprovados</span>
                    )}
                    {finalizadosManual > 0 && (
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>{finalizadosManual} Final. Manual</span>
                    )}
                    {emAndamento > 0 && (
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(var(--primary-rgb),0.1)', color: 'var(--primary)' }}>{emAndamento} Em Andamento</span>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {allBooks.map(({ book, courseName }) => {
                        const status = getBookStatus(aluno, book)
                        const cfg = statusConfig[status]
                        const Icon = cfg.icon
                        const subs = submissions[aluno.id]?.[book.id]
                        const resetKey = `${aluno.id}_${book.id}`
                        const isResetting = resetLoading === resetKey
                        const isUnlocking = resetLoading === `unlock_${resetKey}`
                        const isToggling = resetLoading === `toggle_${book.id}`
                        const canReset = status === 'aprovado' || status === 'finalizado_manual' || status === 'finalizado_historico' || status === 'em_andamento'
                        const canUnlock = status === 'nao_iniciado' || status === 'bloqueado' || status === 'manutencao'
                        const isFinalizadoHistorico = status === 'finalizado_historico'
                        const histMatch = (historyGrades[aluno.id] || []).find(h => h.nota >= 7 && normalize(h.modulo_nome) === normalize(book.titulo))

                        return (
                          <div key={book.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.75rem 1rem', background: isFinalizadoHistorico ? 'rgba(255,77,77,0.05)' : 'rgba(255,255,255,0.02)',
                            borderRadius: '10px',
                            border: isFinalizadoHistorico ? `2px solid rgba(255,77,77,0.4)` : `1px solid ${cfg.color}20`,
                            gap: '0.75rem', flexWrap: 'wrap',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '250px' }}>
                              <Icon size={16} color={cfg.color} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{book.titulo}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {courseName} • Ordem {book.ordem}
                                  {subs?.nota != null && ` • Nota Prova: ${subs.nota.toFixed(1)}`}
                                  {histMatch && ` • Histórico: ${histMatch.nota.toFixed(1)}`}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
                                {cfg.label}
                              </span>

                              {canUnlock && (
                                <button
                                  onClick={() => handleUnlockModule(aluno.id, book.id, book.titulo, aluno.nome)}
                                  disabled={isUnlocking}
                                  title="Liberar módulo para o aluno"
                                  style={{ padding: '0.4rem 0.65rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(var(--primary-rgb),0.1)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700 }}
                                >
                                  {isUnlocking ? <Loader2 size={12} className="spinner" /> : <Unlock size={12} />}
                                  <span className="hide-mobile">Liberar</span>
                                </button>
                              )}

                              {canReset && (
                                <button
                                  onClick={() => handleResetModule(aluno.id, book.id, book.titulo, aluno.nome)}
                                  disabled={isResetting}
                                  title="Resetar módulo (apagar progresso e devolver ao aluno)"
                                  style={{ padding: '0.4rem 0.65rem', borderRadius: '8px', border: '1px solid rgba(255,77,77,0.3)', background: 'rgba(255,77,77,0.1)', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700 }}
                                >
                                  {isResetting ? <Loader2 size={12} className="spinner" /> : <RotateCcw size={12} />}
                                  <span className="hide-mobile">Resetar</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleToggleProfessorBlock(book.id, book.professor_active, book.titulo)}
                                disabled={isToggling}
                                title={book.professor_active ? 'Bloquear módulo para todos' : 'Desbloquear módulo para todos'}
                                style={{ padding: '0.4rem 0.65rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              >
                                {isToggling ? <Loader2 size={12} className="spinner" /> : book.professor_active ? <Lock size={12} /> : <Unlock size={12} />}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(245,158,11,0.05)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong style={{ color: '#f59e0b' }}>Como usar:</strong> Expanda um aluno para ver o status de cada módulo.
          Use <strong>Resetar</strong> para apagar todo o progresso de um módulo e devolvê-lo ao painel do aluno (útil quando um módulo foi finalizado indevidamente).
          Use <strong>Liberar</strong> para fazer um módulo aparecer no painel sem apagar progresso.
          Use o botão de <strong>cadeado</strong> para bloquear/desbloquear um módulo para todos os alunos.
        </div>
      </div>
    </div>
  )
}

export default ModuleResetPanel
