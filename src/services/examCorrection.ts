import { supabase } from '../lib/supabase';

// ============================================================
// Correção de avaliações — lógica compartilhada entre:
// - Lesson.tsx (auto-correção no envio do aluno)
// - useProfessorGrading (correção manual)
// - QuizEditorModal / Salvar Gabarito (recorreção retroativa)
// Pesos oficiais: 0,5 por questão objetiva; matching 0,5 por par (máx 3,0)
// Nota normalizada: (pontos ganhos / pontos totais) × 10 — provas fora do
// padrão 10-4-1 ficam proporcionais; no padrão Fatesa o total é exatamente 10.
// ============================================================

export const computeScore = (questions: any[], answers: Record<string, any> | null | undefined): number => {
  if (!Array.isArray(questions)) return 0;
  let earned = 0;
  let total = 0;
  questions.forEach((q, idx) => {
    const qKey = q.id || idx;
    const ans = answers?.[qKey];

    // Avaliação manual do professor (toggle Certa/Errada) tem prioridade
    const manualEval = answers?.[`${qKey}_avaliacao`];

    if (q.type === 'matching' && q.matchingPairs?.length) {
      const uA = ans || {};
      const pairScore = q.matchingPairs.reduce((acc: number, _: any, mIdx: number) => {
        const pairManual = answers?.[`${qKey}_${mIdx}_avaliacao`];
        if (pairManual !== undefined) return acc + (pairManual === true ? 0.5 : 0);
        return acc + (String(uA[mIdx]) === String(mIdx) ? 0.5 : 0);
      }, 0);
      earned += Math.min(3.0, pairScore);
      total += Math.min(3.0, q.matchingPairs.length * 0.5);
      return;
    }

    total += 0.5;

    if (manualEval !== undefined) {
      earned += manualEval === true ? 0.5 : 0;
      return;
    }

    if (q.type === 'multiple_choice' || !q.type) {
      if (ans !== undefined && ans !== null && String(ans) === String(q.correct)) earned += 0.5;
    } else if (q.type === 'true_false' && ans === q.isTrue) {
      earned += 0.5;
    }
  });
  if (total <= 0) return 0;
  const nota = (earned / total) * 10;
  return Math.round(nota * 10) / 10;
};

export const hasCompleteGabarito = (questions: any[]): boolean => {
  if (!Array.isArray(questions) || questions.length === 0) return false;
  return questions.every(q => {
    if (q.type === 'multiple_choice' || !q.type) return typeof q.correct === 'number';
    if (q.type === 'true_false') return typeof q.isTrue === 'boolean';
    if (q.type === 'matching') return (q.matchingPairs || []).length > 0;
    return true; // dissertativa: sempre "ok" (correção manual)
  });
};

/** Marca o módulo como finalizado para o aluno (aprovação). */
export const finalizeModuleOnApproval = async (alunoId: string, livroId: string) => {
  if (!alunoId || !livroId) return;
  const { data: userData } = await supabase
    .from('users')
    .select('modulos_finalizados_manual')
    .eq('id', alunoId)
    .maybeSingle();
  const currentManual = userData?.modulos_finalizados_manual || [];
  if (!currentManual.includes(livroId)) {
    await supabase
      .from('users')
      .update({ modulos_finalizados_manual: [...currentManual, livroId] })
      .eq('id', alunoId);
  }
};

/** Remove a finalização manual do módulo (ex.: nota corrigida para baixo). */
export const unfinalizeModule = async (alunoId: string, livroId: string) => {
  if (!alunoId || !livroId) return;
  const { data: userData } = await supabase
    .from('users')
    .select('modulos_finalizados_manual')
    .eq('id', alunoId)
    .maybeSingle();
  const currentManual = userData?.modulos_finalizados_manual || [];
  if (currentManual.includes(livroId)) {
    await supabase
      .from('users')
      .update({ modulos_finalizados_manual: currentManual.filter((id: string) => id !== livroId) })
      .eq('id', alunoId);
  }
};

