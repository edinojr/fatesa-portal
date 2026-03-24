import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Plus, Award, ChevronRight, BookOpen, Loader2, Save, Trash2, MapPin, Clock, ShieldCheck } from 'lucide-react'

interface NucleoPanelProps {
  userRole?: string
}

const NucleosPanel: React.FC<NucleoPanelProps> = ({ userRole = 'professor' }) => {
  const [nucleos, setNucleos] = useState<any[]>([]) // All available
  const [myNucleos, setMyNucleos] = useState<any[]>([]) // Tied to teacher
  const [selectedNucleo, setSelectedNucleo] = useState<any | null>(null)
  const [students, setStudents] = useState<any[]>([])
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [cepLoading, setCepLoading] = useState(false)

  const [atividades, setAtividades] = useState<any[]>([])
  const [notas, setNotas] = useState<any[]>([])
  const [courseSubmissions, setCourseSubmissions] = useState<any[]>([])
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [questionEvaluations, setQuestionEvaluations] = useState<Record<string, boolean>>({}) // true = correct, false = incorrect
  const [autoGrade, setAutoGrade] = useState<string | null>(null)

  const isAdmin = userRole === 'admin'
  const isProfessor = userRole === 'professor'

  useEffect(() => {
    fetchInitialData()
  }, [userRole])

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
            .select('status, comprovante_url, data_pagamento')
            .eq('user_id', student.id)
            .order('created_at', { ascending: false })
            .limit(1)
          return { ...student, pagamento: pays?.[0] || null }
        })
      )
      setStudents(studentsWithPayments)
    }

    // Fetch atividades for this nucleo
    const resAtv = await supabase.from('atividades').select('*').eq('nucleo_id', nuc.id).order('created_at', { ascending: false })
    if (resAtv.data) setAtividades(resAtv.data)
    
    setLoading(false)
  }

  const handleLinkNucleo = async (nucleoId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    // Check if already linked
    if (myNucleos.some(mn => mn.id === nucleoId)) {
      alert('Você já está vinculado a este núcleo e já pode acessá-lo na sua tela inicial!')
      setShowAddModal(false)
      return
    }

    setActionLoading('link_nuc')
    try {
      const { error } = await supabase.from('professor_nucleo').insert({
        professor_id: session.user.id,
        nucleo_id: nucleoId
      })
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

  const handleCreateNucleo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setActionLoading('create_nuc')
    const formData = new FormData(e.currentTarget)
    
    const nucleoData = {
      nome: formData.get('nome') as string,
      cep: formData.get('cep') as string,
      logradouro: formData.get('logradouro') as string,
      numero: formData.get('numero') as string,
      bairro: formData.get('bairro') as string,
      cidade: formData.get('cidade') as string,
      estado: formData.get('estado') as string,
      professor_responsavel: formData.get('professor_responsavel') as string,
      horario_aulas: formData.get('horario_aulas') as string,
    }
    
    try {
      const { data, error } = await supabase.from('nucleos').insert(nucleoData).select().single()
      if (error) throw error
      
      // Automatically link teacher to it (even if Admin creates it, link the creator)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Ignora erros caso o admin já tenha vínculo, usa upsert ou ignora falha via try/catch
        await supabase.from('professor_nucleo').upsert({ professor_id: session.user.id, nucleo_id: data.id })
      }
      
      alert('Núcleo criado com sucesso!')
      setShowAddModal(false)
      fetchInitialData()
    } catch(err: any) {
      alert('Erro ao criar núcleo: ' + err.message)
    } finally {
      setActionLoading(null)
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
      setAutoGrade(calculatedGrade.toFixed(1));
      
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
      setAutoGrade(initialGrade.toFixed(1));
      
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

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '')
    if (cep.length !== 8) return
    
    setCepLoading(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await response.json()
      if (!data.erro) {
        ;(document.getElementById('form_logradouro') as HTMLInputElement).value = data.logradouro || '';
        ;(document.getElementById('form_bairro') as HTMLInputElement).value = data.bairro || '';
        ;(document.getElementById('form_cidade') as HTMLInputElement).value = data.localidade || '';
        ;(document.getElementById('form_estado') as HTMLInputElement).value = data.uf || '';
        document.getElementById('form_numero')?.focus();
      } else {
        alert('CEP não encontrado!')
      }
    } catch (err) {
      console.error('ViaCEP Error:', err)
    } finally {
      setCepLoading(false)
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
        .select('*, aulas(id, titulo, questionario)')
        .eq('aluno_id', student.id)
        .order('created_at', { ascending: false })
      
      if (sData) setCourseSubmissions(sData)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAtividade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setActionLoading('create_atv')
    const formData = new FormData(e.currentTarget)
    const titulo = formData.get('titulo') as string
    const descricao = formData.get('descricao') as string
    
    try {
      const { error } = await supabase.from('atividades').insert({ 
        nucleo_id: selectedNucleo.id, 
        titulo, 
        descricao 
      })
      if (error) throw error
      alert('Atividade publicada na turma!')
      const resAtv = await supabase.from('atividades').select('*').eq('nucleo_id', selectedNucleo.id).order('created_at', { ascending: false })
      if (resAtv.data) setAtividades(resAtv.data)
      ;(e.target as HTMLFormElement).reset()
    } catch(err: any) {
      alert('Erro: ' + err.message)
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
      ;(e.target as HTMLFormElement).reset()
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
          data_pagamento: new Date().toISOString(),
          descricao: 'Pago manualmente pelo administrador',
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

      {!selectedNucleo ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {displayNucleos.length === 0 && <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>Nenhum núcleo encontrado.</p>}
          
          {displayNucleos.map(nuc => (
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
                      title={nuc.isento ? 'Clique para remover isenção' : 'Clique para isentar este núcleo'}
                    >
                      {actionLoading === `isento_nuc_${nuc.id}` ? <Loader2 className="spinner" size={14} /> : <ShieldCheck size={14} />}
                      {nuc.isento ? ' Isento' : ' Isentar'}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="btn btn-outline"
                      style={{ width: 'auto', padding: '0.4rem', border: 'none', color: 'var(--error)' }}
                      onClick={(e) => handleDeleteNucleo(nuc.id, e)}
                      disabled={actionLoading === `delete_nuc_${nuc.id}`}
                    >
                      {actionLoading === `delete_nuc_${nuc.id}` ? <Loader2 className="spinner" size={16} /> : <Trash2 size={16} />}
                    </button>
                  )}
                </div>
              </div>
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
              <div className="data-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--glass)', border: '1px solid var(--primary)' }}>
                <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{selectedNucleo.nome}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {selectedNucleo.professor_responsavel && <div><strong>Professor Responsável:</strong> <br/>{selectedNucleo.professor_responsavel}</div>}
                  {selectedNucleo.horario_aulas && <div><strong>Horário de Aulas:</strong> <br/>{selectedNucleo.horario_aulas}</div>}
                  {selectedNucleo.logradouro && <div><strong>Endereço:</strong> <br/>{selectedNucleo.logradouro}, {selectedNucleo.numero} - {selectedNucleo.bairro}<br/>{selectedNucleo.cidade} / {selectedNucleo.estado} - {selectedNucleo.cep}</div>}
                </div>
              </div>
            </div>

            <div style={{ flex: '1 1 500px' }}>
              <div className="data-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} /> Solicitações Pendentes</h3>
                {students.filter(s => s.status_nucleo === 'pendente').length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma nova solicitação de vínculo aguardando aprovação.</p>
                ) : (
                   <table className="admin-table">
                     <thead><tr><th>Aluno</th><th>Ações</th></tr></thead>
                     <tbody>
                       {students.filter(s => s.status_nucleo === 'pendente').map(aluno => (
                         <tr key={aluno.id}>
                           <td>{aluno.nome} <div style={{ fontSize:'0.8rem', color: 'var(--text-muted)' }}>{aluno.email}</div></td>
                           <td>
                             <div style={{ display: 'flex', gap: '0.5rem' }}>
                               <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', width: 'auto', fontSize: '0.8rem' }} onClick={() => handleApproveStudent(aluno.id)} disabled={actionLoading === `approve_${aluno.id}`}>
                                  {actionLoading === `approve_${aluno.id}` ? <Loader2 className="spinner" size={14} /> : 'Aprovar'}
                               </button>
                               <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', width: 'auto', fontSize: '0.8rem', color: 'var(--error)' }} onClick={() => handleRejectStudent(aluno.id)} disabled={actionLoading === `reject_${aluno.id}`}>
                                  {actionLoading === `reject_${aluno.id}` ? <Loader2 className="spinner" size={14} /> : 'Recusar'}
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                )}
              </div>

              <div className="data-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} /> Alunos da Turma</h3>
                {students.filter(s => s.status_nucleo !== 'pendente').length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum aluno matriculado oficialmente ainda.</p> : (
                  <table className="admin-table">
                    <thead><tr><th>Nome do Aluno</th><th>Pagamento</th><th>Ações</th></tr></thead>
                    <tbody>
                      {students.filter(s => s.status_nucleo !== 'pendente').map(aluno => (
                        <tr key={aluno.id}>
                          <td>
                            {aluno.nome}
                            <div style={{ fontSize:'0.8rem', color: 'var(--text-muted)' }}>{aluno.email}</div>
                          </td>
                          <td>
                            {aluno.pagamento?.status === 'pago' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', borderRadius: '20px', background: 'rgba(34,197,94,0.15)', color: 'var(--success)', fontSize: '0.78rem', fontWeight: 700 }}>
                                  <span>✔</span> Pago
                                </span>
                                {aluno.pagamento?.comprovante_url && (
                                  <a href={aluno.pagamento.comprovante_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'underline' }}>Ver comprovante</a>
                                )}
                              </div>
                            ) : aluno.pagamento?.comprovante_url ? (
                              <a
                                href={aluno.pagamento.comprovante_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', borderRadius: '20px', background: 'rgba(34,197,94,0.15)', color: 'var(--success)', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}
                              >
                                <span>✔</span> Ver Comprovante
                              </a>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', borderRadius: '20px', background: 'rgba(255,77,77,0.12)', color: 'var(--error)', fontSize: '0.78rem', fontWeight: 700 }}>
                                <span>⚠</span> Sem comprovante
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {isAdmin && aluno.pagamento?.status !== 'pago' && (
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.78rem' }}
                                  onClick={(e) => handleMarkPago(aluno, e)}
                                  disabled={actionLoading === `pago_${aluno.id}`}
                                >
                                  {actionLoading === `pago_${aluno.id}` ? <Loader2 className="spinner" size={14} /> : '✔ Pago'}
                                </button>
                              )}
                              <button className="btn btn-outline" style={{ padding: '0.4rem 1rem', width: 'auto' }} onClick={() => openStudent(aluno)}>
                                Ver Boletim <Award size={16} style={{ marginLeft: '0.5rem' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div style={{ flex: '1 1 350px' }}>
              <div className="data-card">
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={20} /> Atividades da Turma</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {atividades.map(atv => (
                    <div key={atv.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                      <h4 style={{ fontSize: '0.95rem' }}>{atv.titulo}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{atv.descricao}</p>
                    </div>
                  ))}
                  {atividades.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhuma atividade registrada.</p>}
                </div>

                {isProfessor && (
                  <>
                    <hr style={{ borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', margin: '1.5rem 0' }} />
                    <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Publicar Nova Atividade</h4>
                    <form onSubmit={handleCreateAtividade} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input type="text" name="titulo" placeholder="Ex: Fichamento Livro 1" className="form-control" required />
                      <textarea name="descricao" placeholder="Instruções da atividade..." className="form-control" rows={3}></textarea>
                      <button type="submit" className="btn btn-primary" disabled={actionLoading === 'create_atv'}>
                        {actionLoading === 'create_atv' ? <Loader2 className="spinner" /> : 'Publicar na Turma'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL STUDENT EVALUATION */}
      {showStudentModal && (
        <div className="modal-overlay" onClick={() => setShowStudentModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.4rem' }}>{showStudentModal.nome}</h2>
              <span className="admin-badge">Boletim Escolar</span>
            </div>
            
            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={18} /> Fichário (Portal do Aluno)</h4>
              {courseSubmissions.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sem atividades do portal enviadas ainda.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {courseSubmissions.map(sub => (
                    <div key={sub.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', borderLeft: `4px solid ${sub.status === 'pendente' ? 'var(--primary)' : 'var(--success)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{sub.aulas?.titulo}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Data do envio: {new Date(sub.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`admin-badge status-${sub.status}`} style={{ display: 'block', marginBottom: '0.5rem' }}>
                            {sub.status === 'pendente' ? 'Pendente' : 'Corrigida'}
                          </span>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', width: 'auto' }}
                              onClick={() => handleExpandSub(sub)}
                            >
                              {expandedSub === sub.id ? 'Fechar' : 'Ver'}
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', width: 'auto', border: 'none', color: 'var(--error)' }}
                              onClick={() => handleDeleteSubmission(sub.id)}
                              disabled={actionLoading === `delete_sub_${sub.id}`}
                            >
                              {actionLoading === `delete_sub_${sub.id}` ? <Loader2 className="spinner" size={14} /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {expandedSub === sub.id && (
                        <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <h5 style={{ marginBottom: '1.5rem', fontSize: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Award size={18} /> Atividade Completa do Aluno
                          </h5>
                          {Array.isArray(sub.aulas?.questionario) && sub.aulas.questionario.map((q: any, idx: number) => (
                            <div key={q.id} style={{ 
                              marginBottom: '1rem', 
                              padding: '1rem', 
                              background: 'rgba(255,255,255,0.02)', 
                              borderRadius: '12px',
                              borderLeft: '4px solid rgba(255,255,255,0.1)' 
                            }}>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.9)' }}>
                                <span style={{ opacity: 0.5, marginRight: '0.5rem' }}>Questão {idx + 1}:</span> {q.text}
                              </div>
                              
                              <div style={{ 
                                padding: '1rem', 
                                background: 'rgba(34, 197, 94, 0.05)', 
                                borderRadius: '10px',
                                border: '1px solid rgba(34, 197, 94, 0.1)',
                                position: 'relative'
                              }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                                  Resposta do Aluno:
                                </div>
                                <div style={{ fontSize: '1rem', lineHeight: '1.6', color: '#fff', whiteSpace: 'pre-wrap' }}>
                                  {q.type === 'discursive' ? (
                                    sub.respostas[q.id] || '(O aluno não respondeu)'
                                  ) : q.type === 'multiple_choice' ? (
                                    q.options?.[sub.respostas[q.id]] || sub.respostas[q.id]
                                  ) : q.type === 'true_false' ? (
                                    sub.respostas[q.id] ? 'Verdadeiro' : 'Falso'
                                  ) : q.type === 'matching' ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
                                      {q.matchingPairs?.map((pair: any, pIdx: number) => {
                                        const studentAns = sub.respostas[q.id]?.[pIdx];
                                        const studentMatched = q.matchingPairs?.[studentAns]?.right || '---';
                                        return (
                                          <React.Fragment key={pIdx}>
                                            <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'right' }}>{pair.left}</div>
                                            <div style={{ opacity: 0.3, fontSize: '0.7rem' }}>→</div>
                                            <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>{studentMatched}</div>
                                          </React.Fragment>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    JSON.stringify(sub.respostas[q.id])
                                  )}
                                </div>
                              </div>

                              {q.type === 'discursive' && (
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                  <button 
                                    className="btn" 
                                    style={{ 
                                      width: 'auto', 
                                      padding: '0.4rem 1rem', 
                                      fontSize: '0.75rem', 
                                      background: questionEvaluations[q.id] === true ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                                      color: '#fff',
                                      border: 'none',
                                      opacity: questionEvaluations[q.id] === true ? 1 : 0.6
                                    }}
                                    onClick={() => toggleEvaluation(sub, q.id, true)}
                                  >
                                    {questionEvaluations[q.id] === true ? '✓ Correta' : 'Certa'}
                                  </button>
                                  <button 
                                    className="btn" 
                                    style={{ 
                                      width: 'auto', 
                                      padding: '0.4rem 1rem', 
                                      fontSize: '0.75rem', 
                                      background: questionEvaluations[q.id] === false ? 'var(--error)' : 'rgba(255,255,255,0.05)',
                                      color: '#fff',
                                      border: 'none',
                                      opacity: questionEvaluations[q.id] === false ? 1 : 0.6
                                    }}
                                    onClick={() => toggleEvaluation(sub, q.id, false)}
                                  >
                                    {questionEvaluations[q.id] === false ? '✗ Incorreta' : 'Errada'}
                                  </button>
                                </div>
                              )}

                              {q.expectedAnswer && (
                                <div style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', fontSize: '0.8rem', opacity: 0.6, background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                                  <strong>Gabarito Sugerido:</strong> {q.expectedAnswer}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem', color: '#03A9F4' }}>Notas Manuais do Pólo</h4>
              {notas.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sem notas de atividades do pólo lançadas.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {notas.map(n => (
                    <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                      <div>
                        <strong>{n.atividades?.titulo}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{n.feedback}</div>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: n.nota >= 7 ? 'var(--success)' : 'var(--error)' }}>
                        {n.nota.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isProfessor ? (
              <>
                <h4 style={{ marginBottom: '1rem' }}>Lançar/Atualizar Nota</h4>
                <form onSubmit={handleLancarNota}>
                  <div className="form-group">
                    <label>Selecione a Atividade</label>
                    <select name="atividade_id" className="form-control" required>
                      <option value="">-- Escolha --</option>
                      <optgroup label="Atividades do Pólo (Manuais)">
                        {atividades.map(a => <option key={a.id} value={a.id}>{a.titulo}</option>)}
                      </optgroup>
                      <optgroup label="Fichário (Portal do Aluno)">
                        {courseSubmissions.map(s => (
                          <option key={s.id} value={`course:${s.aulas?.id}`}>
                            {s.aulas?.titulo} (Enviado em {new Date(s.created_at).toLocaleDateString()})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Nota (0 a 10)</label>
                      <input type="number" name="nota" max="10" min="0" step="0.1" className="form-control" required />
                    </div>
                    <div className="form-group" style={{ flex: 2 }}>
                      <label>Feedback Adicional (Opcional)</label>
                      <input type="text" name="feedback" className="form-control" placeholder="Muito bom!" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setShowStudentModal(null)}>Fechar</button>
                    <button type="submit" className="btn btn-primary" disabled={actionLoading === 'lancar_nota' || atividades.length === 0}>
                      <Save size={18} /> Salvar Avaliação
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowStudentModal(null)}>Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL ADD NUCLEO */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1rem' }}>Gerenciar Núcleos</h2>
            
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Vincule-se a um núcleo existente</h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select id="nuc_select" className="form-control" style={{ flex: 1 }}>
                  {nucleos.length === 0 && <option value="">Nenhum núcleo encontrado...</option>}
                  {nucleos.map(n => (
                    <option key={n.id} value={n.id}>{n.nome} {n.cidade ? `(${n.cidade})` : ''}</option>
                  ))}
                </select>
                <button 
                  className="btn btn-primary" 
                  style={{ width: 'auto' }}
                  disabled={actionLoading === 'link_nuc'}
                  onClick={() => {
                    const sel = document.getElementById('nuc_select') as HTMLSelectElement
                    if(sel.value) handleLinkNucleo(sel.value)
                  }}
                >
                  {actionLoading === 'link_nuc' ? <Loader2 className="spinner" size={18} /> : 'Vincular a Mim'}
                </button>
              </div>
            </div>

            <hr style={{ borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', margin: '2rem 0' }} />

            <h4 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Ou crie um NOVO Núcleo/Pólo do zero</h4>
            <form onSubmit={handleCreateNucleo} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Nome do Núcleo *</label>
                <input type="text" name="nome" placeholder="Ex: Pólo Presencial - Vila Luzita" className="form-control" required />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Professor Responsável</label>
                  <input type="text" name="professor_responsavel" placeholder="Ex: Pr. João" className="form-control" />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Horário das Aulas</label>
                  <input type="text" name="horario_aulas" placeholder="Ex: 19:30h às 22:00h (Terça)" className="form-control" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>CEP (Digite para buscar) *</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      name="cep" 
                      placeholder="00000-000" 
                      className="form-control" 
                      maxLength={9}
                      onBlur={handleCepBlur}
                      required 
                    />
                    {cepLoading && <Loader2 className="spinner" size={20} color="var(--primary)" />}
                  </div>
                </div>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label>Logradouro / Endereço</label>
                  <input type="text" name="logradouro" id="form_logradouro" placeholder="Avenida / Rua..." className="form-control" required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Número *</label>
                  <input type="text" name="numero" id="form_numero" placeholder="Ex: 123" className="form-control" required />
                </div>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label>Bairro</label>
                  <input type="text" name="bairro" id="form_bairro" placeholder="Nome do Bairro" className="form-control" required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label>Cidade</label>
                  <input type="text" name="cidade" id="form_cidade" className="form-control" required />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>UF</label>
                  <input type="text" name="estado" id="form_estado" className="form-control" maxLength={2} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading === 'create_nuc'}>
                  {actionLoading === 'create_nuc' ? <Loader2 className="spinner" size={20} /> : 'Criar e Vincular Polo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default NucleosPanel
