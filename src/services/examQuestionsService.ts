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
        if (!q || !q.text) continue;
        const key = normalizeQuestionText(q.text);
        if (!key || seen.has(key)) continue;
        seen.add(key);

        // Clona e atribui ID único limpo
        const qType: QuestionType = (q.type as QuestionType) || 'multiple_choice';
        collected.push({
          ...q,
          id: String(q.id || `ex-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
          type: qType
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

      // Se após remover duplicadas faltarem questões para o padrão (15), tenta buscar exercícios do módulo
      if (finalQuestions.length < 15 && exam.livro_id) {
        try {
          const exerciseQs = await fetchModuleExercises(exam.livro_id);
          const existingKeys = new Set(finalQuestions.map(q => normalizeQuestionText(q.text)));
          
          for (const exQ of exerciseQs) {
            if (finalQuestions.length >= 15) break;
            const k = normalizeQuestionText(exQ.text);
            if (!existingKeys.has(k)) {
              existingKeys.add(k);
              finalQuestions.push({
                ...exQ,
                id: `suppl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
              });
            }
          }
        } catch (fetchErr) {
          console.warn('Não foi possível complementar com exercícios:', fetchErr);
        }
      }

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
