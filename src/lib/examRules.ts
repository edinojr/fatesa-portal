// ============================================================
// Regra acadêmica única: V1 → V2 (Recuperação) → V3 (2ª Recuperação) → DP
// Fonte única de verdade consumida por:
// - useStudentCourses (badges/isFinished/isDP da lista de cursos)
// - courseUtils.getBookStats (stats dos cards de módulo)
// - Dashboard.pendingExams (popup de provas pendentes/recuperação)
// - ModuleDetails.isActuallyLocked (travas da grade do módulo)
// - Lesson.checarAcessoSeguroAvaliacao (acesso direto à prova)
//
// Semântica canônica:
// - Aprovado  = nota >= min_grade em QUALQUER tentativa (qualquer versão)
// - DP        = última recuperação (V3) corrigida e reprovada
// - V2/V3 liberada = versão anterior corrigida e reprovada (nota < min_grade dela)
// ============================================================

import { areModuleTitlesEqual } from './courseTitles';

export const DEFAULT_MIN_GRADE = 7.0;
export const MAX_EXAM_VERSION = 3;

export const isExamAula = (aula: any): boolean =>
  !!aula && (aula.tipo === 'prova' || aula.tipo === 'avaliacao' || !!aula.is_bloco_final);

/** Versão da prova: campo `versao`, com fallback de título para provas legadas. */
export const getExamVersion = (aula: any): number => {
  if (!aula) return 1;
  const v = Number(aula?.versao);
  if (!isNaN(v) && v > 1) return v;
  const t = (aula?.titulo || '').toLowerCase();
  if (t.includes('recuperação 2') || t.includes('recuperacao 2') || t.includes('v3') || t.includes('2ª recuperação') || t.includes('2a recuperacao')) return 3;
  if (t.includes('recuperação') || t.includes('recuperacao') || t.includes('v2')) return 2;
  if (t.includes('v1')) return 1;
  return 1;
};

/**
 * Nomenclatura oficial das avaliações Fatesa:
 * V1: Avaliação
 * V2: Avaliação Recuperação
 * V3: Avaliação Recuperação 2
 */
export const getExamLabel = (aula: any): string => {
  const v = getExamVersion(aula);
  if (v === 1) return 'V1: Avaliação';
  if (v === 2) return 'V2: Avaliação Recuperação';
  if (v === 3) return 'V3: Avaliação Recuperação 2';
  return `V${v}: Avaliação`;
};

export const getMinGrade = (aula: any): number => aula?.min_grade || DEFAULT_MIN_GRADE;

export interface ExamAttempt {
  aulaId: string;
  versao: number;
  nota: number;
  minGrade: number;
}

/**
 * Coleta as tentativas corrigidas de prova de um módulo.
 * Submissões sem nota ou cuja aula não está na lista são ignoradas.
 */
export const collectExamAttempts = (aulas: any[], submissions: any[]): ExamAttempt[] => {
  const examAulas = (aulas || []).filter(isExamAula);
  const normalize = (str: string) =>
    (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  return (submissions || [])
    .filter((s: any) => (s.status === 'corrigida' || (s.nota !== undefined && s.nota !== null && Number(s.nota) >= 7.0)) && s.nota !== undefined && s.nota !== null)
    .map((s: any) => {
      const subAulaId = s.lesson_id || s.aula_id || s.aulas?.id;
      // 1. Tentar encontrar por ID exato
      let aula = examAulas.find((a: any) => a.id === subAulaId);

      // 2. Fallback: tentar encontrar por título correspondente
      if (!aula && (s.lesson_title || s.modulo_nome)) {
        const subTitle = s.lesson_title || s.modulo_nome;
        aula = examAulas.find((a: any) => areModuleTitlesEqual(a.titulo, subTitle));
      }

      // 3. Fallback: se é uma submissão de prova ou nota manual do módulo
      if (!aula && (s.is_manual || s.is_bloco_final || s.lesson_type === 'prova' || s.lesson_type === 'avaliacao')) {
        const targetBookId = examAulas[0]?.livro_id || (aulas || [])[0]?.livro_id;
        const matchesBook = !targetBookId || !s.book_id || s.book_id === targetBookId;
        if (matchesBook) {
          if (examAulas.length > 0) {
            aula = examAulas[0];
          } else {
            return {
              aulaId: subAulaId || 'manual-attempt',
              versao: 1,
              nota: Number(s.nota) || 0,
              minGrade: 7
            };
          }
        }
      }

      if (!aula) return null;
      return {
        aulaId: aula.id,
        versao: getExamVersion(aula),
        nota: Number(s.nota) || 0,
        minGrade: getMinGrade(aula)
      };
    })
    .filter(Boolean) as ExamAttempt[];
};

/** Aprovado = passou em qualquer tentativa (qualquer versão). */
export const isModuleApproved = (attempts: ExamAttempt[]): boolean =>
  attempts.some(a => a.nota >= a.minGrade);

/** Melhor tentativa (maior nota) — para exibição de nota da prova. */
export const getBestAttempt = (attempts: ExamAttempt[]): ExamAttempt | null =>
  attempts.length ? attempts.reduce((best, cur) => (cur.nota > best.nota ? cur : best)) : null;

/** DP = fez a última recuperação (V3) corrigida e reprovou. */
export const isModuleDP = (attempts: ExamAttempt[]): boolean =>
  attempts.filter(a => a.versao >= MAX_EXAM_VERSION).some(a => a.nota < a.minGrade);

/** Recuperação (V2/V3) liberada = versão anterior corrigida e reprovada. */
export const isRecoveryUnlocked = (versao: number, attempts: ExamAttempt[]): boolean => {
  if (versao <= 1) return true;
  return attempts.filter(a => a.versao === versao - 1).some(a => a.nota < a.minGrade);
};

/** Resumo do estado acadêmico do módulo. */
export const getModuleExamStatus = (aulas: any[], submissions: any[]) => {
  const attempts = collectExamAttempts(aulas, submissions);
  const best = getBestAttempt(attempts);
  return {
    attempts,
    attemptsCount: attempts.length,
    isApproved: isModuleApproved(attempts),
    isDP: isModuleDP(attempts),
    examGrade: best?.nota ?? 0,
    bestAttempt: best
  };
};