/** Cria a próxima versão da prova (V2/V3 — Recuperação) se o aluno reprovou. */
export const ensureRecoveryExam = async (aula: any, nota: number, minGrade: number) => {
  const versaoAtual = aula?.versao || 1;
  const livroId = aula?.livro_id;
  if (nota >= minGrade || versaoAtual >= 3 || !livroId || !aula?.id) return;

  const nextVersion = versaoAtual + 1;
  const baseTitle = (aula.titulo || '').replace(/ - Recuperação.*$/, '');
  const nextTitle = nextVersion === 2 ? `${baseTitle} - Recuperação` : `${baseTitle} - Recuperação 2`;

  const { data: existing } = await supabase
    .from('aulas')
    .select('id')
    .eq('livro_id', livroId)
    .eq('versao', nextVersion)
    .ilike('titulo', `%${baseTitle}%`)
    .limit(1);

  if (!existing || existing.length === 0) {
    await supabase.from('aulas').insert({
      livro_id: livroId,
      parent_aula_id: aula.parent_aula_id,
      titulo: nextTitle,
      tipo: aula.tipo || 'prova',
      min_grade: minGrade,
      ordem: (aula.ordem || 0) + versaoAtual,
      versao: nextVersion,
      is_bloco_final: false,
      questionario: aula.questionario || []
    });
  }
};

/**
 * Recorreção retroativa: recalcula a nota de TODAS as submissões existentes
 * de uma avaliação a partir do gabarito atual (questionario da aula).
 * Também ajusta a finalização do módulo e cria recuperação quando aplicável.
 * Retorna o número de submissões com nota alterada, ou -1 se não há gabarito completo.
 */
export const regradeSubmissionsForAula = async (aulaId: string): Promise<number> => {
  const { data: aula } = await supabase
    .from('aulas')
    .select('id, questionario, min_grade, tipo, versao, livro_id, titulo, ordem, parent_aula_id')
    .eq('id', aulaId)
    .single();
  if (!aula || !hasCompleteGabarito(aula.questionario || [])) return -1;

  const minGrade = aula.min_grade || 7;
  const { data: subs } = await supabase
    .from('respostas_aulas')
    .select('id, respostas, nota, status, aluno_id')
    .eq('aula_id', aulaId);

  let changed = 0;
  for (const sub of (subs || []) as any[]) {
    if (!sub.respostas || Object.keys(sub.respostas).length === 0) continue;
    const newScore = computeScore(aula.questionario, sub.respostas);
    if (newScore !== sub.nota) {
      const { error } = await supabase
        .from('respostas_aulas')
        .update({ nota: newScore, status: 'corrigida', updated_at: new Date().toISOString() })
        .eq('id', sub.id);
      if (!error) changed++;
    }
    // Ajusta a finalização do módulo conforme a nova nota
    if (aula.livro_id && sub.aluno_id) {
      if (newScore >= minGrade) {
        await finalizeModuleOnApproval(sub.aluno_id, aula.livro_id);
      } else {
        await unfinalizeModule(sub.aluno_id, aula.livro_id);
        await ensureRecoveryExam(aula, newScore, minGrade);
      }
    }
  }
  return changed;
};

/** Normaliza texto de enunciado para detectar questões repetidas. */
export const normalizeQuestionText = (s: string): string =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Retorna índices de questões duplicadas (mesmo enunciado normalizado), agrupadas. */
export const findDuplicateQuestions = (questions: any[]): number[] => {
  const seen = new Map<string, number>();
  const dupIdxs: number[] = [];
  questions.forEach((q, idx) => {
    const key = normalizeQuestionText(q?.text);
    if (!key) return;
    if (seen.has(key)) dupIdxs.push(idx);
    else seen.set(key, idx);
  });
  return dupIdxs;
};
