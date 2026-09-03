import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Users, ChevronDown, ChevronRight, Loader2, Search, Lock, Unlock,
  RefreshCw, PauseCircle, PlayCircle, AlertCircle, CheckCircle2, Eye, BookOpen, XCircle,
} from 'lucide-react'

interface Nucleo { id: string; nome: string }
interface Aula { id: string; titulo: string; tipo: string; versao?: number; is_bloco_final?: boolean; ordem?: number; livro_id: string }
interface Book {
  id: string
  titulo: string
  ordem: number
  curso_id: string
  professor_active: boolean
  aulas?: Aula[]
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

interface LessonLockPanelProps {
  professorNucleos: Nucleo[]
  onRefresh?: () => void
}

const HIATO_MOTIVO = 'hiato'

const normalize = (s: string) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u0365]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')

const LessonLockPanel: React.FC<LessonLockPanelProps> = ({ professorNucleos, onRefresh }) => {
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [submissions, setSubmissions] = useState<Record<string, Record<string, { nota: number | null; status: string; is_aprovado: boolean }>>>({})
  const [historyGrades, setHistoryGrades] = useState<Record<string, { modulo_nome: string; nota: number }[]>>({})
  const [exceptions, setExceptions] = useState<Record<string, string[]>>({})
  const [exclusions, setExclusions] = useState<Record<string, { livro_id: string; motivo: string }[]>>({})
  const [lessonExceptions, setLessonExceptions] = useState<Record<string, string[]>>({})
  const [releases, setReleases] = useState<{ item_id: string; item_type: string; nucleo_id: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNucleo, setSelectedNucleo] = useState<string>('todos')
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [expandedBook, setExpandedBook] = useState<string | null>(null)
  const [returnTarget, setReturnTarget] = useState<{ student: StudentRow; bookId: string } | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { data: cursosData, error: cursosErr } = await supabase
        .from('cursos')
        .select('id, nome, nivel, livros(id, titulo, ordem, curso_id, professor_active, aulas(id, titulo, tipo, versao, is_bloco_final, ordem, livro_id))')
        .order('nome')
      if (cursosErr) throw cursosErr
      setCourses((cursosData || []) as any)

      const { data: usersData, error: usersErr } = await supabase.from('users').select('*, nucleos(nome)').order('nome')
      if (usersErr) throw usersErr
      const staffTypes = ['admin', 'professor', 'suporte', 'colaborador', 'coordenador_polo']
      const normalized = (usersData || [])
        .filter((s: any) => {
          if (staffTypes.includes(s.tipo)) return false
          if (Array.isArray(s.caminhos_acesso) && s.caminhos_acesso.some((r: string) => staffTypes.includes(r))) return false
          return true
        })
        .map((s: any) => ({
          id: s.id, nome: s.nome, email: s.email,
          nucleo_id: s.nucleo_id, nucleo_nome: s.nucleos?.nome || 'Sem Polo',
          modulos_finalizados_manual: s.modulos_finalizados_manual || [],
        }))
      setStudents(normalized)

      const subsMap: Record<string, Record<string, { nota: number | null; status: string; is_aprovado: boolean }>> = {}
      const { data: subsData } = await supabase.from('respostas_aulas').select('aluno_id, aula_id, nota, status').order('created_at', { ascending: false })
      const aulaIds = Array.from(new Set((subsData || []).map((r: any) => r.aula_id).filter(Boolean)))
      const aulasMap: Record<string, any> = {}
      if (aulaIds.length > 0) {
        const { data: aulasData } = await supabase.from('aulas').select('id, tipo, is_bloco_final, livro_id, min_grade').in('id', aulaIds)
        ;(aulasData || []).forEach((a: any) => { aulasMap[a.id] = a })
      }
      for (const sub of (subsData || []) as any[]) {
        const aula = aulasMap[sub.aula_id]
        const livroId = aula?.livro_id
        if (!sub.aluno_id || !livroId) continue
        if (!subsMap[sub.aluno_id]) subsMap[sub.aluno_id] = {}
        if (!subsMap[sub.aluno_id][livroId]) subsMap[sub.aluno_id][livroId] = { nota: null, status: '', is_aprovado: false }
        const info = subsMap[sub.aluno_id][livroId]
        const isExam = aula?.tipo === 'prova' || aula?.tipo === 'avaliacao' || aula?.is_bloco_final
        const minGrade = aula?.min_grade || 7
        if (sub.status === 'corrigida' && isExam && sub.nota != null) {
          if (info.nota == null || sub.nota > info.nota) info.nota = sub.nota
          if (sub.nota >= minGrade) info.is_aprovado = true
        }
        info.status = sub.status
      }
      setSubmissions(subsMap)

      const { data: histData } = await supabase.from('historico_notas').select('aluno_id, modulo_nome, nota')
      const histMap: Record<string, { modulo_nome: string; nota: number }[]> = {}
      for (const h of (histData || []) as any[]) {
        if (!histMap[h.aluno_id]) histMap[h.aluno_id] = []
        histMap[h.aluno_id].push({ modulo_nome: h.modulo_nome, nota: h.nota })
      }
      setHistoryGrades(histMap)

      const { data: excData } = await supabase.from('liberacoes_excecao').select('user_id, livro_id')
      const excMap: Record<string, string[]> = {}
      for (const e of (excData || []) as any[]) {
        if (!excMap[e.user_id]) excMap[e.user_id] = []
        excMap[e.user_id].push(e.livro_id)
      }
      setExceptions(excMap)

      const { data: exclData } = await supabase.from('exclusoes_modulo_aluno').select('user_id, livro_id, motivo')
      const exclMap: Record<string, { livro_id: string; motivo: string }[]> = {}
      for (const e of (exclData || []) as any[]) {
        if (!exclMap[e.user_id]) exclMap[e.user_id] = []
        exclMap[e.user_id].push({ livro_id: e.livro_id, motivo: e.motivo || 'manual' })
      }
      setExclusions(exclMap)

      const { data: lessonExcData } = await supabase.from('liberacoes_excecao_atividade').select('user_id, aula_id')
      const lessonMap: Record<string, string[]> = {}
      for (const e of (lessonExcData || []) as any[]) {
        if (!lessonMap[e.user_id]) lessonMap[e.user_id] = []
        lessonMap[e.user_id].push(e.aula_id)
      }
      setLessonExceptions(lessonMap)

      const { data: relData } = await supabase.from('liberacoes_nucleo').select('item_id, item_type, nucleo_id').eq('liberado', true)
      setReleases((relData || []) as any)
    } catch (err: any) {
      console.error('[LessonLockPanel] fetchAll error:', err)
      showToast('Erro ao carregar dados: ' + (err?.message || err), 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const allBooks = useMemo(() => {
    const list: { book: Book; courseName: string }[] = []
    for (const c of courses) for (const l of c.livros || []) list.push({ book: l, courseName: c.nome })
    return list.sort((a, b) => (a.book.ordem || 0) - (b.book.ordem || 0))
  }, [courses])

  const bookById = useMemo(() => {
    const m: Record<string, { book: Book; courseName: string }> = {}
    for (const b of allBooks) m[b.book.id] = b
    return m
  }, [allBooks])

  const aulaToBook = useMemo(() => {
    const m: Record<string, string> = {}
    for (const { book } of allBooks) for (const a of book.aulas || []) m[a.id] = book.id
    return m
  }, [allBooks])

  const isFinished = useCallback((student: StudentRow, book: Book) => {
    if (submissions[student.id]?.[book.id]?.is_aprovado) return true
    if (student.modulos_finalizados_manual?.includes(book.id)) return true
    const hist = historyGrades[student.id] || []
    return hist.some(h => h.nota >= 7 && normalize(h.modulo_nome) === normalize(book.titulo))
  }, [submissions, historyGrades])

  // Módulo vigente: maior ordem liberada para o núcleo do aluno (ou global);
  // fallback: primeiro módulo não concluído do aluno.
  const getVigenteBookId = useCallback((student: StudentRow) => {
    const rel = releases.filter(r => !r.nucleo_id || r.nucleo_id === student.nucleo_id)
    const releasedBookIds = new Set<string>()
    for (const r of rel) {
      if (r.item_type === 'modulo') releasedBookIds.add(r.item_id)
      else {
        const bId = aulaToBook[r.item_id]
        if (bId) releasedBookIds.add(bId)
      }
    }
    let vigente: Book | null = null
    for (const { book } of allBooks) {
      if (releasedBookIds.has(book.id) && (!vigente || (book.ordem || 0) > (vigente.ordem || 0))) vigente = book
    }
    if (vigente) return vigente.id
    const firstUnfinished = allBooks.find(({ book }) => !isFinished(student, book))
    return firstUnfinished?.book.id || allBooks[0]?.book.id || ''
  }, [releases, allBooks, aulaToBook, isFinished])

  const isHiato = useCallback((studentId: string) =>
    (exclusions[studentId] || []).some(e => e.motivo === HIATO_MOTIVO)
  , [exclusions])

  const getModuleState = (student: StudentRow, book: Book) => {
    const excl = (exclusions[student.id] || []).find(e => e.livro_id === book.id)
    const hasExc = (exceptions[student.id] || []).includes(book.id)
    const vigenteId = getVigenteBookId(student)
    const vigente = bookById[vigenteId]?.book
    if (isFinished(student, book)) return 'concluido' as const
    if (excl) return 'bloqueado' as const
    if (hasExc) return 'liberado' as const
    if (vigente && book.id === vigente.id) return 'vigente' as const
    if (vigente && (book.ordem || 0) < (vigente.ordem || 0)) return 'anterior' as const
    return 'posterior' as const
  }

  const stateConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    concluido: { label: 'Concluído', color: 'var(--success)', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2 },
    vigente: { label: 'Vigente', color: 'var(--primary)', bg: 'rgba(var(--primary-rgb),0.12)', icon: Eye },
    anterior: { label: 'Anterior (não feito)', color: '#eab308', bg: 'rgba(234,179,8,0.1)', icon: AlertCircle },
    posterior: { label: 'Posterior', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.03)', icon: BookOpen },
    liberado: { label: 'Liberado individual', color: '#03A9F4', bg: 'rgba(3,169,244,0.1)', icon: Unlock },
    bloqueado: { label: 'Bloqueado', color: 'var(--error)', bg: 'rgba(255,77,77,0.1)', icon: XCircle },
  }

  const filteredStudents = useMemo(() => {
    let list = students
    if (selectedNucleo !== 'todos') list = list.filter(s => s.nucleo_nome === selectedNucleo)
    if (searchTerm.trim()) {
      const q = normalize(searchTerm)
      list = list.filter(s => normalize(s.nome).includes(q) || normalize(s.email).includes(q))
    }
    return list
  }, [students, searchTerm, selectedNucleo])

  const currentUserId = async () => (await supabase.auth.getUser()).data.user?.id || null

  const toggleModuleRelease = async (student: StudentRow, book: Book) => {
    const key = `rel_${student.id}_${book.id}`
    setActionLoading(key)
    try {
      const has = (exceptions[student.id] || []).includes(book.id)
      if (has) {
        await supabase.from('liberacoes_excecao').delete().match({ user_id: student.id, livro_id: book.id })
        showToast(`"${book.titulo}" — liberação individual removida.`, 'success')
      } else {
        const grantedBy = await currentUserId()
        const { error } = await supabase
          .from('liberacoes_excecao')
          .upsert({ user_id: student.id, livro_id: book.id, granted_by: grantedBy }, { onConflict: 'user_id,livro_id' })
        if (error) throw error
        // Liberar o módulo também libera as provas V1 (V2/V3 dependem de reprovação)
        const v1Ids = (book.aulas || [])
          .filter(a => a.is_bloco_final || a.versao == null || Number(a.versao) === 1)
          .filter(a => a.tipo === 'prova' || a.tipo === 'avaliacao' || a.is_bloco_final)
          .map(a => a.id)
        if (v1Ids.length > 0) {
          const { error: insErr } = await supabase
            .from('liberacoes_excecao_atividade')
            .upsert(v1Ids.map(aulaId => ({ user_id: student.id, aula_id: aulaId, granted_by: grantedBy })), { onConflict: 'user_id,aula_id' })
          if (insErr) throw insErr
        }
        // Liberação individual sobrepõe bloqueio — remover exclusão se houver
        await supabase.from('exclusoes_modulo_aluno').delete().match({ user_id: student.id, livro_id: book.id })
        showToast(`"${book.titulo}" liberado individualmente para ${student.nome}.`, 'success')
      }
      await fetchAll()
    } catch (err: any) {
      showToast('Erro: ' + (err?.message || err), 'error')
    } finally { setActionLoading(null) }
  }

  const toggleModuleBlock = async (student: StudentRow, book: Book) => {
    const key = `blk_${student.id}_${book.id}`
    setActionLoading(key)
    try {
      const excl = (exclusions[student.id] || []).find(e => e.livro_id === book.id)
      if (excl) {
        const { error } = await supabase.from('exclusoes_modulo_aluno').delete().match({ user_id: student.id, livro_id: book.id })
        if (error) throw error
        showToast(`"${book.titulo}" desbloqueado para ${student.nome}.`, 'success')
      } else {
        const { error } = await supabase
          .from('exclusoes_modulo_aluno')
          .upsert({ user_id: student.id, livro_id: book.id, motivo: 'manual', granted_by: await currentUserId() }, { onConflict: 'user_id,livro_id' })
        if (error) throw error
        // Bloqueio também remove a liberação individual (exceção sobrepõe exclusão)
        await supabase.from('liberacoes_excecao').delete().match({ user_id: student.id, livro_id: book.id })
        showToast(`"${book.titulo}" bloqueado individualmente para ${student.nome}.`, 'success')
      }
      await fetchAll()
    } catch (err: any) {
      showToast('Erro: ' + (err?.message || err), 'error')
    } finally { setActionLoading(null) }
  }

  const toggleLessonRelease = async (student: StudentRow, aula: Aula) => {
    const key = `les_${student.id}_${aula.id}`
    setActionLoading(key)
    try {
      const has = (lessonExceptions[student.id] || []).includes(aula.id)
      if (has) {
        const { error } = await supabase.from('liberacoes_excecao_atividade').delete().match({ user_id: student.id, aula_id: aula.id })
        if (error) throw error
        showToast(`Lição "${aula.titulo}" bloqueada.`, 'success')
      } else {
        const { error } = await supabase
          .from('liberacoes_excecao_atividade')
          .upsert({ user_id: student.id, aula_id: aula.id, granted_by: await currentUserId() }, { onConflict: 'user_id,aula_id' })
        if (error) throw error
        showToast(`Lição "${aula.titulo}" liberada para ${student.nome}.`, 'success')
      }
      await fetchAll()
    } catch (err: any) {
      showToast('Erro: ' + (err?.message || err), 'error')
    } finally { setActionLoading(null) }
  }

  const markHiato = async (student: StudentRow) => {
    const unfinished = allBooks.filter(({ book }) => !isFinished(student, book))
    if (unfinished.length === 0) { showToast(`${student.nome} não tem módulos em aberto.`, 'error'); return }
    if (!window.confirm(`Marcar HIATO para ${student.nome}?\n\nTodos os ${unfinished.length} módulos não concluídos serão bloqueados (o aluno só enxerga o que já concluiu).`)) return
    setActionLoading(`hiato_${student.id}`)
    try {
      const grantedBy = await currentUserId()
      const { error } = await supabase
        .from('exclusoes_modulo_aluno')
        .upsert(unfinished.map(({ book }) => ({ user_id: student.id, livro_id: book.id, motivo: HIATO_MOTIVO, granted_by: grantedBy })), { onConflict: 'user_id,livro_id' })
      if (error) throw error
      const unfinishedIds = unfinished.map(({ book }) => book.id)
      await supabase.from('liberacoes_excecao').delete().eq('user_id', student.id).in('livro_id', unfinishedIds)
      showToast(`${student.nome} está em hiato.`, 'success')
      await fetchAll()
    } catch (err: any) {
      showToast('Erro: ' + (err?.message || err), 'error')
    } finally { setActionLoading(null) }
  }

  const returnFromHiato = async (student: StudentRow, targetBookId: string) => {
    const target = bookById[targetBookId]
    if (!target) return
    setActionLoading(`return_${student.id}`)
    try {
      const grantedBy = await currentUserId()
      // 1. Liberação individual do módulo vigente (garante visível mesmo com anteriores pendentes)
      const { error: relErr } = await supabase
        .from('liberacoes_excecao')
        .upsert({ user_id: student.id, livro_id: targetBookId, granted_by: grantedBy }, { onConflict: 'user_id,livro_id' })
      if (relErr) throw relErr
      // 2. Provas V1 do módulo vigente
      const v1Ids = (target.book.aulas || [])
        .filter(a => a.is_bloco_final || a.versao == null || Number(a.versao) === 1)
        .filter(a => a.tipo === 'prova' || a.tipo === 'avaliacao' || a.is_bloco_final)
        .map(a => a.id)
      if (v1Ids.length > 0) {
        await supabase
          .from('liberacoes_excecao_atividade')
          .upsert(v1Ids.map(aulaId => ({ user_id: student.id, aula_id: aulaId, granted_by: grantedBy })), { onConflict: 'user_id,aula_id' })
      }
      // 3. Remover bloqueios do módulo-alvo e de todos os posteriores (o curso segue naturalmente)
      const removeIds = allBooks
        .filter(({ book }) => book.id === targetBookId || (book.ordem || 0) > (target.book.ordem || 0) || isFinished(student, book))
        .map(({ book }) => book.id)
      if (removeIds.length > 0) {
        await supabase.from('exclusoes_modulo_aluno').delete().eq('user_id', student.id).in('livro_id', removeIds)
      }
      // 4. Remover liberações individuais de módulos posteriores ao vigente (progressão volta ao normal)
      const laterIds = allBooks.filter(({ book }) => (book.ordem || 0) > (target.book.ordem || 0)).map(({ book }) => book.id)
      if (laterIds.length > 0) {
        await supabase.from('liberacoes_excecao').delete().eq('user_id', student.id).in('livro_id', laterIds)
      }
      setReturnTarget(null)
      showToast(`${student.nome} retornou no módulo "${target.book.titulo}".`, 'success')
      await fetchAll()
      if (onRefresh) onRefresh()
    } catch (err: any) {
      showToast('Erro: ' + (err?.message || err), 'error')
    } finally { setActionLoading(null) }
  }

  if (loading) {
    return (
      <div className="data-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <Loader2 size={40} className="spinner" style={{ marginBottom: '1rem' }} />
        <p>Carregando liberações individuais...</p>
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
          <Lock color="var(--primary)" /> Liberação / Bloqueio de Lição por Aluno
        </h3>
        <button onClick={fetchAll} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', width: 'auto' }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Buscar Aluno</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" placeholder="Nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', paddingLeft: '2.5rem' }} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Núcleo / Polo</label>
          <select className="form-control" value={selectedNucleo} onChange={e => setSelectedNucleo(e.target.value)} style={{ width: '100%' }}>
            <option value="todos">Todos os Núcleos</option>
            {professorNucleos.map(n => <option key={n.id} value={n.nome}>{n.nome}</option>)}
          </select>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Users size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Nenhum aluno encontrado com os filtros atuais.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredStudents.map(student => {
            const isExpanded = expandedStudent === student.id
            const vigenteId = getVigenteBookId(student)
            const vigente = bookById[vigenteId]
            const hiato = isHiato(student.id)
            const finishedCount = allBooks.filter(({ book }) => isFinished(student, book)).length
            const blockedCount = (exclusions[student.id] || []).length

            return (
              <div key={student.id} style={{ background: hiato ? 'rgba(255,77,77,0.04)' : 'rgba(255,255,255,0.02)', borderRadius: '16px', border: hiato ? '1px solid rgba(255,77,77,0.3)' : '1px solid var(--glass-border)', overflow: 'hidden' }}>
                <div
                  onClick={() => { setExpandedStudent(isExpanded ? null : student.id); setExpandedBook(null) }}
                  style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{student.nome}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.email} • {student.nucleo_nome}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>{finishedCount}/{allBooks.length} concluídos</span>
                    {vigente && <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(var(--primary-rgb),0.1)', color: 'var(--primary)' }}>Vigente: {vigente.book.titulo}</span>}
                    {hiato && <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(255,77,77,0.15)', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><PauseCircle size={12} /> EM HIATO</span>}
                    {blockedCount > 0 && !hiato && <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(255,77,77,0.1)', color: 'var(--error)' }}>{blockedCount} bloqueados</span>}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                    {/* Controle de Hiato */}
                    <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '12px', background: hiato ? 'rgba(255,77,77,0.06)' : 'rgba(245,158,11,0.05)', border: `1px solid ${hiato ? 'rgba(255,77,77,0.25)' : 'rgba(245,158,11,0.2)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {hiato ? <PauseCircle size={20} color="var(--error)" /> : <PlayCircle size={20} color="#f59e0b" />}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{hiato ? 'Aluno em Hiato' : 'Controle de Hiato'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {hiato
                              ? 'Ao retornar, o aluno volta direto no módulo vigente da turma.'
                              : 'Bloqueia todos os módulos em aberto. Ao retornar, o aluno volta no módulo vigente.'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!hiato ? (
                          <button
                            onClick={() => markHiato(student)}
                            disabled={actionLoading === `hiato_${student.id}`}
                            className="btn"
                            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(255,77,77,0.12)', color: 'var(--error)', border: '1px solid rgba(255,77,77,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                          >
                            {actionLoading === `hiato_${student.id}` ? <Loader2 size={14} className="spinner" /> : <PauseCircle size={14} />} Marcar Hiato
                          </button>
                        ) : (
                          <button
                            onClick={() => setReturnTarget({ student, bookId: vigenteId })}
                            disabled={actionLoading === `return_${student.id}`}
                            className="btn btn-primary"
                            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                          >
                            {actionLoading === `return_${student.id}` ? <Loader2 size={14} className="spinner" /> : <PlayCircle size={14} />} Retornar do Hiato
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Módulos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {allBooks.map(({ book, courseName }) => {
                        const state = getModuleState(student, book)
                        const cfg = stateConfig[state]
                        const Icon = cfg.icon
                        const hasExc = (exceptions[student.id] || []).includes(book.id)
                        const hasExcl = (exclusions[student.id] || []).some(e => e.livro_id === book.id)
                        const isBookExpanded = expandedBook === book.id
                        const relKey = `rel_${student.id}_${book.id}`
                        const blkKey = `blk_${student.id}_${book.id}`
                        const finished = state === 'concluido'

                        return (
                          <div key={book.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${cfg.color}20`, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '220px', cursor: 'pointer' }} onClick={() => setExpandedBook(isBookExpanded ? null : book.id)}>
                                {isBookExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <Icon size={16} color={cfg.color} />
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{book.ordem}. {book.titulo}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{courseName}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
                                  {cfg.label}
                                </span>
                                {!finished && (
                                  <>
                                    <button
                                      onClick={() => toggleModuleRelease(student, book)}
                                      disabled={actionLoading === relKey}
                                      title={hasExc ? 'Remover liberação individual' : 'Liberar módulo individualmente'}
                                      style={{ padding: '0.4rem 0.65rem', borderRadius: '8px', border: `1px solid ${hasExc ? 'rgba(3,169,244,0.4)' : 'var(--glass-border)'}`, background: hasExc ? 'rgba(3,169,244,0.12)' : 'rgba(255,255,255,0.03)', color: hasExc ? '#03A9F4' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700 }}
                                    >
                                      {actionLoading === relKey ? <Loader2 size={12} className="spinner" /> : <Unlock size={12} />}
                                      <span className="hide-mobile">{hasExc ? 'Liberado' : 'Liberar'}</span>
                                    </button>
                                    <button
                                      onClick={() => toggleModuleBlock(student, book)}
                                      disabled={actionLoading === blkKey}
                                      title={hasExcl ? 'Remover bloqueio individual' : 'Bloquear módulo individualmente'}
                                      style={{ padding: '0.4rem 0.65rem', borderRadius: '8px', border: `1px solid ${hasExcl ? 'rgba(255,77,77,0.4)' : 'var(--glass-border)'}`, background: hasExcl ? 'rgba(255,77,77,0.12)' : 'rgba(255,255,255,0.03)', color: hasExcl ? 'var(--error)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700 }}
                                    >
                                      {actionLoading === blkKey ? <Loader2 size={12} className="spinner" /> : <Lock size={12} />}
                                      <span className="hide-mobile">{hasExcl ? 'Bloqueado' : 'Bloquear'}</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {isBookExpanded && (
                              <div style={{ padding: '0.5rem 1rem 1rem 3rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Lições do módulo — liberação individual</div>
                                {(book.aulas || []).length === 0 && (
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.5rem' }}>Nenhuma lição cadastrada neste módulo.</div>
                                )}
                                {(book.aulas || [])
                                  .slice()
                                  .sort((a, b) => ((a.ordem || 0) - (b.ordem || 0)) || (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR'))
                                  .map(aula => {
                                    const lesHas = (lessonExceptions[student.id] || []).includes(aula.id)
                                    const lesKey = `les_${student.id}_${aula.id}`
                                    return (
                                      <div key={aula.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', gap: '0.75rem' }}>
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{aula.titulo}</div>
                                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{aula.tipo}{aula.versao ? ` • V${aula.versao}` : ''}</div>
                                        </div>
                                        <button
                                          onClick={() => toggleLessonRelease(student, aula)}
                                          disabled={actionLoading === lesKey}
                                          title={lesHas ? 'Bloquear lição para o aluno' : 'Liberar lição individualmente'}
                                          style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: `1px solid ${lesHas ? 'rgba(16,185,129,0.4)' : 'var(--glass-border)'}`, background: lesHas ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)', color: lesHas ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}
                                        >
                                          {actionLoading === lesKey ? <Loader2 size={12} className="spinner" /> : lesHas ? <Unlock size={12} /> : <Lock size={12} />}
                                          {lesHas ? 'Liberada' : 'Bloqueada'}
                                        </button>
                                      </div>
                                    )
                                  })}
                              </div>
                            )}
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

      {/* MODAL DE RETORNO DO HIATO (módulo vigente) */}
      {returnTarget && (
        <div className="modal-overlay" onClick={() => setReturnTarget(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>Retorno do Hiato</h2>
                <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>{returnTarget.student.nome}</p>
              </div>
              <button className="btn-icon" onClick={() => setReturnTarget(null)}><ChevronRight style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
              O aluno retornará direto no módulo selecionado (sugestão: <strong>módulo vigente</strong> da turma).
              Módulos anteriores não concluídos permanecem bloqueados — libere individualmente se o aluno precisar repor.
            </p>
            <div className="form-group">
              <label>Módulo de retorno</label>
              <select
                className="form-control"
                value={returnTarget.bookId}
                onChange={e => setReturnTarget({ ...returnTarget, bookId: e.target.value })}
              >
                {allBooks.map(({ book, courseName }) => (
                  <option key={book.id} value={book.id}>{book.ordem}. {book.titulo} ({courseName})</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setReturnTarget(null)} disabled={actionLoading === `return_${returnTarget.student.id}`}>Cancelar</button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={actionLoading === `return_${returnTarget.student.id}`}
                onClick={() => returnFromHiato(returnTarget.student, returnTarget.bookId)}
              >
                {actionLoading === `return_${returnTarget.student.id}` ? <Loader2 className="spinner" /> : <PlayCircle size={16} />} Retornar no Módulo
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(245,158,11,0.05)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong style={{ color: '#f59e0b' }}>Como usar:</strong> expanda um aluno para liberar/bloquear módulos e lições individualmente.
          <strong> Marcar Hiato</strong> bloqueia todos os módulos em aberto; <strong>Retornar do Hiato</strong> traz o aluno de volta direto no módulo vigente da turma — módulos perdidos durante o hiato ficam bloqueados e podem ser liberados um a um (botão <em>Liberar</em>).
        </div>
      </div>
    </div>
  )
}

export default LessonLockPanel
