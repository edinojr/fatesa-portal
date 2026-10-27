import { supabase } from '../lib/supabase';
import { QuizQuestion, QuestionType } from '../types/admin';

export type { QuizQuestion, QuestionType };

/**
 * Normaliza o texto do enunciado para comparação segura:
 * remove acentos, pontuação, múltiplos espaços e converte para minúsculas.
 */
export const normalizeQuestionText = (text: string): string => {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Deduplica uma lista de questões com base no enunciado normalizado.
 * Mantém a primeira ocorrência completa (com gabarito válido).
 */
export const deduplicateQuestions = (questions: any[]): { deduplicated: any[]; removedCount: number; duplicateTexts: string[] } => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { deduplicated: [], removedCount: 0, duplicateTexts: [] };
  }

  const seen = new Map<string, any>();
  const duplicateTexts: string[] = [];
  const result: any[] = [];

  for (const q of questions) {
    if (!q || !q.text) continue;
    const key = normalizeQuestionText(q.text);
    if (!key) continue;

    if (seen.has(key)) {
      duplicateTexts.push(q.text);
      // Se a que já vimos não tinha gabarito completo e esta tem, substitui
      const prev = seen.get(key);
      const prevHasKey = prev.correct !== undefined || prev.correctOption !== undefined || prev.isTrue !== undefined || (prev.matchingPairs && prev.matchingPairs.length > 0);
      const currHasKey = q.correct !== undefined || q.correctOption !== undefined || q.isTrue !== undefined || (q.matchingPairs && q.matchingPairs.length > 0);
      if (!prevHasKey && currHasKey) {
        const idx = result.indexOf(prev);
        if (idx !== -1) {
          result[idx] = q;
          seen.set(key, q);
        }
      }
    } else {
      seen.set(key, q);
      result.push(q);
    }
  }

  return {
    deduplicated: result,
    removedCount: questions.length - result.length,
    duplicateTexts
  };
};

/**
 * Busca todas as questões contidas nos exercícios e atividades pedagógicas
 * do módulo (livro) informado.
 */
