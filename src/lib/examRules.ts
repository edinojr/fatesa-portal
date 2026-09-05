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

export const DEFAULT_MIN_GRADE = 7.0;
export const MAX_EXAM_VERSION = 3;

export const isExamAula = (aula: any): boolean =>
  !!aula && (aula.tipo === 'prova' || aula.tipo === 'avaliacao' || !!aula.is_bloco_final);

/** Versão da prova: campo `versao`, com fallback de título para provas legadas. */
export const getExamVersion = (aula: any): number => {
  const v = aula?.versao;
  if (v && v > 1) return v;
  const t = (aula?.titulo || '').toLowerCase();
  if (t.includes('recuperação 2') || t.includes('recuperacao 2')) return 3;
  if (t.includes('recuperação') || t.includes('recuperacao')) return 2;
  return 1;
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
  return (submissions || [])
    .filter((s: any) => s.status === 'corrigida' && s.nota !== undefined && s.nota !== null)
    .map((s: any) => {
      const subAulaId = s.lesson_id || s.aula_id || s.aulas?.id;
      const aula = examAulas.find((a: any) => a.id === subAulaId);
      if (!aula) return null;
      return {
        aulaId: aula.id,
        versao: getExamVersion(aula),
        nota: s.nota || 0,
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
