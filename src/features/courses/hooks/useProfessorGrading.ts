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
      const dateA = new Date(a.submitted_at || 0).getTime();
      const dateB = new Date(b.submitted_at || 0).getTime();
      return dateB - dateA;
    });
    setSubmissions(sorted);
  }, []);

    const fetchSubmissions = useCallback(async () => {
      try {
        // Step 1: Fetch submissions first
        const { data: subDataRaw } = await supabase
          .from('respostas_aulas')
          .select('id, aula_id, aluno_id, nota, status, tentativas, created_at, updated_at, comentario_professor, primeira_correcao_at, respostas')
          .order('created_at', { ascending: false });

        if (!subDataRaw) return;

        // Step 2: Extract IDs for joining
        const aulaIds = Array.from(new Set(subDataRaw.map(r => r.aula_id).filter(Boolean)));
        const alunoIds = Array.from(new Set(subDataRaw.map(r => r.aluno_id).filter(Boolean)));

        const [aulasRes, usersRes] = await Promise.all([
          aulaIds.length > 0 
            ? supabase.from('aulas').select('id, titulo, tipo, questionario, livro_id(id, titulo)').in('id', aulaIds)
            : Promise.resolve({ data: [] }),
          alunoIds.length > 0 
            ? supabase.from('users').select('id, nome, email, nucleo_id, nucleos(id, nome)').in('id', alunoIds)
            : Promise.resolve({ data: [] })
        ]);

        const aulasMap = (aulasRes.data || []).reduce((acc, a) => { acc[a.id] = a; return acc; }, {});
        const usersMap = (usersRes.data || []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {});

        const mapped = subDataRaw.map((r: any) => {
          const aula = aulasMap[r.aula_id];
          const user = usersMap[r.aluno_id];
          return {
            ...r,
            submission_id: r.id,
            student_id: r.aluno_id,
            lesson_id: r.aula_id,
            lesson_title: aula?.titulo,
            lesson_type: aula?.tipo,
            student_name: user?.nome,
            student_email: user?.email,
            nucleus_id: user?.nucleos?.id,
            nucleus_name: user?.nucleos?.nome || 'Sem Polo',
            submitted_at: r.created_at,
          };
        }).filter((s: any) => s.lesson_type === 'prova');

        if (mapped) setSortedSubmissions(mapped);
      } catch (err) {
        console.error('Error fetching submissions:', err);
      }
    }, [setSortedSubmissions]);

  const handleSelectSubmission = useCallback((sub: Submission) => {
    setSelectedSubmission(sub);
    setAvaliacaoComentario(sub.comentario_professor || '');
    
    const initialEvals: Record<string, boolean> = {};
    const questionnaire = sub.questionario || sub.aulas?.questionario;
    
    if (Array.isArray(questionnaire) && questionnaire.length > 0) {
      questionnaire.forEach((q: any, qIdx: number) => {
        const qKey = q.id || qIdx;
        const savedEval = sub.respostas?.[`${qKey}_avaliacao`];
        if (savedEval !== undefined) {
          initialEvals[qKey] = savedEval === true;
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
    
    if (validQuestions.length > 0) {
      const scoreSum = validQuestions.reduce((acc: number, q: any, qIdx: number) => {
        const qKey = q.id || qIdx;
        
        // Se houver avaliação manual (toggle), usamos o peso total da questão
        if (questionEvaluations[qKey] !== undefined) {
          const weight = q.type === 'matching' ? 3.0 : 0.5;
          return acc + (questionEvaluations[qKey] === true ? weight : 0);
        }

        const studentAns = sub.respostas?.[qKey];
        if (q.type === 'multiple_choice' || !q.type) {
          return acc + (String(studentAns) === String(q.correct) ? 0.5 : 0);
        } else if (q.type === 'true_false') {
          return acc + (studentAns === q.isTrue ? 0.5 : 0);
        } else if (q.type === 'matching' && q.matchingPairs) {
          const answerMap = (studentAns || {}) as Record<string, string>;
          const correctPairs = q.matchingPairs.filter((_: any, mIdx: number) => String(answerMap[mIdx]) === String(mIdx)).length;
          return acc + Math.min(3.0, correctPairs * 0.5);
        }
        
        return acc;
      }, 0);
      setGradeInput(Math.min(10, scoreSum).toFixed(1));
    } else {
      setGradeInput('10.0'); 
    }
  }, []);

  const toggleEvaluation = useCallback((questionId: string, isCorrect: boolean) => {
    setQuestionEvaluations(prev => {
      const newEvals = { ...prev, [questionId]: isCorrect };
      
      const questionnaire = selectedSubmission?.questionario || selectedSubmission?.aulas?.questionario;
      const validQuestions = (Array.isArray(questionnaire) ? questionnaire : []).filter((q: any) => q && q.text);
      
      if (validQuestions.length > 0) {
        const scoreSum = validQuestions.reduce((acc: number, q: any, qIdx: number) => {
          const qKey = q.id || qIdx;
          
          if (q.type === 'matching' && q.matchingPairs) {
            // Soma os pares individuais avaliados ou autocorrigidos
            const studentAns = selectedSubmission?.respostas?.[qKey] || {};
            return acc + q.matchingPairs.reduce((pAcc: number, _: any, mIdx: number) => {
              const pairKey = `${qKey}_${mIdx}`;
              if (newEvals[pairKey] !== undefined) {
                return pAcc + (newEvals[pairKey] === true ? 0.5 : 0);
              }
              // Se não avaliado manualmente, usa autocorreção
              return pAcc + (String(studentAns[mIdx]) === String(mIdx) ? 0.5 : 0);
            }, 0);
          }

          if (newEvals[qKey] !== undefined) {
            return acc + (newEvals[qKey] === true ? 0.5 : 0);
          }

          const studentAns = selectedSubmission?.respostas?.[qKey];
          if (q.type === 'multiple_choice' || !q.type) {
            return acc + (String(studentAns) === String(q.correct) ? 0.5 : 0);
          } else if (q.type === 'true_false') {
            return acc + (studentAns === q.isTrue ? 0.5 : 0);
          }
          return acc;
        }, 0);
        
        setGradeInput(Math.min(10, scoreSum).toFixed(1));
      }
      return newEvals;
    });
  }, [selectedSubmission]);

  const handleDeleteSubmission = useCallback(async (subId: string, onSuccess?: () => void) => {
    if (!confirm('Deseja realmente excluir esta atividade do aluno? Isso permitirá que ele refaça a atividade novamente do zero.')) return
    
    setDeleting(subId)
    const subIdToDelete = subId || (submissions.find(s => (s as any).submission_id === subId) as any)?.submission_id;
    try {
      const { error } = await supabase.from('respostas_aulas').delete().eq('id', subIdToDelete)
      if (error) throw error
      alert('Atividade excluída com sucesso. O aluno já pode refazer.')
      if (onSuccess) onSuccess()
    } catch(err: any) {
      alert('Erro ao excluir: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }, [submissions]);

  const handleSaveGrade = useCallback(async (onSuccess?: () => void) => {
    if(!selectedSubmission || gradeInput === '' || !avaliacaoComentario.trim()) {
      alert('A avaliação (comentário) e a nota são obrigatórias.')
      return
    }
    setSavingGrade(true)
    try {
      const updatedRespostas = { ...(selectedSubmission.respostas || {}) };
      Object.entries(questionComments).forEach(([qId, comment]) => {
        if (comment.trim()) updatedRespostas[`${qId}_comentario`] = comment;
        else delete updatedRespostas[`${qId}_comentario`];
      });

      Object.entries(questionEvaluations).forEach(([qId, isCorrect]) => {
        updatedRespostas[`${qId}_avaliacao`] = isCorrect;
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

      const targetId = (selectedSubmission as any).submission_id || selectedSubmission.id;
      const { error } = await supabase.from('respostas_aulas').update(updateData).eq('id', targetId)
      
      if(error) throw error

      // AUTO-CRIAÇÃO DE RECUPERAÇÃO: Se o aluno reprovou, criar a próxima versão (V2 ou V3)
      const nota = parseFloat(gradeInput);
      const minGrade = (selectedSubmission as any).aulas?.min_grade || (selectedSubmission as any).min_grade || 7;
      const versaoAtual = (selectedSubmission as any).aulas?.versao || (selectedSubmission as any).versao || 1;
      const livroId = (selectedSubmission as any).aulas?.livro_id || (selectedSubmission as any).livro_id;
      const aulaId = (selectedSubmission as any).lesson_id || (selectedSubmission as any).aula_id;

      if (nota < minGrade && versaoAtual < 3 && livroId) {
        // Buscar a prova atual para usar como template
        const { data: currentExam } = await supabase.from('aulas').select('*').eq('id', aulaId).single();
        if (currentExam) {
          const nextVersion = versaoAtual + 1;
          const nextTitle = nextVersion === 2 
            ? `${currentExam.titulo.replace(/ - Recuperação.*$/, '')} - Recuperação`
            : `${currentExam.titulo.replace(/ - Recuperação.*$/, '')} - Recuperação 2`;
          
          // Verificar se a versão já existe
          const { data: existing } = await supabase.from('aulas')
            .select('id')
            .eq('livro_id', livroId)
            .eq('versao', nextVersion)
            .ilike('titulo', `%${currentExam.titulo.replace(/ - Recuperação.*$/, '')}%`)
            .eq('tipo', 'prova')
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabase.from('aulas').insert({
              livro_id: livroId,
              parent_aula_id: currentExam.parent_aula_id,
              titulo: nextTitle,
              tipo: 'prova',
              min_grade: minGrade,
              ordem: (currentExam.ordem || 0) + versaoAtual,
              versao: nextVersion,
              is_bloco_final: false,
              questionario: currentExam.questionario || []
            });
          }
        }
      }
      
      // Provas não criam progresso.concluida, apenas atividades regulares.
      // O progresso de provas é medido indiretamente pelas notas.

      const moduloNome = (selectedSubmission as any).lesson_title || (selectedSubmission as any).aulas?.livros?.titulo || 'Módulo';
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
  }, [selectedSubmission, gradeInput, avaliacaoComentario, questionComments, questionEvaluations]);


  return {
    submissions,
    setSubmissions: setSortedSubmissions,
    fetchSubmissions,
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

