import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { Submission } from '../../../types/professor'

export const useProfessorGrading = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [gradeInput, setGradeInput] = useState<string>('')
  const [avaliacaoComentario, setAvaliacaoComentario] = useState<string>('')
  const [questionEvaluations, setQuestionEvaluations] = useState<Record<string, boolean>>({})
  const [questionComments, setQuestionComments] = useState<Record<string, string>>({})
  const [savingGrade, setSavingGrade] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const setSortedSubmissions = useCallback((data: Submission[]) => {
    const sorted = [...data].sort((a, b) => {
      const nameA = a.users?.nome || ''
      const nameB = b.users?.nome || ''
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' })
    })
    setSubmissions(sorted)
  }, [])

  const handleSelectSubmission = (sub: Submission) => {
    setSelectedSubmission(sub);
    setAvaliacaoComentario(sub.comentario_professor || '');
    
    const initialEvals: Record<string, boolean> = {};
    const questionnaire = sub.aulas?.questionario;
    
    if (Array.isArray(questionnaire) && questionnaire.length > 0) {
      questionnaire.forEach((q: any, qIdx: number) => {
        const qKey = q.id || qIdx;
        const studentAns = sub.respostas?.[qKey];
        const correctOpt = q.correctOption !== undefined ? q.correctOption : q.correct;

        if (q.type === 'multiple_choice' || !q.type) {
          const isCorrect = studentAns !== undefined && studentAns !== null && String(studentAns) === String(correctOpt);
          initialEvals[qKey] = isCorrect;
        } else if (q.type === 'true_false') {
          const isCorrect = studentAns === q.correctAnswer;
          initialEvals[qKey] = !!isCorrect;
        } else if (q.type === 'matching') {
          let allCorrect = true;
          if (!studentAns || Object.keys(studentAns).length === 0) {
            allCorrect = false;
          } else {
            const answerMap = studentAns as Record<string, string>;
            q.matchingPairs?.forEach((_: any, mIdx: number) => {
              if (String(answerMap[mIdx]) !== String(mIdx)) allCorrect = false;
            });
          }
          initialEvals[qKey] = allCorrect;
        }
      });
    }
    
    setQuestionEvaluations(initialEvals);

    const initialComments: Record<string, string> = {};
    if (sub.respostas) {
      Object.entries(sub.respostas).forEach(([key, val]) => {
        if (key.endsWith('_comentario') && typeof val === 'string') {
          initialComments[key.replace('_comentario', '')] = val;
        }
      });
    }
    setQuestionComments(initialComments);
    
    const validQuestions = (Array.isArray(questionnaire) ? questionnaire : []).filter((q: any) => q && q.text);
    const totalQuestions = validQuestions.length;
    
    if (totalQuestions > 0) {
      const correctCount = (Array.isArray(questionnaire) ? questionnaire : []).reduce((acc: number, q: any, qIdx: number) => {
        if (!q || !q.text) return acc;
        const qKey = q.id || qIdx;
        return acc + (initialEvals[qKey] === true ? 1 : 0);
      }, 0);
      const initialGrade = (correctCount / totalQuestions) * 10;
      setGradeInput(initialGrade.toFixed(1));
    } else {
      setGradeInput('10.0'); 
    }
  }

  const toggleEvaluation = (questionId: string, isCorrect: boolean) => {
    const newEvals = { ...questionEvaluations, [questionId]: isCorrect };
    setQuestionEvaluations(newEvals);
    
    const questionnaire = selectedSubmission?.aulas?.questionario;
    const validQuestions = (Array.isArray(questionnaire) ? questionnaire : []).filter((q: any) => q && q.text);
    const totalQuestions = validQuestions.length;
    
    if (totalQuestions > 0) {
      const correctCount = (Array.isArray(questionnaire) ? questionnaire : []).reduce((acc: number, q: any, qIdx: number) => {
        if (!q || !q.text) return acc;
        const qKey = q.id || qIdx;
        return acc + (newEvals[qKey] === true ? 1 : 0);
      }, 0);
      
      const calculatedGrade = (correctCount / totalQuestions) * 10;
      setGradeInput(calculatedGrade.toFixed(1));
    }
  }

  const handleDeleteSubmission = async (subId: string, onSuccess?: () => void) => {
    if (!confirm('Deseja realmente excluir esta atividade do aluno? Isso permitirá que ele refaça a atividade novamente do zero.')) return
    
    setDeleting(subId)
    try {
      const { error } = await supabase.from('respostas_aulas').delete().eq('id', subId)
      if (error) throw error
      alert('Atividade excluída com sucesso. O aluno já pode refazer.')
      if (onSuccess) onSuccess()
    } catch(err: any) {
      alert('Erro ao excluir: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleSaveGrade = async (onSuccess?: () => void) => {
    if(!selectedSubmission || gradeInput === '' || !avaliacaoComentario.trim()) {
      alert('A avaliação (comentário) e a nota são obrigatórias.')
      return
    }
    setSavingGrade(true)
    try {
      // Mesclar comentários de questão no objeto de respostas
      const updatedRespostas = { ...(selectedSubmission.respostas || {}) };
      Object.entries(questionComments).forEach(([qId, comment]) => {
        if (comment.trim()) updatedRespostas[`${qId}_comentario`] = comment;
        else delete updatedRespostas[`${qId}_comentario`];
      });

      const updateData: any = {
        nota: parseFloat(gradeInput),
        comentario_professor: avaliacaoComentario,
        respostas: updatedRespostas,
        status: 'corrigida'
      }

      if (!selectedSubmission.primeira_correcao_at) {
        updateData.primeira_correcao_at = new Date().toISOString()
      }

      const { error } = await supabase.from('respostas_aulas').update(updateData).eq('id', selectedSubmission.id)
      
      if(error) throw error
      
      const moduloNome = (selectedSubmission as any).aulas?.livros?.titulo || 'Módulo';
      alert(`Nota [${gradeInput}] do módulo [${moduloNome}] salva com sucesso!`)
      setSelectedSubmission(null)
      setGradeInput('')
      setAvaliacaoComentario('')
      setQuestionComments({})
      if (onSuccess) onSuccess()
    } catch(err) {
      console.error(err)
      alert('Erro ao salvar nota.')
    } finally {
      setSavingGrade(false)
    }
  }

  return {
    submissions,
    setSubmissions: setSortedSubmissions,
    selectedSubmission,
    setSelectedSubmission,
    gradeInput,
    setGradeInput,
    avaliacaoComentario,
    setAvaliacaoComentario,
    questionEvaluations,
    questionComments,
    setQuestionComments,
    toggleEvaluation,
    savingGrade,
    deleting,
    handleSelectSubmission,
    handleDeleteSubmission,
    handleSaveGrade
  }
}
