import { getRequiredModules } from '../../../config/graduation';
import { getModuleExamStatus } from '../../../lib/examRules';

export const getBookStats = (l: any, atividades: any[] = [], progressoAulas: any[] = []) => {
    const allAulas = l.aulas || [];
    
    // Função auxiliar para pegar o ID da aula independente do formato (view ou tabela direta)
    const getSubAulaId = (at: any) => at.aula_id || at.lesson_id || at.aulas?.id;

    const submittedIds = (atividades || [])
        .filter(at => at.status === 'corrigida')
        .map(getSubAulaId);
    const watchedIds = (progressoAulas || []).filter(p => p.concluida).map(p => p.aula_id || p.lesson_id);

    const totalItems = allAulas.length;
    
    // Módulo sem aulas não pode ser aprovado automaticamente.
    // O aluno só é finalizado/aprovado mediante prova OU liberação manual do administrador.
    if (totalItems === 0) return { percent: 0, completed: 0, total: 0, averageGrade: 0, isFinished: false, isApproved: false, examGrade: 0, hasExam: false, isMaintenance: true };
    
    const completedItems = allAulas.filter((a: any) => 
      (a.tipo === 'atividade' || a.tipo === 'prova') ? submittedIds.includes(a.id) : watchedIds.includes(a.id)
    ).length;
    
    // Identificação Robusta de Avaliações Finais
    const finalExams = allAulas.filter((a: any) => 
      a.tipo === 'prova' || 
      a.tipo === 'avaliacao' || 
      !!a.is_bloco_final
    );
    
    let isApproved = false;
    let examGrade = 0;
    let attemptsCount = 0;
    let isFinished = false;

    const normalizeTitle = (s: string) =>
      (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    // Identificação de notas manuais ou submissões vinculadas diretamente ao livro
    const manualGrade = l.nota != null && !isNaN(Number(l.nota)) 
      ? Number(l.nota) 
      : (l.notaHistorico != null && !isNaN(Number(l.notaHistorico)) ? Number(l.notaHistorico) : null);
    
    const bookSubmissions = (atividades || []).filter((at: any) => 
      at.status === 'corrigida' && at.nota !== undefined && at.nota !== null &&
      (at.book_id === l.id || normalizeTitle(at.book_title || at.modulo_nome || '') === normalizeTitle(l.titulo))
    );
    
    if (finalExams.length > 0) {
        // Regra única (lib/examRules): aprovado = qualquer tentativa >= min_grade;
        // DP = V3 corrigida e reprovada
        const status = getModuleExamStatus(allAulas, bookSubmissions);
        attemptsCount = status.attemptsCount;
        examGrade = status.examGrade;
        isApproved = status.isApproved;
        isFinished = isApproved || status.isDP;
    }

    // Se ainda não aprovado mas há nota manual ou submissão direta do livro
    if (!isApproved && (manualGrade !== null || bookSubmissions.length > 0)) {
        const bestSubGrade = bookSubmissions.length > 0 
          ? Math.max(...bookSubmissions.map((s: any) => Number(s.nota) || 0)) 
          : 0;
        const candidateGrade = manualGrade !== null ? manualGrade : bestSubGrade;
        if (candidateGrade >= 7.0) {
            isApproved = true;
            isFinished = true;
            examGrade = Math.max(examGrade, candidateGrade);
            attemptsCount = Math.max(attemptsCount, bookSubmissions.length || 1);
        } else if (candidateGrade > 0) {
            examGrade = Math.max(examGrade, candidateGrade);
        }
    }

    // Módulo em manutenção: apenas se não houver aulas cadastradas no módulo.
    // Havendo aulas para estudo, o módulo não fica em manutenção.
    const hasAnyValidExam = finalExams.length > 0 || isApproved || manualGrade !== null;
    const isMaintenance = typeof l.isMaintenanceModule === 'boolean' 
      ? (l.isMaintenanceModule && !isApproved) 
      : (totalItems === 0 && !isApproved && manualGrade === null);
    
    const result = {
      percent: isApproved ? 100 : Math.round((completedItems / totalItems) * 100),
      completed: isApproved ? totalItems : completedItems,
      total: totalItems,
      examGrade: examGrade,
      isApproved: isApproved,
      isFinished: isFinished,
      attemptsCount,
      hasExam: hasAnyValidExam,
      isMaintenance
    };
    return result;
};

export const isCourseCompleted = (course: any, atividades: any[] = [], progressoAulas: any[] = []) => {
    if (!course || !course.livros || course.livros.length === 0) return false;
    
    const finishedCount = course.livros.filter((livro: any) => {
        const stats = getBookStats(livro, atividades, progressoAulas);
        return stats.isFinished && stats.isApproved;
    }).length;

    const required = getRequiredModules(course.nivel || '');
    return finishedCount >= required && required !== Infinity;
};
