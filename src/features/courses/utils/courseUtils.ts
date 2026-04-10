
export const getBookStats = (l: any, atividades: any[] = [], progressoAulas: any[] = []) => {
    const allAulas = l.aulas || [];
    
    // Função auxiliar para pegar o ID da aula independente do formato (view ou tabela direta)
    const getSubAulaId = (at: any) => at.aula_id || at.lesson_id || at.aulas?.id;

    const submittedIds = (atividades || []).map(getSubAulaId);
    const watchedIds = (progressoAulas || []).filter(p => p.concluida).map(p => p.aula_id || p.lesson_id);

    const itemsForProgress = allAulas.filter((a: any) => a.tipo !== 'licao');
    const totalItems = itemsForProgress.length;
    
    // Se não há itens, consideramos finalizado
    if (totalItems === 0) return { percent: 0, completed: 0, total: 0, averageGrade: 10, isFinished: true, isApproved: true, examGrade: 10, hasExam: false };
    
    const completedItems = itemsForProgress.filter((a: any) => 
      (a.tipo === 'atividade' || a.tipo === 'prova') ? submittedIds.includes(a.id) : watchedIds.includes(a.id)
    ).length;
    
    // Identificação Robusta de Avaliações Finais
    const finalExams = allAulas.filter((a: any) => 
      a.tipo === 'prova' || 
      !!a.is_bloco_final || 
      (a.titulo && (
          a.titulo.toUpperCase().includes('V1') || 
          a.titulo.toUpperCase().includes('V2') || 
          a.titulo.toUpperCase().includes('V3') ||
          a.titulo.toUpperCase().includes('PROVA FINAL') ||
          a.titulo.toUpperCase().includes('AVALIAÇÃO') ||
          a.titulo.toUpperCase().includes('EXAME FINAL')
      ))
    );
    
    let isApproved = false;
    let examGrade = 0;
    let attemptsCount = 0;
    let isFinished = false;
    
    if (finalExams.length > 0) {
      const examSubmissions = (atividades || []).filter(at => 
          finalExams.some((ex: any) => ex.id === getSubAulaId(at))
      );
      attemptsCount = examSubmissions.length;
      
      const approvedSub = examSubmissions.find(sub => {
         const exam = finalExams.find((ex: any) => ex.id === getSubAulaId(sub));
         const status = (sub.status || '').toLowerCase();
         const grade = sub.nota || 0;
         const minGrade = exam?.min_grade || 7.0;
         
         // Aprovado se status é corrigida OU se tirou nota acima da média
         return (status === 'corrigida' || grade >= minGrade) && grade >= minGrade;
      });

      if (approvedSub) {
         isApproved = true;
         examGrade = approvedSub.nota || 0;
         isFinished = true;
      } else {
         const bestSub = examSubmissions.sort((a,b) => (b.nota || 0) - (a.nota || 0))[0];
         examGrade = bestSub ? bestSub.nota || 0 : 0;
         isApproved = false;
         isFinished = attemptsCount >= 3; // Estourou 3 tentativas sem passar
      }
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
