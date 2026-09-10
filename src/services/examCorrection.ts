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

/**
 * Verifica se um par específico de questão "relacione as colunas" está correto.
 *
 * Em vez de comparar POSIÇÃO (índice do gabarito === índice respondido),
 * compara o TEXTO da coluna direita escolhida com o gabarito. Isso aceita
 * respostas corretas mesmo quando o aluno inverte as posições das associações
 * (ex.: questões duplicadas com pares em outra ordem, ou duas linhas com a
 * mesma resposta correta), sem jamais aceitar correlações realmente erradas.
 */
export const matchingPairCorrect = (q: any, mIdx: number, ans: Record<string, any> | null | undefined): boolean => {
  const uA = ans || {};
  const selected = uA[mIdx];
  if (selected === undefined || selected === null || selected === '') return false;
  const selectedIdx = parseInt(String(selected), 10);
  const pairs = q?.matchingPairs || [];
  if (Number.isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= pairs.length) return false;
  const selectedRight = String(pairs[selectedIdx]?.right || '').trim();
  const correctRight = String(pairs[mIdx]?.right || '').trim();
  return !!selectedRight && selectedRight === correctRight;
};

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
        return acc + (matchingPairCorrect(q, mIdx, uA) ? 0.5 : 0);
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

/** Indica se há pelo menos uma questão que pode ser corrigida automaticamente. */
export const hasObjectiveQuestion = (questions: any[]): boolean => {
  if (!Array.isArray(questions) || questions.length === 0) return false;
  return questions.some((q: any) =>
    q.type === 'multiple_choice' ||
    q.type === 'true_false' ||
    (q.type === 'matching' && (q.matchingPairs || []).length > 0) ||
    !q.type
  );
};

/**
 * Auto-correção da FILA: processa submissões com status 'pendente' cujo
 * gabarito está completo e possui questões objetivas (inclusive matching).
 * Recalcula a nota via computeScore, marca como 'corrigida' e aplica os
 * efeitos pedagógicos do módulo (finalização/recuperação).
 * Retorna a quantidade corrigida, a pulada e os ids alterados.
 */
export const autoGradePendingSubmissions = async (pendingSubs: any[]): Promise<{ corrected: number; skipped: number; changed: string[]; notas: Record<string, number> }> => {
  const list = (pendingSubs || []).filter((s: any) => s && s.status === 'pendente');
  const changed: string[] = [];
  const notas: Record<string, number> = {};
  if (list.length === 0) return { corrected: 0, skipped: 0, changed, notas };

  const scorableByAula: Record<string, any[]> = {};
  for (const s of list) {
    const qs = s.questionario || s.aulas?.questionario || [];
    if (!hasObjectiveQuestion(qs) || !hasCompleteGabarito(qs)) continue;
    const aid = s.aula_id || s.lesson_id || s.aulas?.id;
    if (aid) (scorableByAula[aid] = scorableByAula[aid] || []).push(s);
  }
  const aulaIds = Object.keys(scorableByAula);
  if (aulaIds.length === 0) return { corrected: 0, skipped: list.length, changed, notas };

  const { data: aulas } = await supabase
    .from('aulas')
    .select('id, livro_id, min_grade, versao, tipo, titulo, questionario, ordem, parent_aula_id')
    .in('id', aulaIds);
  const aulasMap: Record<string, any> = {};
  (aulas || []).forEach((a: any) => { aulasMap[a.id] = a; });

  let corrected = 0;
  const updates: Array<{targetId: string, updateData: any, alunoId: string, livroId: string, nota: number, minGrade: number, aula: any}> = [];

  for (const aid of aulaIds) {
    const aula = aulasMap[aid];
    if (!aula) continue;
    const qs = aula.questionario || scorableByAula[aid][0]?.questionario || [];
    const minGrade = aula.min_grade || 7;
    for (const s of scorableByAula[aid]) {
      if (!s.respostas || Object.keys(s.respostas).length === 0) continue;
      const nota = computeScore(qs, s.respostas);
      const targetId = s.submission_id || s.id;
      const updateData: any = {
        nota,
        status: 'corrigida',
        updated_at: new Date().toISOString()
      };
      if (!s.primeira_correcao_at) updateData.primeira_correcao_at = new Date().toISOString();
      updates.push({ targetId, updateData, alunoId: s.aluno_id, livroId: aula.livro_id, nota, minGrade, aula });
    }
  }

  // Batch DB updates (chunks of 10)
  for (let i = 0; i < updates.length; i += 10) {
    const chunk = updates.slice(i, i + 10);
    await Promise.all(chunk.map(async (u) => {
      const { error } = await supabase.from('respostas_aulas').update(u.updateData).eq('id', u.targetId);
      if (error) return;
      corrected++;
      if (u.targetId) {
        changed.push(u.targetId);
        notas[u.targetId] = u.nota;
      }
      // Efeitos pedagógicos (finalização do módulo / criação de recuperação)
      if (u.alunoId && u.livroId) {
        if (u.nota >= u.minGrade) {
          await finalizeModuleOnApproval(u.alunoId, u.livroId);
        } else {
          await unfinalizeModule(u.alunoId, u.livroId);
          await ensureRecoveryExam(u.aula, u.nota, u.minGrade);
        }
      }
    }));
  }
  return { corrected, skipped: list.length - corrected, changed, notas };
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
