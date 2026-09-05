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
    
    if (finalExams.length > 0) {
        // Regra única (lib/examRules): aprovado = qualquer tentativa >= min_grade;
        // DP = V3 corrigida e reprovada
        const status = getModuleExamStatus(allAulas, atividades);
        attemptsCount = status.attemptsCount;
        examGrade = status.examGrade;
        isApproved = status.isApproved;
        isFinished = isApproved || status.isDP;
    } else {
      isApproved = false;
      // Sem prova final = sem processo de aprovação concluído.
      // O módulo só é finalizado mediante aprovação em prova OU liberação manual do administrador.
      isFinished = false;
    }

    // Módulo em manutenção: sem aulas OU sem prova final configurada.
    // Permanece em hiato até que o conteúdo seja introduzido e o aluno passe pelo processo.
    const isMaintenance = finalExams.length === 0;
    
    const result = {
      percent: Math.round((completedItems / totalItems) * 100),
      completed: completedItems,
      total: totalItems,
      examGrade: examGrade,
      isApproved: isApproved,
      isFinished: isFinished,
      attemptsCount,
      hasExam: finalExams.length > 0,
      isMaintenance
    };
    
    console.log(`[getBookStats] "${l.titulo}":`, {
      totalAulas: allAulas.length,
      aulaTipos: allAulas.map((a: any) => a.tipo),
      finalExams: finalExams.map((e: any) => e.titulo || e.tipo),
      examSubmissionsCount: (atividades || []).filter(at => finalExams.some((ex: any) => ex.id === getSubAulaId(at))).length,
      submittedIds,
      result
    });
    
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
