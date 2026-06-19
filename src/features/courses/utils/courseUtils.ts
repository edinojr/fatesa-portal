import { GRADUATION_CONFIG, getRequiredModules } from '../../../config/graduation';

export const getBookStats = (l: any, atividades: any[] = [], progressoAulas: any[] = []) => {
    const allAulas = l.aulas || [];
    
    // Função auxiliar para pegar o ID da aula independente do formato (view ou tabela direta)
    const getSubAulaId = (at: any) => at.aula_id || at.lesson_id || at.aulas?.id;

    const submittedIds = (atividades || [])
        .filter(at => at.status === 'corrigida')
        .map(getSubAulaId);
    const watchedIds = (progressoAulas || []).filter(p => p.concluida).map(p => p.aula_id || p.lesson_id);

    const totalItems = allAulas.length;
    
    // Se não há itens, consideramos finalizado
    if (totalItems === 0) return { percent: 0, completed: 0, total: 0, averageGrade: 10, isFinished: true, isApproved: true, examGrade: 10, hasExam: false };
    
    const completedItems = allAulas.filter((a: any) => 
      (a.tipo === 'atividade' || a.tipo === 'prova') ? submittedIds.includes(a.id) : watchedIds.includes(a.id)
    ).length;
    
    // Identificação Robusta de Avaliações Finais
    const finalExams = allAulas.filter((a: any) => 
      a.tipo === 'prova' || 
      !!a.is_bloco_final
    );
    
    let isApproved = false;
    let examGrade = 0;
    let attemptsCount = 0;
    let isFinished = false;
    
    if (finalExams.length > 0) {
      // APENAS submissões corrigidas contam como tentativas válidas (não 'pendente')
      const examSubmissions = (atividades || []).filter(at => 
          finalExams.some((ex: any) => ex.id === getSubAulaId(at)) &&
          at.status === 'corrigida'
      );
      attemptsCount = examSubmissions.length;

      // Filtrar submissões para pegar apenas as que possuem nota válida
      const gradedSubs = examSubmissions.filter(s => s.status === 'corrigida' && s.nota !== undefined && s.nota !== null);
      
      if (gradedSubs.length > 0) {
        // Encontrar a submissão com a maior nota (não a maior versão)
        const subsWithGrade = gradedSubs.map(sub => {
          const exam = finalExams.find((ex: any) => ex.id === getSubAulaId(sub));
          return {
            sub,
            exam,
            nota: sub.nota || 0,
            versao: exam?.versao || 1,
            minGrade: exam?.min_grade || 7.0
          };
        });

        // Usar a maior nota para determinar aprovação
        const bestAttempt = subsWithGrade.reduce((best, curr) =>
          curr.nota > best.nota ? curr : best
        );
        
        if (bestAttempt) {
          examGrade = bestAttempt.nota;
          isApproved = examGrade >= bestAttempt.minGrade;
        }
      }

      // DP (Dependência) = reprovou na V3 (consistente com useStudentCourses)
      const hasFailedV3 = gradedSubs.some(s => {
        const exam = finalExams.find((ex: any) => ex.id === getSubAulaId(s));
        return exam?.versao === 3 && (s.nota || 0) < (exam?.min_grade || 7.0);
      });

      isFinished = isApproved || hasFailedV3;
    } else {
      isApproved = false;
      // Se não tem prova, finaliza quando completar todos os itens
      isFinished = (completedItems === totalItems && totalItems > 0);
    }
    
    return {
      percent: Math.round((completedItems / totalItems) * 100),
      completed: completedItems,
      total: totalItems,
      examGrade: examGrade,
      isApproved: isApproved,
      isFinished: isFinished,
      attemptsCount,
      hasExam: finalExams.length > 0
    };
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