export const fetchModuleExercises = async (livroId: string): Promise<QuizQuestion[]> => {
  if (!livroId) return [];

  try {
    const { data: exerciseAulas, error } = await supabase
      .from('aulas')
      .select('id, titulo, tipo, questionario, is_bloco_final, versao')
      .eq('livro_id', livroId)
      .order('ordem', { ascending: true });

    if (error || !exerciseAulas) {
      console.warn('Erro ao buscar exercícios do módulo:', error);
      return [];
    }

    const collected: QuizQuestion[] = [];
    const seen = new Set<string>();

    // Prioriza aulas do tipo exercicio e atividade (que não sejam bloco final de prova)
    const sorted = [...exerciseAulas].sort((a, b) => {
      const isExA = a.tipo === 'exercicio' || a.tipo === 'atividade';
      const isExB = b.tipo === 'exercicio' || b.tipo === 'atividade';
      if (isExA && !isExB) return -1;
      if (!isExA && !isExB) return 1;
      return 0;
    });

    for (const aula of sorted) {
      const qs = Array.isArray(aula.questionario) ? aula.questionario : [];
      for (const q of qs) {
        if (!q) continue;
        const qText = q.text || q.statement || q.question || (q.type === 'matching' ? 'Enumere a coluna B de acordo com a coluna A:' : '');
        if (!qText) continue;
        const qType: QuestionType = (q.type as QuestionType) || 'multiple_choice';
        if (qType !== 'true_false' && qType !== 'multiple_choice' && qType !== 'matching') {
          continue; // Ignora questões discursivas ou fora do parâmetro 10-4-1
        }
        const key = qType === 'matching'
          ? 'mat:' + (q.matchingPairs || []).map((p: any) => normalizeQuestionText(p.left)).join('|')
          : `${qType}:${normalizeQuestionText(qText)}`;
        if (!key || seen.has(key)) continue;
        seen.add(key);

        // Clona e atribui ID único limpo
        collected.push({
          ...q,
          text: qText,
          id: String(q.id || `ex-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
          type: qType,
          ...(qType === 'multiple_choice' && Array.isArray(q.options) ? { options: q.options.slice(0, 4) } : {}),
          ...(qType === 'matching' && Array.isArray(q.matchingPairs) ? { matchingPairs: q.matchingPairs.slice(0, 6) } : {})
        });
      }
    }

    return collected;
  } catch (err) {
    console.error('Falha em fetchModuleExercises:', err);
    return [];
  }
};

/**
 * Cria uma nova avaliação estruturada (ou avaliação de recuperação V2/V3)
 * usando questões dos exercícios do módulo e evitando questões duplicadas.
 *
 * Padrão oficial Fatesa:
 * - 10 Verdadeiro ou Falso
 * - 04 Múltipla Escolha
 * - 01 Relacione Colunas (com até 6 pares)
 */
export const generateQuestionsFromExercises = async (params: {
  livroId: string;
  excludeQuestions?: any[];
  targetTF?: number;
  targetMC?: number;
  targetMatching?: number;
}): Promise<QuizQuestion[]> => {
  const {
    livroId,
    excludeQuestions = [],
    targetTF = 10,
    targetMC = 4,
    targetMatching = 1
  } = params;

  const exercisePool = await fetchModuleExercises(livroId);

  // Conjunto de enunciados já utilizados (para evitar repetição)
  const excludedKeys = new Set<string>();
  excludeQuestions.forEach(q => {
    if (q && q.text) {
      const k = normalizeQuestionText(q.text);
      if (k) excludedKeys.add(k);
    }
  });

  // Separa questões de exercícios por tipo, excluindo as já usadas
  const poolTF: QuizQuestion[] = [];
  const poolMC: QuizQuestion[] = [];
  const poolMatching: QuizQuestion[] = [];

  for (const q of exercisePool) {
    const key = normalizeQuestionText(q.text);
    if (excludedKeys.has(key)) continue;

    if (q.type === 'true_false') {
      poolTF.push(q);
    } else if (q.type === 'multiple_choice' || !q.type) {
      poolMC.push(q);
    } else if (q.type === 'matching') {
      poolMatching.push(q);
    }
  }

  const finalQuestions: QuizQuestion[] = [];
  const chosenKeys = new Set<string>();

  // 1. Adicionar Verdadeiro ou Falso (meta: targetTF)
  let tfAdded = 0;
  for (const q of poolTF) {
    if (tfAdded >= targetTF) break;
    const k = normalizeQuestionText(q.text);
    if (!chosenKeys.has(k)) {
      chosenKeys.add(k);
      finalQuestions.push({ ...q, id: `tf-${Date.now()}-${tfAdded}`, type: 'true_false' });
      tfAdded++;
    }
  }

  // Se faltarem V/F no banco de exercícios não usados, tenta pegar do pool geral que não seja duplicado na prova atual
  if (tfAdded < targetTF) {
    for (const q of exercisePool) {
      if (tfAdded >= targetTF) break;
      if (q.type === 'true_false') {
        const k = normalizeQuestionText(q.text);
        if (!chosenKeys.has(k)) {
          chosenKeys.add(k);
          finalQuestions.push({ ...q, id: `tf-${Date.now()}-${tfAdded}`, type: 'true_false' });
          tfAdded++;
        }
      }
    }
  }

  // 2. Adicionar Múltipla Escolha (meta: targetMC)
  let mcAdded = 0;
  for (const q of poolMC) {
    if (mcAdded >= targetMC) break;
    const k = normalizeQuestionText(q.text);
    if (!chosenKeys.has(k)) {
      chosenKeys.add(k);
      finalQuestions.push({ ...q, id: `mc-${Date.now()}-${mcAdded}`, type: 'multiple_choice' });
      mcAdded++;
    }
  }

  if (mcAdded < targetMC) {
    for (const q of exercisePool) {
      if (mcAdded >= targetMC) break;
      if (q.type === 'multiple_choice' || !q.type) {
        const k = normalizeQuestionText(q.text);
        if (!chosenKeys.has(k)) {
          chosenKeys.add(k);
          finalQuestions.push({ ...q, id: `mc-${Date.now()}-${mcAdded}`, type: 'multiple_choice' });
          mcAdded++;
        }
      }
    }
  }

  // 3. Adicionar Relacione Colunas (meta: targetMatching)
  let matAdded = 0;
  for (const q of poolMatching) {
    if (matAdded >= targetMatching) break;
    const k = normalizeQuestionText(q.text);
    if (!chosenKeys.has(k)) {
      chosenKeys.add(k);
      finalQuestions.push({ ...q, id: `mat-${Date.now()}-${matAdded}`, type: 'matching' });
      matAdded++;
    }
  }

  if (matAdded < targetMatching) {
    for (const q of exercisePool) {
      if (matAdded >= targetMatching) break;
      if (q.type === 'matching') {
        const k = normalizeQuestionText(q.text);
        if (!chosenKeys.has(k)) {
          chosenKeys.add(k);
          finalQuestions.push({ ...q, id: `mat-${Date.now()}-${matAdded}`, type: 'matching' });
          matAdded++;
        }
      }
    }
  }

  // 4. Deduplicação final por segurança
  const { deduplicated } = deduplicateQuestions(finalQuestions);
  return deduplicated as QuizQuestion[];
};

/**
 * Audita todas as avaliações no sistema:
 * - Detecta avaliações com questões duplicadas internamente
 * - Remove as duplicadas e complementa com questões dos exercícios quando disponível
 * - Salva as correções no banco de dados
 */
export const auditAndDeduplicateAllExams = async (): Promise<{
  totalExams: number;
  examsWithDuplicates: number;
  totalDuplicatesRemoved: number;
  updatedAulas: Array<{ id: string; titulo: string; modulo: string; removed: number; newTotal: number }>;
}> => {
  const { data: exams, error } = await supabase
    .from('aulas')
    .select('id, titulo, tipo, versao, is_bloco_final, livro_id, questionario, livros:livro_id(id, titulo)')
    .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true');

  if (error || !exams) {
    console.error('Erro ao auditar avaliações:', error);
    throw new Error('Falha ao carregar avaliações do banco: ' + (error?.message || ''));
  }

  let examsWithDuplicates = 0;
  let totalDuplicatesRemoved = 0;
  const updatedAulas: Array<{ id: string; titulo: string; modulo: string; removed: number; newTotal: number }> = [];

  for (const exam of exams) {
    const rawQuestions = Array.isArray(exam.questionario) ? exam.questionario : [];
    if (rawQuestions.length === 0) continue;

    const { deduplicated, removedCount } = deduplicateQuestions(rawQuestions);

    if (removedCount > 0) {
      examsWithDuplicates++;
      totalDuplicatesRemoved += removedCount;

      let finalQuestions = deduplicated;

      // Garante o parâmetro estrito Fatesa: 10 V/F, 4 Múltipla Escolha, 1 Coluna de Relação (6 pares)
      let tfList = finalQuestions.filter(q => q.type === 'true_false').slice(0, 10);
      let mcList = finalQuestions.filter(q => q.type === 'multiple_choice' || !q.type).slice(0, 4);
      let matList = finalQuestions.filter(q => q.type === 'matching' && Array.isArray(q.matchingPairs) && q.matchingPairs.length >= 6).slice(0, 1);

      if ((tfList.length < 10 || mcList.length < 4 || matList.length < 1) && exam.livro_id) {
        try {
          const exerciseQs = await fetchModuleExercises(exam.livro_id);
          const existingKeys = new Set(
            [...tfList, ...mcList].map(q => normalizeQuestionText(q.text))
          );
          
          for (const exQ of exerciseQs) {
            const k = normalizeQuestionText(exQ.text);
            if (exQ.type === 'true_false' && tfList.length < 10 && !existingKeys.has(k)) {
              existingKeys.add(k);
              tfList.push({ ...exQ, id: `suppl-tf-${Date.now()}-${tfList.length}` });
            } else if (exQ.type === 'multiple_choice' && mcList.length < 4 && !existingKeys.has(k)) {
              existingKeys.add(k);
              mcList.push({ ...exQ, id: `suppl-mc-${Date.now()}-${mcList.length}` });
            } else if (exQ.type === 'matching' && matList.length < 1 && Array.isArray(exQ.matchingPairs) && exQ.matchingPairs.length >= 6) {
              matList.push({ ...exQ, id: `suppl-mat-${Date.now()}`, matchingPairs: exQ.matchingPairs.slice(0, 6) });
            }
          }
        } catch (fetchErr) {
          console.warn('Não foi possível complementar com exercícios:', fetchErr);
        }
      }

      finalQuestions = [...tfList, ...mcList, ...matList];

      // Atualiza a aula no Supabase
      const { error: updError } = await supabase
        .from('aulas')
        .update({ questionario: finalQuestions })
        .eq('id', exam.id);

      if (!updError) {
        updatedAulas.push({
          id: exam.id,
          titulo: exam.titulo,
          modulo: (exam.livros as any)?.titulo || 'Módulo',
          removed: removedCount,
          newTotal: finalQuestions.length
        });
      }
    }
  }

  return {
    totalExams: exams.length,
    examsWithDuplicates,
    totalDuplicatesRemoved,
    updatedAulas
  };
};
