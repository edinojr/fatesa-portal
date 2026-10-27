import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { supabase, fetchAllRows } from '../../../lib/supabase'
import {
  BookOpen, MapPin, ChevronDown, ChevronUp, Loader2, Check, X,
  Users, GraduationCap, AlertCircle, Search, Award, TrendingUp, CheckCircle2, XCircle
} from 'lucide-react'
import { areModuleTitlesEqual, cleanModuleTitle, LEGACY_AULA_TO_BOOK_TITLE } from '../../../lib/courseTitles'
import { autoGradePendingSubmissions } from '../../../services/examCorrection'
import { getExamVersion, getExamLabel } from '../../../lib/examRules'
import StudentDetailsModal from '../../nucleos/components/StudentDetailsModal'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [editCell, setEditCell] = useState<{ alunoId: string; aulaId: string; livroId: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [expandedModulos, setExpandedModulos] = useState<Set<string>>(new Set())
  const [directHistoryGrades, setDirectHistoryGrades] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [autoCorrecting, setAutoCorrecting] = useState(false)
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<any | null>(null)
  const [studentModalLivros, setStudentModalLivros] = useState<any[]>([])
  const [studentModalAulas, setStudentModalAulas] = useState<any[]>([])
  const [studentModalProgresso, setStudentModalProgresso] = useState<Set<string>>(new Set())
  const [studentModalSubmissions, setStudentModalSubmissions] = useState<any[]>([])
  const [studentModalExceptions, setStudentModalExceptions] = useState<string[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  const openStudentModal = async (aluno: any) => {
    setSelectedStudentForModal(aluno)
    setModalLoading(true)
    try {
      // 1. Submissões do aluno com questionario
      const { data: sData } = await supabase
        .from('respostas_aulas')
        .select('*, aulas(id, titulo, questionario, tipo, is_bloco_final, versao, livro_id, min_grade)')
        .eq('aluno_id', aluno.id)
        .order('created_at', { ascending: false })
      if (sData) setStudentModalSubmissions(sData)

      // 2. Livros do curso
      let bQuery = supabase.from('livros').select('id, titulo, capa_url, ordem, curso_id').order('ordem')
      if (aluno.curso_id || selectedCourseId) {
        bQuery = bQuery.eq('curso_id', aluno.curso_id || selectedCourseId)
      }
      const { data: bData } = await bQuery
      if (bData && bData.length > 0) {
        setStudentModalLivros(bData)
        // 3. Aulas dos livros
        const { data: aData } = await supabase
          .from('aulas')
          .select('id, titulo, tipo, is_bloco_final, versao, livro_id, min_grade, ordem, questionario, livros(titulo)')
          .in('livro_id', bData.map((l: any) => l.id))
          .order('ordem')
        if (aData) setStudentModalAulas(aData)
      }

      // 4. Progresso de exercícios
      const { data: pData } = await supabase
        .from('progresso')
        .select('aula_id, concluida')
        .eq('aluno_id', aluno.id)
        .eq('concluida', true)
      if (pData) {
        setStudentModalProgresso(new Set(pData.map((p: any) => p.aula_id)))
      } else {
        setStudentModalProgresso(new Set())
      }

      // 5. Exceções
      const { data: exData } = await supabase.from('liberacoes_excecao').select('livro_id').eq('user_id', aluno.id)
      if (exData) setStudentModalExceptions(exData.map((e: any) => e.livro_id))
    } catch (err) {
      console.error('Erro ao carregar dados do aluno:', err)
    } finally {
      setModalLoading(false)
    }
  }

  const handleDeleteSubmissionModal = async (subId: string) => {
    if (!subId) return
    try {
      const cleanId = String(subId).replace('hist-', '').trim()
      const { error } = await supabase.from('respostas_aulas').delete().eq('id', cleanId)
      if (error) throw error
      if (selectedStudentForModal) {
        openStudentModal(selectedStudentForModal)
      }
      if (onRefresh) onRefresh()
    } catch (err: any) {
      alert('Erro ao excluir submissão: ' + (err.message || err))
    }
  }

  const handleAutoCorrect = async () => {
    setAutoCorrecting(true)
    try {
      const result = await autoGradePendingSubmissions(submissions)
      if (result.corrected > 0) {
        alert(`Sucesso: ${result.corrected} avaliação(ões) pendente(s) foram corrigidas automaticamente pelo sistema!`)
        await fetchComplementaryHistory()
        if (onRefresh) onRefresh()
      } else {
        alert('Nenhuma avaliação pendente precisava de correção no momento.')
      }
    } catch (err: any) {
      alert('Erro na auto-correção: ' + (err.message || err))
    } finally {
      setAutoCorrecting(false)
    }
  }

  // Busca histórico de notas complementar para garantir 100% dos dados dos alunos (paginado)
  const fetchComplementaryHistory = useCallback(async () => {
    try {
      setLoadingHistory(true)
      const { data } = await fetchAllRows((from, to) =>
        supabase
          .from('historico_notas')
          .select('id, aluno_id, curso_nome, modulo_nome, nota, data_conclusao')
          .order('created_at', { ascending: false })
          .range(from, to)
      )
      if (data) {
        setDirectHistoryGrades(data)
      }
    } catch (err) {
      console.warn('[BoletimPanel] Erro ao carregar historico_notas complementar:', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchComplementaryHistory()
  }, [fetchComplementaryHistory])

  // Cursos disponíveis que possuem livros
  const cursosDisponiveis = useMemo(() => {
    return (courses || []).filter((c: any) => (c.livros || []).length > 0)
  }, [courses])

  // Seleciona automaticamente o primeiro curso caso não haja seleção
  useEffect(() => {
    if (!selectedCourseId && cursosDisponiveis.length > 0) {
      setSelectedCourseId(cursosDisponiveis[0].id)
    }
  }, [cursosDisponiveis, selectedCourseId])

  // Dicionário de títulos para livros
  const titleToBook = useMemo(() => {
    const map: Record<string, any> = {}
    for (const c of courses || []) {
      for (const l of c.livros || []) {
        if (l.titulo) {
          map[cleanModuleTitle(l.titulo)] = l
        }
      }
    }
    return map
  }, [courses])

  // Dicionário de livros por ID
  const bookById = useMemo(() => {
    const map: Record<string, any> = {}
    for (const c of courses || []) {
      for (const l of c.livros || []) {
        map[l.id] = l
      }
    }
    return map
  }, [courses])

  // Avaliações de cada módulo (reconhece provas, avaliações, bloco final e V1/V2/V3)
  const aulasPorModulo = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const c of courses || []) {
      for (const l of c.livros || []) {
        const rawExams = (l.aulas || []).filter((a: any) =>
          a.tipo === 'prova' ||
          a.tipo === 'avaliacao' ||
          !!a.is_bloco_final ||
          (a.titulo && /V[1-3]|RECUPERA|AVALIA|PROVA/i.test(a.titulo))
        );

        const exams = rawExams.map((a: any, idx: number) => {
          const v = getExamVersion(a);
          const resolvedVersao = v > 1 ? v : (rawExams.length > 1 && idx < 3 ? idx + 1 : 1);
          return { ...a, versao: resolvedVersao };
        }).sort((a: any, b: any) => (a.versao || 1) - (b.versao || 1));

        if (exams.length > 0) {
          map[l.id] = exams
        } else {
          // Se o módulo não tiver aula específica de prova, cria coluna virtual para exibir notas históricas
          map[l.id] = [{
            id: `virtual-${l.id}`,
            titulo: 'Avaliação Oficial',
            tipo: 'prova',
            versao: 1,
            min_grade: 7,
            livro_id: l.id,
            is_virtual: true
          }]
        }
      }
    }
    return map
  }, [courses])

  // Módulos do curso selecionado
  const modulosDisponiveis = useMemo(() => {
    if (!selectedCourseId) return []
    const curso = cursosDisponiveis.find((c: any) => c.id === selectedCourseId)
    return (curso?.livros || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))
  }, [cursosDisponiveis, selectedCourseId])

  // Dicionário consolidado de submissões por Aluno e Módulo
  const submissionsPorAlunoModulo = useMemo(() => {
    const map: Record<string, Record<string, any[]>> = {}

    const addSub = (alunoId: string, livroId: string, item: any) => {
      if (!alunoId || !livroId) return
      if (!map[alunoId]) map[alunoId] = {}
      if (!map[alunoId][livroId]) map[alunoId][livroId] = []
      map[alunoId][livroId].push(item)
    }

    // 1. Processa submissões recebidas por prop
    for (const sub of submissions || []) {
      const alunoId = sub.student_id || sub.aluno_id
      let livroId = sub.book_id

      if (!livroId && sub.lesson_id && LEGACY_AULA_TO_BOOK_TITLE[sub.lesson_id]) {
        const targetTitle = LEGACY_AULA_TO_BOOK_TITLE[sub.lesson_id]
        const matched = titleToBook[cleanModuleTitle(targetTitle)]
        if (matched) livroId = matched.id
      }

      if (!livroId && sub.book_title) {
        const matched = titleToBook[cleanModuleTitle(sub.book_title)]
        if (matched) livroId = matched.id
      }

      if (alunoId && livroId) {
        addSub(alunoId, livroId, sub)
      }
    }

    // 2. Mescla notas do histórico direto (historico_notas)
    for (const h of directHistoryGrades || []) {
      if (!h.aluno_id || !h.modulo_nome) continue
      const matched = titleToBook[cleanModuleTitle(h.modulo_nome)]
      if (matched) {
        addSub(h.aluno_id, matched.id, {
          id: `hist-${h.id}`,
          submission_id: `hist-${h.id}`,
          student_id: h.aluno_id,
          aluno_id: h.aluno_id,
          lesson_id: null,
          aula_id: null,
          lesson_title: h.modulo_nome,
          book_id: matched.id,
          book_title: matched.titulo,
          nota: Number(h.nota),
          status: 'corrigida',
          versao: 1,
          is_manual: true
        })
      }
    }

    return map
  }, [submissions, directHistoryGrades, titleToBook])

  // Obtém a nota de um aluno para uma aula específica do módulo (sempre priorizando a maior nota em caso de duplicidade)
  const getStudentGrade = useCallback((alunoId: string, livroId: string, aulaId: string): { sub: any; nota: number | null } => {
    const subs = submissionsPorAlunoModulo[alunoId]?.[livroId] || []
    const currentBook = bookById[livroId]
    const currentAulas = aulasPorModulo[livroId] || []
    const targetAula = currentAulas.find((a: any) => a.id === aulaId)

    const pickHighest = (items: any[]) => {
      if (!items || items.length === 0) return null
      return items.reduce((best: any, curr: any) => Number(curr.nota) > Number(best.nota) ? curr : best, items[0])
    }

    // 1. Busca direta por lesson_id / aula_id (escolhendo a maior nota caso haja múltiplas)
    const directMatches = subs.filter((s: any) => (s.lesson_id === aulaId || s.aula_id === aulaId) && s.nota != null && !isNaN(Number(s.nota)))
    let found = pickHighest(directMatches)

    // 2. Busca por versão (ex: V1, V2, V3) se especificada na aula
    if (!found && targetAula?.versao) {
      const versionMatches = subs.filter((s: any) => Number(s.versao) === Number(targetAula.versao) && s.nota != null && !isNaN(Number(s.nota)))
      found = pickHighest(versionMatches)
    }

    // 3. Se for a primeira avaliação (V1) ou coluna virtual, garante que a maior nota oficial do módulo (online ou histórico manual) prevaleça
    if (targetAula?.is_virtual || targetAula?.versao === 1 || currentAulas[0]?.id === aulaId) {
      const validSubs = subs.filter((s: any) => s.nota != null && !isNaN(Number(s.nota)))
      const bestSubInModule = pickHighest(validSubs)
      if (bestSubInModule && (!found || Number(bestSubInModule.nota) > Number(found.nota))) {
        found = bestSubInModule
      }

      if (currentBook?.titulo) {
        const histMatches = (directHistoryGrades || []).filter((h: any) =>
          h.aluno_id === alunoId && areModuleTitlesEqual(h.modulo_nome, currentBook.titulo) && h.nota != null && !isNaN(Number(h.nota))
        )
        const bestHist = pickHighest(histMatches)
        if (bestHist && (!found || Number(bestHist.nota) > Number(found.nota))) {
          return { sub: bestHist, nota: Number(bestHist.nota) }
        }
      }
    }

    if (!found) return { sub: null, nota: null }
    const num = Number(found.nota)
    return { sub: found, nota: !isNaN(num) ? num : null }
  }, [submissionsPorAlunoModulo, bookById, aulasPorModulo, directHistoryGrades])

  // Determina a situação acadêmica do aluno no módulo
  const getSituacao = useCallback((alunoId: string, livroId: string): 'aprovado' | 'reprovado' | 'nao_avaliado' => {
    const aulas = aulasPorModulo[livroId] || []
    let hasAnyGrade = false
    let maxGrade = -1

    for (const aula of aulas) {
      const { nota } = getStudentGrade(alunoId, livroId, aula.id)
      if (nota != null) {
        hasAnyGrade = true
        if (nota > maxGrade) maxGrade = nota
        if (nota >= 7.0) return 'aprovado'
      }
    }

    if (maxGrade >= 7.0) return 'aprovado'
    if (hasAnyGrade) return 'reprovado'
    return 'nao_avaliado'
  }, [aulasPorModulo, getStudentGrade])

  // Lista de alunos exibidos para um módulo específico
  const getAlunosParaModulo = useCallback((livroId: string) => {
    const mapAlunos = new Map<string, any>()

    // Inclui todos os alunos da lista geral que passam pelo filtro de polo
    for (const s of allStudents || []) {
      const poloName = s.nucleos?.nome || 'Sem Polo'
      if (selectedNucleo !== 'todos' && poloName !== selectedNucleo) continue
      mapAlunos.set(s.id, s)
    }

    // Garante que TODOS os alunos que possuem notas/submissões neste módulo sejam incluídos
    const subsModulo = submissionsPorAlunoModulo
    for (const alunoId of Object.keys(subsModulo)) {
      if (subsModulo[alunoId]?.[livroId]?.length > 0) {
        if (!mapAlunos.has(alunoId)) {
          const foundInAll = (allStudents || []).find((a: any) => a.id === alunoId)
          if (foundInAll) {
            const poloName = foundInAll.nucleos?.nome || 'Sem Polo'
            if (selectedNucleo === 'todos' || poloName === selectedNucleo) {
              mapAlunos.set(alunoId, foundInAll)
            }
          } else {
            const firstSub = subsModulo[alunoId][livroId][0]
            const poloName = firstSub.nucleus_name || 'Sem Polo'
            if (selectedNucleo === 'todos' || poloName === selectedNucleo) {
              mapAlunos.set(alunoId, {
                id: alunoId,
                nome: firstSub.student_name || 'Aluno Registrado',
                email: firstSub.student_email || '',
                nucleos: { nome: poloName }
              })
            }
          }
        }
      }
    }

    let list = Array.from(mapAlunos.values())

    // Filtro por busca de texto
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      list = list.filter((a: any) =>
        (a.nome || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q)
      )
    }

    return list.sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
  }, [allStudents, selectedNucleo, submissionsPorAlunoModulo, searchTerm])

  // Salvar nota editada inline
  const handleSaveGrade = async (alunoId: string, aulaId: string, livroId: string, newGrade: number) => {
    setSaving(`${alunoId}_${aulaId}`)
    try {
      const currentBook = bookById[livroId]
      const isVirtual = String(aulaId).startsWith('virtual-')

      if (isVirtual) {
        // Grava no historico_notas se for coluna virtual
        const { error } = await supabase
          .from('historico_notas')
          .upsert({
            aluno_id: alunoId,
            modulo_nome: currentBook?.titulo || 'Módulo',
            nota: newGrade,
            data_conclusao: new Date().toISOString().split('T')[0]
          }, { onConflict: 'aluno_id,modulo_nome' })
        if (error) throw error
      } else {
        const { sub } = getStudentGrade(alunoId, livroId, aulaId)
        const subId = sub?.submission_id || sub?.id
        if (subId && !String(subId).startsWith('hist-')) {
          const { error } = await supabase
            .from('respostas_aulas')
            .update({ nota: newGrade, status: 'corrigida', updated_at: new Date().toISOString() })
            .eq('id', subId)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('respostas_aulas')
            .upsert({
              aluno_id: alunoId,
              aula_id: aulaId,
              nota: newGrade,
              status: 'corrigida',
              tentativas: 1,
              respostas: {},
              updated_at: new Date().toISOString()
            }, { onConflict: 'aluno_id,aula_id' })
          if (error) throw error
        }
      }

      await fetchComplementaryHistory()
      if (onRefresh) onRefresh()
    } catch (err: any) {
      alert('Erro ao salvar nota: ' + (err.message || err))
    } finally {
      setSaving(null)
    }
  }

  const startEdit = (alunoId: string, aulaId: string, livroId: string, currentGrade: number | null) => {
    setEditCell({ alunoId, aulaId, livroId })
    setEditValue(currentGrade != null ? String(currentGrade) : '')
  }

  const confirmEdit = async (alunoId: string, aulaId: string, livroId: string) => {
    if (!editCell || editValue === '') {
      setEditCell(null)
      return
    }
    const parsed = parseFloat(editValue.replace(',', '.'))
    if (isNaN(parsed) || parsed < 0 || parsed > 10) {
      alert('Nota inválida. Digite um valor entre 0 e 10.')
      return
    }
    await handleSaveGrade(alunoId, aulaId, livroId, parsed)
    setEditCell(null)
  }

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
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem', fontWeight: 800 }}>
            <GraduationCap color="var(--primary)" size={28} /> Boletim Geral de Notas & Progresso
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Consulte notas oficiais, edite pontuações e acompanhe as taxas de aprovação e reprovação por módulo.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {loadingHistory && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--primary)' }}>
              <Loader2 size={16} className="spinner" /> Sincronizando notas...
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.82rem', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px', fontWeight: 700 }}
            onClick={handleAutoCorrect}
            disabled={autoCorrecting}
            title="Corrige automaticamente pelo sistema todas as avaliações pendentes dos alunos"
          >
            {autoCorrecting ? <Loader2 size={16} className="spinner" /> : <Award size={16} />}
            Auto-Corrigir Avaliações Pendentes
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
            1. Curso
          </label>
          <select
            className="form-control"
            value={selectedCourseId}
            onChange={e => { setSelectedCourseId(e.target.value); setSelectedModuloId('') }}
            style={{ width: '100%' }}
          >
            <option value="">Selecione um curso...</option>
            {cursosDisponiveis.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
            2. Módulo Específico
          </label>
          <select
            className="form-control"
            value={selectedModuloId}
            onChange={e => setSelectedModuloId(e.target.value)}
            style={{ width: '100%' }}
            disabled={!selectedCourseId}
          >
            <option value="">Todos os Módulos do Curso</option>
            {modulosDisponiveis.map((l: any) => (
              <option key={l.id} value={l.id}>{l.titulo}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
            3. Filtrar Polo / Núcleo
          </label>
          <select
            className="form-control"
            value={selectedNucleo}
            onChange={e => setSelectedNucleo(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="todos">Todos os Polos</option>
            {professorNucleos.map((n: any) => (
              <option key={n.id} value={n.nome}>{n.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
            4. Buscar Aluno
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Nome ou e-mail..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '2rem' }}
            />
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {!selectedCourseId ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 2rem', color: 'var(--text-muted)' }}>
          <BookOpen size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Selecione um curso acima para visualizar o boletim.</p>
        </div>
      ) : (
        <>
          {selectedModuloId ? (
            <ModuloBoletimContainer
              key={selectedModuloId}
              livroId={selectedModuloId}
              livroTitulo={bookById[selectedModuloId]?.titulo || 'Módulo'}
              aulas={aulasPorModulo[selectedModuloId] || []}
              alunos={getAlunosParaModulo(selectedModuloId)}
              getStudentGrade={getStudentGrade}
              getSituacao={getSituacao}
              editCell={editCell}
              editValue={editValue}
              setEditValue={setEditValue}
              startEdit={startEdit}
              confirmEdit={confirmEdit}
              saving={saving}
              onOpenStudentModal={openStudentModal}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {modulosDisponiveis.map((mod: any) => {
                const isExpanded = expandedModulos.has(mod.id)
                const alunosModulo = getAlunosParaModulo(mod.id)

                return (
                  <div key={mod.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                    <div
                      onClick={() => toggleModulo(mod.id)}
                      style={{
                        padding: '1.1rem 1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(255,255,255,0.02)',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <BookOpen size={20} color="var(--primary)" />
                        <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{mod.titulo}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', background: 'var(--primary, #0056b3)', padding: '2px 10px', borderRadius: '12px' }}>
                          {alunosModulo.length} alunos
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {isExpanded ? 'Ocultar Boletim' : 'Expandir Boletim'}
                        </span>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '1.25rem' }}>
                        <ModuloBoletimContainer
                          livroId={mod.id}
                          livroTitulo={mod.titulo}
                          aulas={aulasPorModulo[mod.id] || []}
                          alunos={alunosModulo}
                          getStudentGrade={getStudentGrade}
                          getSituacao={getSituacao}
                          editCell={editCell}
                          editValue={editValue}
                          setEditValue={setEditValue}
                          startEdit={startEdit}
                          confirmEdit={confirmEdit}
                          saving={saving}
                          onOpenStudentModal={openStudentModal}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {selectedStudentForModal && (
        <StudentDetailsModal
          student={selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
          courseSubmissions={studentModalSubmissions}
          studentCourseLivros={studentModalLivros}
          allAulas={studentModalAulas}
          progressoIds={studentModalProgresso}
          studentExceptions={studentModalExceptions}
          handleToggleException={async (sId, lId, current) => {
            if (!current) {
              await supabase.from('liberacoes_excecao').upsert({ user_id: sId, livro_id: lId }, { onConflict: 'user_id,livro_id' })
              setStudentModalExceptions([...studentModalExceptions, lId])
            } else {
              await supabase.from('liberacoes_excecao').delete().match({ user_id: sId, livro_id: lId })
              setStudentModalExceptions(studentModalExceptions.filter(id => id !== lId))
            }
          }}
          handleDeleteSubmission={handleDeleteSubmissionModal}
          actionLoading={null}
          isProfessor={true}
          historicoNotas={directHistoryGrades.filter(h => h.aluno_id === selectedStudentForModal.id)}
        />
      )}
    </div>
  )
}

interface ModuloBoletimContainerProps {
  livroId: string
  livroTitulo: string
  aulas: any[]
  alunos: any[]
  getStudentGrade: (alunoId: string, livroId: string, aulaId: string) => { sub: any; nota: number | null }
  getSituacao: (alunoId: string, livroId: string) => 'aprovado' | 'reprovado' | 'nao_avaliado'
  editCell: { alunoId: string; aulaId: string; livroId: string } | null
  editValue: string
  setEditValue: (v: string) => void
  startEdit: (alunoId: string, aulaId: string, livroId: string, grade: number | null) => void
  confirmEdit: (alunoId: string, aulaId: string, livroId: string) => void
  saving: string | null
  onOpenStudentModal?: (aluno: any) => void
}

const ModuloBoletimContainer: React.FC<ModuloBoletimContainerProps> = ({
  livroId,
  livroTitulo,
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
  onOpenStudentModal,
}) => {
  // Cálculo de Progresso de Aprovação e Reprovação do Módulo
  const stats = useMemo(() => {
    let aprovados = 0
    let reprovados = 0
    let naoAvaliados = 0

    for (const aluno of alunos) {
      const sit = getSituacao(aluno.id, livroId)
      if (sit === 'aprovado') aprovados++
      else if (sit === 'reprovado') reprovados++
      else naoAvaliados++
    }

    const total = alunos.length
    const avaliados = aprovados + reprovados
    const taxaAprovacao = avaliados > 0 ? Math.round((aprovados / avaliados) * 100) : 0
    const taxaReprovacao = avaliados > 0 ? Math.round((reprovados / avaliados) * 100) : 0

    const pctAprovadosTotal = total > 0 ? Math.round((aprovados / total) * 100) : 0
    const pctReprovadosTotal = total > 0 ? Math.round((reprovados / total) * 100) : 0
    const pctPendentesTotal = total > 0 ? Math.max(0, 100 - pctAprovadosTotal - pctReprovadosTotal) : 0

    return {
      total,
      aprovados,
      reprovados,
      naoAvaliados,
      avaliados,
      taxaAprovacao,
      taxaReprovacao,
      pctAprovadosTotal,
      pctReprovadosTotal,
      pctPendentesTotal
    }
  }, [alunos, getSituacao, livroId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* PAINEL DE PROGRESSO DE APROVAÇÃO E REPROVAÇÃO */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        borderRadius: '16px',
        padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <TrendingUp size={20} color="var(--primary, #0056b3)" />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
              Progresso Acadêmico do Módulo: <span style={{ color: 'var(--primary, #0056b3)' }}>{livroTitulo}</span>
            </h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 800 }}>
            <span style={{ color: '#0056b3' }}>Aproveitamento: {stats.taxaAprovacao}%</span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: '#dc2626' }}>Reprovação / DP: {stats.taxaReprovacao}%</span>
          </div>
        </div>

        {/* Métricas KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Alunos</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, marginTop: '0.2rem' }}>{stats.total}</div>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(0, 86, 179, 0.08)', border: '1.5px solid #0056b3', textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#0056b3', fontWeight: 800, textTransform: 'uppercase' }}>Aprovados (≥ 7.0)</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0056b3', marginTop: '0.2rem' }}>
              {stats.aprovados} <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({stats.pctAprovadosTotal}%)</span>
            </div>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(220, 38, 38, 0.08)', border: '1.5px solid #dc2626', textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 800, textTransform: 'uppercase' }}>Reprovados / DP (&lt; 7.0)</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626', marginTop: '0.2rem' }}>
              {stats.reprovados} <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({stats.pctReprovadosTotal}%)</span>
            </div>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Não Avaliados</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {stats.naoAvaliados} <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({stats.pctPendentesTotal}%)</span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Visual Segmentada */}
        <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', display: 'flex' }}>
          <div
            title={`Aprovados: ${stats.aprovados} (${stats.pctAprovadosTotal}%)`}
            style={{ width: `${stats.pctAprovadosTotal}%`, background: 'var(--primary, #0056b3)', transition: 'width 0.4s ease' }}
          />
          <div
            title={`Reprovados / DP: ${stats.reprovados} (${stats.pctReprovadosTotal}%)`}
            style={{ width: `${stats.pctReprovadosTotal}%`, background: '#dc2626', transition: 'width 0.4s ease' }}
          />
          <div
            title={`Pendentes: ${stats.naoAvaliados} (${stats.pctPendentesTotal}%)`}
            style={{ width: `${stats.pctPendentesTotal}%`, background: 'rgba(255,255,255,0.15)', transition: 'width 0.4s ease' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.6rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--primary, #0056b3)', display: 'inline-block' }} /> Aprovados (Azul)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} /> Reprovados / D.P. (Vermelho)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-block' }} /> Pendentes
          </span>
        </div>
      </div>

      {/* TABELA DE ALUNOS E NOTAS */}
      <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.01)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--glass-border)', background: 'rgba(0, 86, 179, 0.05)' }}>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--text-main, #fff)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Aluno
              </th>
              <th style={{ textAlign: 'left', padding: '0.85rem 0.75rem', fontWeight: 800, color: 'var(--text-main, #fff)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Núcleo / Polo
              </th>
              {aulas.map((aula: any) => (
                <th key={aula.id} style={{ textAlign: 'center', padding: '0.85rem 0.75rem', fontWeight: 800, color: 'var(--text-main, #fff)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '95px' }}>
                  <div style={{ color: '#60a5fa', fontWeight: 900 }}>{getExamLabel(aula)}</div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'none', marginTop: '2px' }}>
                    {aula.titulo ? (aula.titulo.length > 20 ? `${aula.titulo.substring(0, 18)}...` : aula.titulo) : 'Oficial'}
                  </div>
                </th>
              ))}
              <th style={{ textAlign: 'center', padding: '0.85rem 0.75rem', fontWeight: 800, color: 'var(--text-main, #fff)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '120px' }}>
                Situação
              </th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((aluno: any) => {
              const situacao = getSituacao(aluno.id, livroId)

              return (
                <tr
                  key={aluno.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Nome do Aluno */}
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <div>
                        <div
                          onClick={() => onOpenStudentModal && onOpenStudentModal(aluno)}
                          style={{
                            color: onOpenStudentModal ? '#60a5fa' : 'var(--text-main, #fff)',
                            cursor: onOpenStudentModal ? 'pointer' : 'default',
                            textDecoration: onOpenStudentModal ? 'underline' : 'none',
                            fontWeight: 700
                          }}
                          title="Clique para ver o progresso do aluno por módulo"
                        >
                          {aluno.nome || 'Sem Nome'}
                        </div>
                        {aluno.email && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>{aluno.email}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Núcleo / Polo */}
                  <td style={{ padding: '0.75rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={12} style={{ opacity: 0.6 }} />
                      {aluno.nucleos?.nome || 'Sem Polo'}
                    </span>
                  </td>

                  {/* Colunas de Avaliações / Notas */}
                  {aulas.map((aula: any) => {
                    const { nota } = getStudentGrade(aluno.id, livroId, aula.id)
                    const isEditing = editCell?.alunoId === aluno.id && editCell?.aulaId === aula.id
                    const isSaving = saving === `${aluno.id}_${aula.id}`
                    const isAprovado = nota != null && nota >= 7.0
                    const isReprovado = nota != null && nota < 7.0

                    return (
                      <td key={aula.id} style={{ textAlign: 'center', padding: '0.5rem 0.4rem' }}>
                        {isEditing ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') confirmEdit(aluno.id, aula.id, livroId)
                                if (e.key === 'Escape') setEditValue('')
                              }}
                              style={{
                                width: '56px',
                                padding: '4px 6px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                textAlign: 'center',
                                background: '#000',
                                border: '2px solid var(--primary, #0056b3)',
                                borderRadius: '6px',
                                color: '#fff'
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => confirmEdit(aluno.id, aula.id, livroId)}
                              style={{ padding: '3px', background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}
                              title="Salvar"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setEditValue('')}
                              style={{ padding: '3px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                              title="Cancelar"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => startEdit(aluno.id, aula.id, livroId, nota)}
                            style={{
                              cursor: 'pointer',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '48px',
                              fontWeight: 900,
                              fontSize: '0.95rem',
                              // CONTRASTE REFORÇADO CONFORME SOLICITADO:
                              // Sempre AZUL caso aprovado (>= 7.0)
                              // Sempre VERMELHO caso reprova (< 7.0)
                              background: isAprovado
                                ? 'rgba(0, 86, 179, 0.15)'
                                : isReprovado
                                  ? 'rgba(220, 38, 38, 0.15)'
                                  : 'rgba(255,255,255,0.03)',
                              color: isAprovado
                                ? '#0056b3'
                                : isReprovado
                                  ? '#dc2626'
                                  : 'var(--text-muted)',
                              border: isAprovado
                                ? '1.5px solid #0056b3'
                                : isReprovado
                                  ? '1.5px solid #dc2626'
                                  : '1px solid rgba(255,255,255,0.08)',
                              boxShadow: isAprovado
                                ? '0 2px 5px rgba(0, 86, 179, 0.2)'
                                : isReprovado
                                  ? '0 2px 5px rgba(220, 38, 38, 0.2)'
                                  : 'none',
                              transition: 'all 0.15s ease'
                            }}
                            title="Clique para editar a nota do aluno"
                          >
                            {isSaving ? (
                              <Loader2 size={14} className="spinner" />
                            ) : (
                              nota != null ? Number(nota).toFixed(1) : '—'
                            )}
                          </span>
                        )}
                      </td>
                    )
                  })}

                  {/* Situação */}
                  <td style={{ textAlign: 'center', padding: '0.75rem 0.75rem' }}>
                    {situacao === 'aprovado' && (
                      <span style={{
                        padding: '4px 14px',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        background: 'var(--primary, #0056b3)',
                        color: '#ffffff',
                        border: '1px solid #004494',
                        letterSpacing: '0.5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        boxShadow: '0 2px 6px rgba(0, 86, 179, 0.3)'
                      }}>
                        <CheckCircle2 size={13} /> APROVADO
                      </span>
                    )}
                    {situacao === 'reprovado' && (
                      <span style={{
                        padding: '4px 14px',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        background: '#dc2626',
                        color: '#ffffff',
                        border: '1px solid #b91c1c',
                        letterSpacing: '0.5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
                      }}>
                        <XCircle size={13} /> REPROVADO (D.P.)
                      </span>
                    )}
                    {situacao === 'nao_avaliado' && (
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'rgba(255,255,255,0.04)',
                        color: 'var(--text-muted)',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
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
            <Users size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p style={{ margin: 0 }}>Nenhum aluno encontrado para este módulo com os filtros aplicados.</p>
          </div>
        )}

        {alunos.length > 0 && (
          <div style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <strong>Dica:</strong> Clique em qualquer nota para editar rapidamente. Pressione <strong>Enter</strong> para salvar ou <strong>ESC</strong> para cancelar.
            </span>
            <span>Total: <strong>{alunos.length}</strong> alunos listados</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default BoletimPanel
