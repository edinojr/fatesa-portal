import React, { useState, useEffect } from 'react'
import { Users, Plus, Award, ChevronRight, Loader2, Save, Trash2, XCircle, Clock, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StudentRow from '../features/nucleos/components/StudentRow'
import NucleoSolicitacoes from '../features/nucleos/components/NucleoSolicitacoes'
import NucleoReleaseManager from '../features/nucleos/components/NucleoReleaseManager'
import StudentDetailsModal from '../features/nucleos/components/StudentDetailsModal'
import AddNucleoModal from '../features/nucleos/components/AddNucleoModal'

interface NucleoPanelProps {
  userRole?: string
  autoOpenAddModal?: boolean
  onModalClose?: () => void
}

const NucleosPanel: React.FC<NucleoPanelProps> = ({ 
  userRole = 'professor', 
  autoOpenAddModal, 
  onModalClose 
}) => {
  const [nucleos, setNucleos] = useState<any[]>([]) // All available
  const [myNucleos, setMyNucleos] = useState<any[]>([]) // Tied to teacher
  const [selectedNucleo, setSelectedNucleo] = useState<any | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [professors, setProfessors] = useState<any[]>([])
  const [linkedProfessors, setLinkedProfessors] = useState<any[]>([])
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const [editingNucleo, setEditingNucleo] = useState<any | null>(null)

  // Schedule builder state
  const [schedules, setSchedules] = useState([{ day: '', start: '', end: '' }])
  const [showCreateForm, setShowCreateForm] = useState(false)

  const addSchedule = () => setSchedules([...schedules, { day: '', start: '', end: '' }])
  const removeSchedule = (index: number) => setSchedules(schedules.filter((_: any, i: number) => i !== index))
  const updateSchedule = (index: number, field: string, value: string) => {
    const newSchedules = [...schedules]
    ;(newSchedules[index] as any)[field] = value
    setSchedules(newSchedules)
  }

  const [allCourses, setAllCourses] = useState<any[]>([])
  const [releasedItems, setReleasedItems] = useState<Record<string, boolean>>({})
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<any | null>(null)
  
  // Missing states causing build errors
  const [atividades, setAtividades] = useState<any[]>([])
  const [notas, setNotas] = useState<any[]>([])
  const [courseSubmissions, setCourseSubmissions] = useState<any[]>([])
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [questionEvaluations, setQuestionEvaluations] = useState<Record<string, boolean>>({})
  const [studentCourseLivros, setStudentCourseLivros] = useState<any[]>([])
  const [studentExceptions, setStudentExceptions] = useState<string[]>([])

  const isAdmin = userRole === 'admin'
  const isProfessor = userRole === 'professor'

  useEffect(() => {
    fetchInitialData()
  }, [userRole])

  useEffect(() => {
    if (autoOpenAddModal) {
      setShowAddModal(true)
    }
  }, [autoOpenAddModal])

  useEffect(() => {
    if (!showAddModal && onModalClose) {
      onModalClose()
    }
  }, [showAddModal, onModalClose])

  const fetchInitialData = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // All nucleos
    const resNuc = await supabase.from('nucleos').select('*').order('nome')
    if (resNuc.data) setNucleos(resNuc.data)

    // My nucleos
    const resMy = await supabase.from('professor_nucleo')
      .select('nucleo_id, nucleos(*)')
      .eq('professor_id', session.user.id)
    
    if (resMy.data) {
      setMyNucleos(resMy.data.map((d: any) => d.nucleos).filter(Boolean))
    }

    // All Professors (Admin only)
    if (isAdmin) {
      const { data: profs } = await supabase.from('users').select('*').eq('tipo', 'professor').order('nome')
      if (profs) setProfessors(profs)
    }
    
    setLoading(false)
  }

  const selectNucleo = async (nuc: any) => {
    setSelectedNucleo(nuc)
    setShowStudentModal(null)
    setLoading(true)

    // Fetch students of this nucleo
    const { data: studentsData } = await supabase.from('users').select('*').eq('nucleo_id', nuc.id)

    if (studentsData) {
      // For each student, fetch their latest payment
      const studentsWithPayments = await Promise.all(
        studentsData.map(async (student: any) => {
          const { data: pays } = await supabase
            .from('pagamentos')
            .select('status, comprovante_url, updated_at')
            .eq('user_id', student.id)
            .order('updated_at', { ascending: false })
            .limit(1)
          return { ...student, pagamento: pays?.[0] || null }
        })
      )
      setStudents(studentsWithPayments)
    }

    // Fetch atividades for this nucleo
    const resAtv = await supabase.from('atividades').select('*').eq('nucleo_id', nuc.id).order('created_at', { ascending: false })
    if (resAtv.data) setAtividades(resAtv.data)

    // Fetch All Courses/Livros/Aulas for release management
    const resAll = await supabase.from('cursos').select('id, nome, livros(id, titulo, aulas(id, titulo, tipo, ordem))')
    if (resAll.data) setAllCourses(resAll.data)

    // Fetch existing releases
    const resRel = await supabase.from('liberacoes_nucleo').select('*').eq('nucleo_id', nuc.id).eq('liberado', true)
    const mapped: Record<string, boolean> = {}
    if (resRel.data) {
      resRel.data.forEach((r: any) => mapped[`${r.item_type}:${r.item_id}`] = true)
    }
    setReleasedItems(mapped)

    // Fetch linked professors
    const { data: lpData } = await supabase
      .from('professor_nucleo')
      .select('professor_id, users(*)')
      .eq('nucleo_id', nuc.id);
    
    if (lpData) {
      setLinkedProfessors(lpData.map((d: any) => d.users).filter(Boolean));
    }
    
    setLoading(false)
  }

  const handleToggleRelease = async (itemId: string, itemType: 'modulo' | 'atividade' | 'video', currentStatus: boolean) => {
    if (!selectedNucleo) return
    const newStatus = !currentStatus
    const key = `${itemType}:${itemId}`

    setActionLoading(`release_${key}`)
    try {
      if (newStatus) {
        await supabase.from('liberacoes_nucleo').upsert({
          nucleo_id: selectedNucleo.id,
          item_id: itemId,
          item_type: itemType,
          liberado: true
        }, { onConflict: 'nucleo_id, item_id, item_type' })
      } else {
        await supabase.from('liberacoes_nucleo').delete().match({
          nucleo_id: selectedNucleo.id,
          item_id: itemId,
          item_type: itemType
        })
      }
      setReleasedItems({ ...releasedItems, [key]: newStatus })
    } catch (err: any) {
      alert('Erro ao alterar liberação: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkRelease = async (release: boolean) => {
    if (!selectedNucleo) return
    const actionName = release ? 'Liberar' : 'Bloquear'
    if (!confirm(`Deseja realmente ${actionName} TODO o conteúdo (livros e provas) de todos os cursos para este núcleo?`)) return

    setActionLoading('bulk_release')
    try {
      const itemsToProcess: { item_id: string; item_type: 'modulo' | 'atividade' | 'video' }[] = []
      
      allCourses.forEach((course: any) => {
        (course.livros || []).forEach((livro: any) => {
          itemsToProcess.push({ item_id: livro.id, item_type: 'modulo' });
          (livro.aulas || []).forEach((aula: any) => {
            if (aula.tipo === 'atividade' || aula.tipo === 'prova') {
              itemsToProcess.push({ item_id: aula.id, item_type: 'atividade' })
            } else if (aula.tipo === 'gravada' || aula.tipo === 'ao_vivo') {
              itemsToProcess.push({ item_id: aula.id, item_type: 'video' })
            }
          })
        })
      })

      if (release) {
        // Bulk upsert for release
        const chunks = []
        for (let i = 0; i < itemsToProcess.length; i += 100) {
          chunks.push(itemsToProcess.slice(i, i + 100))
        }

        for (const chunk of chunks) {
          const payload = chunk.map(it => ({
            nucleo_id: selectedNucleo.id,
            item_id: it.item_id,
            item_type: it.item_type,
            liberado: true
          }))
          const { error } = await supabase.from('liberacoes_nucleo').upsert(payload, { onConflict: 'nucleo_id, item_id, item_type' })
          if (error) throw error
        }
      } else {
        // Bulk delete for block
        const { error } = await supabase.from('liberacoes_nucleo').delete().eq('nucleo_id', selectedNucleo.id)
        if (error) throw error
      }

      // Sync local state
      const newReleased: Record<string, boolean> = {}
      if (release) {
        itemsToProcess.forEach(it => newReleased[`${it.item_type}:${it.item_id}`] = true)
      }
      setReleasedItems(newReleased)
      alert(`Conteúdo ${release ? 'liberado' : 'bloqueado'} com sucesso!`)
    } catch (err: any) {
      alert('Erro na ação em massa: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveQuestionnaire = async (atividadeId: string, questionnaireData: any[]) => {
    setActionLoading('save_q')
    try {
      const { error } = await supabase
        .from('atividades')
        .update({ questionario: questionnaireData })
        .eq('id', atividadeId)
      
      if (error) throw error
      alert('Questionário salvo com sucesso!')
      
      // Update local state
      setAtividades((prev: any[]) => prev.map((a: any) => a.id === atividadeId ? { ...a, questionario: questionnaireData } : a))
      setEditingQuestionnaire(null)
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleLinkNucleo = async (nucleoId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    // Check if already linked
    if (myNucleos.some((mn: any) => mn.id === nucleoId)) {
      alert('Você já está vinculado a este núcleo e já pode acessá-lo na sua tela inicial!')
      setShowAddModal(false)
      return
    }

    setActionLoading('link_nuc')
    try {
      const { error } = await supabase.from('professor_nucleo').upsert(
        {
          professor_id: session.user.id,
          nucleo_id: nucleoId
        },
        { onConflict: 'professor_id, nucleo_id' }
      )
      if (error) throw error
      alert('Núcleo vinculado com sucesso!')
      setShowAddModal(false)
      fetchInitialData()
    } catch(err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnlinkNucleo = async (nucleoId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // ENSURE TOTAL ISOLATION FROM PARENT CLICKS
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
    
    const confirmacao = window.confirm('Deseja realmente sair deste núcleo? Você perderá o acesso a esta turma e as respostas dos alunos deste núcleo não aparecerão mais para você.');
    if (!confirmacao) return;

    setActionLoading(`unlink_nuc_${nucleoId}`);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Sessão expirada. Por favor, faça login novamente.');
        return;
      }

      const { error, count } = await supabase
        .from('professor_nucleo')
        .delete({ count: 'exact' })
        .eq('professor_id', user.id)
        .eq('nucleo_id', nucleoId);
      
      if (error) throw error;

      if (count === 0) {
        alert('Vínculo não encontrado ou já removido.');
      } else {
        alert('Sucesso: Você saiu do núcleo.');
      }

      if (selectedNucleo?.id === nucleoId) setSelectedNucleo(null);
      await fetchInitialData();
    } catch (err: any) {
      alert('Erro ao sair do núcleo: ' + (err.message || 'Erro de conexão'));
    } finally {
      setActionLoading(null);
    }
  };
  const handleLinkProfessorToNucleo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const professorId = formData.get('professor_id') as string
    const nucleoId = formData.get('nucleo_id') as string || selectedNucleo?.id

    if (!professorId || !nucleoId) return

    setActionLoading('link_prof')
    try {
      const { error } = await supabase.from('professor_nucleo').upsert(
        {
          professor_id: professorId,
          nucleo_id: nucleoId
        },
        { onConflict: 'professor_id, nucleo_id' }
      )
      if (error) throw error
      alert('Professor vinculado ao núcleo com sucesso!')
      setShowAddModal(false)
      fetchInitialData()
      if (selectedNucleo?.id === nucleoId) {
        selectNucleo(selectedNucleo);
      }
    } catch (err: any) {
      alert('Erro ao vincular: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveProfessor = async (professorId: string) => {
    if (!selectedNucleo) return;
    if (!confirm('Deseja realmente remover o vínculo deste professor com este núcleo?')) return;

    setActionLoading(`remove_prof_${professorId}`);
    try {
      const { error } = await supabase
        .from('professor_nucleo')
        .delete()
        .eq('professor_id', professorId)
        .eq('nucleo_id', selectedNucleo.id);
      
      if (error) throw error;
      alert('Vínculo removido com sucesso.');
      selectNucleo(selectedNucleo); // Refresh
    } catch (err: any) {
      alert('Erro ao remover vínculo: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  }

  const parseScheduleString = (str: string | null | undefined): { day: string; start: string; end: string }[] => {
    if (!str) return [{ day: '', start: '', end: '' }];
    return str.split(', ').map(p => {
      const match = p.match(/(.+) \((.+) - (.+)\)/);
      return match ? { day: match[1], start: match[2], end: match[3] } : null;
    }).filter((p): p is { day: string; start: string; end: string } => p !== null);
  }

  const handleCreateNucleo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const isEditing = !!editingNucleo
    setActionLoading(isEditing ? 'update_nuc' : 'create_nuc')
    const formData = new FormData(e.currentTarget)
    
    const nucleoData = Object.fromEntries(formData.entries()) as any;
    
    const horarioStr = schedules
      .filter((s: any) => s.day && s.start && s.end)
      .map((s: any) => `${s.day} (${s.start} - ${s.end})`)
      .join(', ')

    const finalNucleoData = {
      ...nucleoData,
      horario_aulas: horarioStr || (formData.get('horario_aulas') as string)
    }
    
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('nucleos')
          .update(finalNucleoData)
          .eq('id', editingNucleo.id)
        if (error) throw error
        alert('Núcleo atualizado com sucesso!')
      } else {
        const { data, error } = await supabase.from('nucleos').insert(finalNucleoData).select().maybeSingle()
        if (error) throw error
        
        // Automatically link teacher to it (even if Admin creates it, link the creator)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await supabase.from('professor_nucleo').upsert(
            { professor_id: session.user.id, nucleo_id: data.id },
            { onConflict: 'professor_id, nucleo_id' }
          )
        }
        alert('Núcleo criado com sucesso!')
      }
      
      setShowAddModal(false)
      setEditingNucleo(null)
      fetchInitialData()
      if (selectedNucleo?.id === editingNucleo?.id) {
        setSelectedNucleo({ ...selectedNucleo, ...finalNucleoData })
      }
    } catch(err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '')
    if (cep.length !== 8) return

    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        // Find inputs by ID since they are in a sub-component form
        const logradouro = document.getElementById('form_logradouro') as HTMLInputElement
        const bairro = document.getElementById('form_bairro') as HTMLInputElement
        const cidade = document.getElementById('form_cidade') as HTMLInputElement
        const estado = document.getElementById('form_estado') as HTMLInputElement
        
        if (logradouro) logradouro.value = data.logradouro
        if (bairro) bairro.value = data.bairro
        if (cidade) cidade.value = data.localidade
        if (estado) estado.value = data.uf
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err)
    } finally {
      setCepLoading(false)
    }
  }

  const toggleEvaluation = (sub: any, questionId: string, isCorrect: boolean) => {
    const newEvals = { ...questionEvaluations, [questionId]: isCorrect };
    setQuestionEvaluations(newEvals);
    
    // Calculate new grade for THIS submission - ROBUST FILTER
    const questionnaire = (sub.aulas?.questionario || []).filter((q: any) => q && q.id && q.text);
    const totalQuestions = questionnaire.length;
    
    if (totalQuestions > 0) {
      // Contagem robusta percorrendo todas as questões
      const correctCount = questionnaire.reduce((acc: number, q: any) => {
        return acc + (newEvals[q.id] === true ? 1 : 0);
      }, 0);
      
      const calculatedGrade = (correctCount / totalQuestions) * 10;
      
      // Also pre-select this activity in the dropdown if not already selected
      const select = document.querySelector('select[name="atividade_id"]') as HTMLSelectElement;
      const gradeInput = document.querySelector('input[name="nota"]') as HTMLInputElement;
      if (select && gradeInput) {
        select.value = `course:${sub.aulas.id}`;
        gradeInput.value = calculatedGrade.toFixed(1);
      }
    }
  }

  const handleExpandSub = (sub: any) => {
    if (expandedSub === sub.id) {
      setExpandedSub(null);
      return;
    }
    
    setExpandedSub(sub.id);
    
    // Auto-prefill evaluations for auto-graded questions - CLEAN FILTER
    const initialEvals: Record<string, boolean> = {};
    const questionnaire = (sub.aulas?.questionario || []).filter((q: any) => q && q.id && q.text);
    
    questionnaire.forEach((q: any) => {
      const studentAns = sub.respostas?.[q.id];
      const correctOpt = q.correctOption !== undefined ? q.correctOption : q.correct;

      if (q.type === 'multiple_choice' || !q.type) {
        initialEvals[q.id] = studentAns !== undefined && studentAns !== null && String(studentAns) === String(correctOpt);
      } else if (q.type === 'true_false') {
        initialEvals[q.id] = !!(studentAns === q.correctAnswer);
      } else if (q.type === 'matching') {
        let allCorrect = true;
        if (!studentAns || Object.keys(studentAns).length === 0) {
          allCorrect = false;
        } else {
          q.matchingPairs?.forEach((_: any, idx: number) => {
            if (String(studentAns[idx]) !== String(idx)) allCorrect = false;
          });
        }
        initialEvals[q.id] = allCorrect;
      }
    });
    
    setQuestionEvaluations(initialEvals);
    
    // Initial grade calculation (Auto-graded only)
    const totalQuestions = questionnaire.length;
    if (totalQuestions > 0) {
      const correctCount = questionnaire.reduce((acc: number, q: any) => {
        return acc + (initialEvals[q.id] === true ? 1 : 0);
      }, 0);
      const initialGrade = (correctCount / totalQuestions) * 10;
      
      const select = document.querySelector('select[name="atividade_id"]') as HTMLSelectElement;
      const gradeInput = document.querySelector('input[name="nota"]') as HTMLInputElement;
      if (select && gradeInput) {
        select.value = `course:${sub.aulas.id}`;
        gradeInput.value = initialGrade.toFixed(1);
      }
    }
  }

  const handleDeleteSubmission = async (subId: string) => {
    if (!confirm('Deseja realmente excluir esta atividade do fichário do aluno? Esta ação removerá a resposta e a nota associada.')) return
    
    setActionLoading(`delete_sub_${subId}`)
    try {
      const { error } = await supabase.from('respostas_aulas').delete().eq('id', subId)
      if (error) throw error
      alert('Atividade removida com sucesso.')
      // Refresh current student modal data
      openStudent(showStudentModal)
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }



  const handleDeleteNucleo = async (nucleoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Deseja realmente excluir este núcleo? Todas as atividades e alunos ficarão sem pólo associado. Mande os professores desvincularem os alunos antes, ou faça isso ciente.')) return
    
    setActionLoading(`delete_nuc_${nucleoId}`)
    try {
      const { error } = await supabase.from('nucleos').delete().eq('id', nucleoId)
      if (error) throw error
      alert('Núcleo excluído.')
      if (selectedNucleo?.id === nucleoId) setSelectedNucleo(null)
      fetchInitialData()
    } catch(err: any) {
      alert('Erro ao excluir: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const openStudent = async (student: any) => {
    setShowStudentModal(student)
    setLoading(true)
    try {
      // Fetch manual grades (legacy)
      const { data: nData } = await supabase.from('notas').select('*, atividades(*)').eq('aluno_id', student.id)
      if (nData) setNotas(nData)
      
      // Fetch course submissions (Fichário)
      const { data: sData } = await supabase
        .from('respostas_aulas')
        .select('*, aulas(id, titulo, questionario, tipo, is_bloco_final)')
        .eq('aluno_id', student.id)
        .order('created_at', { ascending: false })
      
      if (sData) setCourseSubmissions(sData)

      // Fetch student's course modules and exceptions
      if (student.curso_id) {
        const { data: bData } = await supabase.from('livros').select('*').eq('curso_id', student.curso_id).order('ordem')
        if (bData) setStudentCourseLivros(bData)
      }
      
      const { data: exData } = await supabase.from('liberacoes_excecao').select('livro_id').eq('user_id', student.id)
      if (exData) setStudentExceptions(exData.map(e => e.livro_id))
    } finally {
      setLoading(false)
    }
  }

  const handleToggleException = async (studentId: string, livroId: string, currentStatus: boolean) => {
    setActionLoading(`toggle_exception_${livroId}`)
    try {
      if (!currentStatus) {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('liberacoes_excecao').insert({
          user_id: studentId,
          livro_id: livroId,
          granted_by: user?.id
        })
        setStudentExceptions([...studentExceptions, livroId])
      } else {
        await supabase.from('liberacoes_excecao').delete().match({
          user_id: studentId,
          livro_id: livroId
        })
        setStudentExceptions(studentExceptions.filter(id => id !== livroId))
      }
    } catch (err: any) {
      alert('Erro ao alterar autorização: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }


  const handleLancarNota = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setActionLoading('lancar_nota')
    const formData = new FormData(e.currentTarget)
    const atividade_id = formData.get('atividade_id') as string
    const nota = parseFloat(formData.get('nota') as string)
    const feedback = formData.get('feedback') as string
    
    const { data: { session } } = await supabase.auth.getSession()

    try {
      if (atividade_id.startsWith('course:')) {
        // Update Course Activity in respostas_aulas
        const aulaId = atividade_id.split(':')[1];
        const { error } = await supabase.from('respostas_aulas')
          .update({ nota, status: 'corrigida' })
          .match({ aluno_id: showStudentModal.id, aula_id: aulaId });
        if (error) throw error;
      } else {
        // Traditional Polo Activity in notas
        const { error } = await supabase.from('notas').upsert({
          aluno_id: showStudentModal.id,
          atividade_id,
          professor_id: session?.user.id,
          nota,
          feedback
        }, { onConflict: 'aluno_id, atividade_id' })
        if (error) throw error
      }
      
      alert('Nota contabilizada com sucesso!');
      
      // refetch everything
      openStudent(showStudentModal);
      (e.target as HTMLFormElement).reset()
    } catch(err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleApproveStudent = async (studentId: string) => {
    setActionLoading(`approve_${studentId}`)
    try {
      const { error } = await supabase.from('users').update({ status_nucleo: 'aprovado' }).eq('id', studentId)
      if (error) throw error
      alert('Aluno aprovado com sucesso!')
      selectNucleo(selectedNucleo) // Refresh
    } catch(err: any) {
      alert('Erro ao aprovar: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectStudent = async (studentId: string) => {
    if (!confirm('Deseja realmente recusar este aluno? Ele será removido deste núcleo.')) return
    setActionLoading(`reject_${studentId}`)
    try {
      const { error } = await supabase.from('users').update({ nucleo_id: null, status_nucleo: 'aprovado' }).eq('id', studentId)
      if (error) throw error
      alert('Aluno recusado.')
      selectNucleo(selectedNucleo) // Refresh
    } catch(err: any) {
      alert('Erro ao recusar: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleNucleoIsento = async (nuc: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const newIsento = !nuc.isento
    const msg = newIsento
      ? 'Isentar TODOS os alunos deste núcleo (inclusive futuros) de qualquer cobrança?'
      : 'Remover a isenção geral deste núcleo? Os alunos voltarão a ser cobrados normalmente.'
    if (!confirm(msg)) return
    setActionLoading(`isento_nuc_${nuc.id}`)
    try {
      const { error } = await supabase.from('nucleos').update({ isento: newIsento }).eq('id', nuc.id)
      if (error) throw error
      alert(newIsento ? 'Núcleo marcado como isento com sucesso!' : 'Isenção removida.')
      fetchInitialData()
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkPago = async (aluno: any, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Marcar pagamento de "${aluno.nome}" como PAGO manualmente?`)) return
    setActionLoading(`pago_${aluno.id}`)
    try {
      // Upsert a payment record as 'pago'
      const { error } = await supabase.from('pagamentos').upsert(
        {
          user_id: aluno.id,
          status: 'pago',
          updated_at: new Date().toISOString(),
          descricao: 'Pago manualmente pelo administrador',
          valor: 0, // Need a value since it's NOT NULL in schema
          data_vencimento: new Date().toISOString().split('T')[0] // Need a value since it's NOT NULL in schema
        },
        { onConflict: 'user_id' }
      )
      if (error) throw error
      alert('Pagamento registrado com sucesso!')
      selectNucleo(selectedNucleo) // Refresh
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  // Define which list of nucleos to show on the main screen
  const displayNucleos = isAdmin ? nucleos : myNucleos

  if (loading && !selectedNucleo && displayNucleos.length === 0) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="spinner" size={32} /></div>

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="mobile-wrap-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>{isAdmin ? 'Gestão de Todos os Núcleos' : 'Minhas Turmas (Núcleos)'}</h2>
          <p style={{ color: 'var(--text-muted)' }}>{isAdmin ? 'Controle global de todos os polos presenciais e turmas.' : 'Gerencie os alunos, notas e publique atividades para seus pólos.'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ width: 'auto' }}>
          <Plus size={20} /> {isAdmin ? 'Criar / Vincular Núcleo' : 'Adicionar Núcleo'}
        </button>
      </div>

      {/* ShowAddModal #1 removed to consolidate at the bottom */}

      {!selectedNucleo ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {displayNucleos.length === 0 && <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>Nenhum núcleo encontrado.</p>}
          
          {displayNucleos.map((nuc: any) => (
            <div 
              key={nuc.id} 
              className="data-card" 
              style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', position: 'relative' }}
              onClick={() => selectNucleo(nuc)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Users size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {isAdmin && (
                    <button
                      className="btn btn-outline"
                      style={{ width: 'auto', padding: '0.4rem 0.7rem', border: 'none', color: nuc.isento ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}
                      onClick={(e) => handleToggleNucleoIsento(nuc, e)}
                      disabled={actionLoading === `isento_nuc_${nuc.id}`}
                      title={nuc.isento ? 'Remover isenção' : 'Isentar núcleo'}
                    >
                      {actionLoading === `isento_nuc_${nuc.id}` ? <Loader2 className="spinner" size={14} /> : (nuc.isento ? 'Isento' : 'Isentar')}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="btn btn-outline"
                      style={{ width: 'auto', padding: '0.4rem', border: 'none', color: 'var(--primary)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSchedules(parseScheduleString(nuc.horario_aulas));
                        setEditingNucleo(nuc);
                        setShowAddModal(true);
                      }}
                      title="Editar núcleo"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="btn btn-outline"
                      style={{ width: 'auto', padding: '0.4rem', border: 'none', color: 'var(--error)' }}
                      onClick={(e) => handleDeleteNucleo(nuc.id, e)}
                      disabled={actionLoading === `delete_nuc_${nuc.id}`}
                      title="Excluir núcleo"
                    >
                      {actionLoading === `delete_nuc_${nuc.id}` ? <Loader2 className="spinner" size={16} /> : <Trash2 size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {!isAdmin && (
                <button
                  className="btn-icon"
                  style={{ 
                    position: 'absolute', 
                    top: '1rem', 
                    right: '1rem', 
                    padding: '0.4rem', 
                    color: 'var(--error)', 
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '50%',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}
                  onClick={(e) => handleUnlinkNucleo(nuc.id, e)}
                  disabled={actionLoading === `unlink_nuc_${nuc.id}`}
                  title="Sair desta turma"
                >
                  {actionLoading === `unlink_nuc_${nuc.id}` ? <Loader2 className="spinner" size={14} /> : <XCircle size={18} />}
                </button>
              )}
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                {nuc.nome}
                {nuc.isento && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px', background: 'rgba(34,197,94,0.2)', color: 'var(--success)', fontWeight: 700, verticalAlign: 'middle' }}>
                    ISENTO
                  </span>
                )}
              </h3>
              
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {nuc.professor_responsavel && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Award size={14} color="var(--primary)"/> {nuc.professor_responsavel}</span>}
                {nuc.horario_aulas && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} /> {nuc.horario_aulas}</span>}
                {nuc.cidade && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={14} /> {nuc.cidade} - {nuc.estado}</span>}
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                Acessar Gestão de Turma <ChevronRight size={14} />
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button className="btn btn-outline" style={{ marginBottom: '2rem', padding: '0.5rem 1rem', width: 'auto' }} onClick={() => setSelectedNucleo(null)}>
            <ChevronRight style={{ transform: 'rotate(180deg)' }} /> Voltar para Lista de Turmas
          </button>
          
          <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* INFORMAÇÕES DO NÚCLEO */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="data-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--glass)', border: '1px solid var(--primary)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{selectedNucleo.nome}</h2>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => {
                        setSchedules(parseScheduleString(selectedNucleo.horario_aulas));
                        setEditingNucleo(selectedNucleo);
                        setShowAddModal(true);
                      }}
                    >
                      <Save size={14} style={{ marginRight: '0.4rem' }} /> Editar Dados
                    </button>
                    {!isAdmin && (
                      <button 
                        className="btn btn-outline" 
                        style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }} 
                        onClick={(e) => handleUnlinkNucleo(selectedNucleo.id, e)}
                        disabled={actionLoading === `unlink_nuc_${selectedNucleo.id}`}
                      >
                        {actionLoading === `unlink_nuc_${selectedNucleo.id}` ? <Loader2 className="spinner" size={14} /> : <XCircle size={14} style={{ marginRight: '0.4rem' }} />} Sair da Turma
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {selectedNucleo.professor_responsavel && <div><strong>Professor Responsável:</strong> <br/>{selectedNucleo.professor_responsavel}</div>}
                  {selectedNucleo.horario_aulas && <div><strong>Horário de Aulas:</strong> <br/>{selectedNucleo.horario_aulas}</div>}
                  {selectedNucleo.logradouro && <div><strong>Endereço:</strong> <br/>{selectedNucleo.logradouro}, {selectedNucleo.numero} - {selectedNucleo.bairro}<br/>{selectedNucleo.cidade} / {selectedNucleo.estado} - {selectedNucleo.cep}</div>}
                </div>
              </div>

              {/* CORPO DOCENTE (PROFESSORES VINCULADOS) */}
              <div className="data-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0 }}><Award size={20} /> Corpo Docente</h3>
                  {isAdmin && (
                    <button 
                      className="btn btn-outline" 
                      style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        setShowAddModal(true);
                        setShowCreateForm(false);
                      }}
                    >
                      <Plus size={14} /> Vincular Professor
                    </button>
                  )}
                </div>
                
                {linkedProfessors.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum professor vinculado além do responsável.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {linkedProfessors.map((prof) => (
                      <div key={prof.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{prof.nome}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{prof.email}</div>
                        </div>
                        {isAdmin && (
                          <button 
                            className="btn-icon" 
                            style={{ color: 'var(--error)', padding: '0.3rem' }}
                            onClick={() => handleRemoveProfessor(prof.id)}
                            disabled={actionLoading === `remove_prof_${prof.id}`}
                            title="Remover vínculo"
                          >
                            {actionLoading === `remove_prof_${prof.id}` ? <Loader2 className="spinner" size={14} /> : <Trash2 size={14} />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: '1 1 500px' }}>
              <div className="data-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} /> Solicitações Pendentes</h3>
                <NucleoSolicitacoes 
                  students={students}
                  actionLoading={actionLoading}
                  handleApproveStudent={handleApproveStudent}
                  handleRejectStudent={handleRejectStudent}
                />
              </div>

              <div className="data-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} /> Alunos da Turma</h3>
                {students.filter((s: any) => s.status_nucleo !== 'pendente').length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum aluno matriculado oficialmente ainda.</p> : (
                  <table className="admin-table">
                    <thead><tr><th>Nome do Aluno</th><th>Pagamento</th><th>Ações</th></tr></thead>
                    <tbody>
                      {students.filter((s: any) => s.status_nucleo !== 'pendente').map((aluno: any) => (
                        <StudentRow 
                          key={aluno.id}
                          aluno={aluno}
                          isAdmin={isAdmin}
                          actionLoading={actionLoading}
                          handleMarkPago={handleMarkPago}
                          openStudent={openStudent}
                        />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <NucleoReleaseManager 
              allCourses={allCourses}
              releasedItems={releasedItems}
              actionLoading={actionLoading}
              handleToggleRelease={handleToggleRelease}
              handleBulkRelease={handleBulkRelease}
            />
          </div>
        </div>
      )}

      {/* MODAL STUDENT EVALUATION */}
      {showStudentModal && (
        <StudentDetailsModal 
          student={showStudentModal}
          onClose={() => setShowStudentModal(null)}
          atividades={atividades}
          notas={notas}
          courseSubmissions={courseSubmissions}
          expandedSub={expandedSub}
          handleExpandSub={handleExpandSub}
          questionEvaluations={questionEvaluations}
          toggleEvaluation={toggleEvaluation}
          handleLancarNota={handleLancarNota}
          handleDeleteSubmission={handleDeleteSubmission}
          actionLoading={actionLoading}
          isProfessor={isProfessor}
          studentCourseLivros={studentCourseLivros}
          studentExceptions={studentExceptions}
          handleToggleException={handleToggleException}
        />
      )}

      {/* MODAL ADD NUCLEO */}
      {showAddModal && (
        <AddNucleoModal 
          onClose={() => {
            setShowAddModal(false);
            setEditingNucleo(null);
            setSchedules([{ day: '', start: '', end: '' }]);
          }}
          isAdmin={isAdmin}
          showCreateForm={showCreateForm}
          setShowCreateForm={setShowCreateForm}
          handleLinkProfessorToNucleo={handleLinkProfessorToNucleo}
          handleCreateNucleo={handleCreateNucleo}
          handleLinkNucleo={handleLinkNucleo}
          professors={professors}
          nucleos={nucleos}
          actionLoading={actionLoading}
          schedules={schedules}
          addSchedule={addSchedule}
          removeSchedule={removeSchedule}
          updateSchedule={updateSchedule}
          cepLoading={cepLoading}
          handleCepBlur={handleCepBlur}
          initialData={editingNucleo}
        />
      )}
      {/* MODAL EDIT QUESTIONNAIRE */}
      {editingQuestionnaire && (
        <div className="modal-overlay" onClick={() => setEditingQuestionnaire(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>Editor de Avaliação Extra</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{editingQuestionnaire.titulo}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ width: 'auto', border: '1px solid #38bdf8', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.05)', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                  onClick={() => {
                    const texto = window.prompt('Cole aqui o texto bruto (uma questão por linha, na ordem 10 V/F, 2 Diss, 2 MC, 1 Coluna):');
                    if (!texto) return;
                    
                    const lines = texto.split('\n').filter(l => l.trim());
                    const q: any[] = [];
                    let idx = 0;
                    for (let i=0; i<10; i++) q.push({ id: `tf-${Date.now()}-${i}`, type: 'true_false', text: lines[idx++] || '', isTrue: true });
                    for (let i=0; i<2; i++) q.push({ id: `dis-${Date.now()}-${i}`, type: 'discursive', text: lines[idx++] || '' });
                    for (let i=0; i<2; i++) {
                      const text = lines[idx++] || '';
                      q.push({ id: `mc-${Date.now()}-${i}`, type: 'multiple_choice', text, options: [lines[idx++]||'', lines[idx++]||'', lines[idx++]||'', lines[idx++]||''], correctOption: 0 });
                    }
                    const matPairs: any[] = [];
                    const matT = lines[idx++] || 'Relacione:';
                    for (let i=0; i<6; i++) matPairs.push({ left: lines[idx++] || `Item ${i+1}`, right: '...' });
                    q.push({ id: `mat-${Date.now()}`, type: 'matching', text: matT, matchingPairs: matPairs });

                    setEditingQuestionnaire({ ...editingQuestionnaire, questionario: q });
                  }}
                >
                  <Plus size={14} /> Importar Texto
                </button>
                <button className="btn-icon" onClick={() => setEditingQuestionnaire(null)}><Plus style={{ transform: 'rotate(45deg)' }} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ width: 'auto', alignSelf: 'flex-start', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'rgba(var(--primary-rgb), 0.05)', padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                onClick={() => {
                  const template: any[] = [];
                  for(let i=0; i<10; i++) template.push({ id: `tf-${Date.now()}-${i}`, type: 'true_false', text: '', isTrue: true });
                  for(let i=0; i<2; i++) template.push({ id: `dis-${Date.now()}-${i}`, type: 'discursive', text: '' });
                  for(let i=0; i<2; i++) template.push({ id: `mc-${Date.now()}-${i}`, type: 'multiple_choice', text: '', options: ['', '', '', ''], correct: 0 });
                  template.push({ 
                    id: `mat-${Date.now()}`, 
                    type: 'matching', 
                    text: 'Relacione as colunas abaixo:', 
                    matchingPairs: [
                      {left: '', right: ''}, {left: '', right: ''}, {left: '', right: ''},
                      {left: '', right: ''}, {left: '', right: ''}, {left: '', right: ''}
                    ] 
                  });
                  if (window.confirm('Isso substituirá o questionário pelo padrão Fatesa (15 itens). Deseja continuar?')) {
                    setEditingQuestionnaire({ ...editingQuestionnaire, questionario: template });
                  }
                }}
              >
                Carregar Padrão Fatesa (15 Itens)
              </button>

              {(editingQuestionnaire.questionario || []).map((q: any, qIdx: number) => (
                <div key={q.id || qIdx} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Questão {qIdx + 1}</span>
                    <button 
                      className="btn-icon" 
                      style={{ color: 'var(--error)' }} 
                      onClick={() => {
                        const newQ = [...(editingQuestionnaire.questionario || [])]
                        newQ.splice(qIdx, 1)
                        setEditingQuestionnaire({ ...editingQuestionnaire, questionario: newQ })
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="form-group">
                    <label>Enunciado da Questão</label>
                    <textarea 
                      className="form-control" 
                      rows={2} 
                      value={q.text} 
                      onChange={(e) => {
                        const newQ = [...(editingQuestionnaire.questionario || [])]
                        newQ[qIdx].text = e.target.value
                        setEditingQuestionnaire({ ...editingQuestionnaire, questionario: newQ })
                      }}
                    ></textarea>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <div className="form-group">
                      <label>Tipo de Resposta</label>
                      <select 
                        className="form-control"
                        value={q.type}
                        onChange={(e) => {
                          const newQ = [...(editingQuestionnaire.questionario || [])]
                          newQ[qIdx].type = e.target.value
                          if (e.target.value === 'multiple_choice' && !newQ[qIdx].options) {
                            newQ[qIdx].options = ['', '', '', '']
                            newQ[qIdx].correctOption = 0
                          }
                          setEditingQuestionnaire({ ...editingQuestionnaire, questionario: newQ })
                        }}
                      >
                        <option value="discursive">Dissertativa (Texto Livre)</option>
                        <option value="multiple_choice">Múltipla Escolha</option>
                        <option value="true_false">Verdadeiro ou Falso</option>
                      </select>
                    </div>

                    {q.type === 'multiple_choice' && (
                      <div className="form-group">
                        <label>Alternativa Correta</label>
                        <select 
                          className="form-control"
                          value={q.correctOption}
                          onChange={(e) => {
                            const newQ = [...(editingQuestionnaire.questionario || [])]
                            newQ[qIdx].correctOption = parseInt(e.target.value)
                            setEditingQuestionnaire({ ...editingQuestionnaire, questionario: newQ })
                          }}
                        >
                          {(q.options || []).map((_: any, oIdx: number) => (
                            <option key={oIdx} value={oIdx}>Alternativa {String.fromCharCode(65 + oIdx)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {q.type === 'multiple_choice' && (
                    <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {(q.options || []).map((opt: string, oIdx: number) => (
                        <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, opacity: 0.5 }}>{String.fromCharCode(65 + oIdx)})</span>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ padding: '0.4rem' }} 
                            value={opt} 
                            onChange={(e) => {
                              const newQ = [...(editingQuestionnaire.questionario || [])]
                              newQ[qIdx].options[oIdx] = e.target.value
                              setEditingQuestionnaire({ ...editingQuestionnaire, questionario: newQ })
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Explicação / Gabarito (Opcional)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Dica ou resposta esperada..." 
                      value={q.expectedAnswer || ''}
                      onChange={(e) => {
                        const newQ = [...(editingQuestionnaire.questionario || [])]
                        newQ[qIdx].expectedAnswer = e.target.value
                        setEditingQuestionnaire({ ...editingQuestionnaire, questionario: newQ })
                      }}
                    />
                  </div>
                </div>
              ))}

              <button 
                className="btn btn-outline" 
                style={{ borderStyle: 'dashed', background: 'transparent' }}
                onClick={() => {
                  const newQ = [...(editingQuestionnaire.questionario || []), { id: Date.now().toString(), text: '', type: 'discursive' }]
                  setEditingQuestionnaire({ ...editingQuestionnaire, questionario: newQ })
                }}
              >
                <Plus size={18} /> Adicionar Pergunta
              </button>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => setEditingQuestionnaire(null)}>Cancelar</button>
                <button 
                  className="btn btn-primary" 
                  style={{ width: 'auto', padding: '0.6rem 2rem' }}
                  onClick={() => handleSaveQuestionnaire(editingQuestionnaire.id, editingQuestionnaire.questionario)}
                  disabled={actionLoading === 'save_q'}
                >
                  {actionLoading === 'save_q' ? <Loader2 className="spinner" size={20} /> : 'Salvar Questionário'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NucleosPanel
