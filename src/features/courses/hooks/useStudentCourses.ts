import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Course } from '../../../types/dashboard';


export const useStudentCourses = (profile: any) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressoAulas, setProgressoAulas] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [finishedBasicCount, setFinishedBasicCount] = useState(0);
  const [isBasicFinished, setIsBasicFinished] = useState(false);

  const fetchStudentDashboardData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const isStaff = ['admin', 'professor', 'suporte'].includes(profile?.tipo || '') || 
                      (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte'].includes(r));

      // 1. Verificar Isenção do Núcleo
      let nucleoIsento = false;
      if (profile.nucleo_id) {
        const { data: nucData } = await supabase.from('nucleos').select('isento').eq('id', profile.nucleo_id).maybeSingle();
        nucleoIsento = !!nucData?.isento;
      }

      // 2. Determinar curso_id de forma segura
      const cursoId = (profile.curso_id && profile.curso_id !== 'null') ? profile.curso_id : null;

      let courseBooksQuery = supabase.from('livros').select('id, ordem');
      
      if (cursoId) {
        courseBooksQuery = courseBooksQuery.eq('curso_id', cursoId);
      }
      
      const { data: courseBooks } = await courseBooksQuery.order('ordem');
      
      // 3. Liberações do Núcleo (seguro se nucleo_id for nulo)
      const { data: releases } = profile.nucleo_id
        ? await supabase.from('liberacoes_nucleo').select('item_id, item_type, created_at').eq('nucleo_id', profile.nucleo_id).eq('liberado', true)
        : { data: [] };
       
      const releasedModulos = (releases || []).filter(r => r.item_type === 'modulo').map(r => r.item_id);
      const releasedAtividades = (releases || []).filter(r => r.item_type === 'atividade').map(r => r.item_id);
      const releasedVideos = (releases || []).filter(r => r.item_type === 'video').map(r => r.item_id);
      
      // 4. Provas / Atividades do Professor
      const { data: exams } = await supabase.from('aulas').select('id, livro_id, is_bloco_final, tipo').or('tipo.eq.prova,is_bloco_final.eq.true');

      const isPresencial = profile?.tipo === 'presencial';
      const temAcessoDefinitivo = profile?.acesso_definitivo === true;
      const exemptStatus = profile.bolsista || isStaff || nucleoIsento || isPresencial || temAcessoDefinitivo;

      // Cálculo de liberação (Pagamentos + Provas)
      let releasedCount = 1;

      // Limite Pedagógico: Módulo Vigente
      const examReleaseDates: Record<string, string> = {};
      const releasedExamBookIds = new Set<string>();

      if (exams && releases) {
        exams.filter(exam => releasedAtividades.includes(exam.id)).forEach(exam => {
          releasedExamBookIds.add(exam.livro_id);
        });
      }

      // Módulo Vigente: determina o menor e o maior módulo com base nas ordens reais do curso
      const bookOrdens = (courseBooks || []).map(b => b.ordem || 1).sort((a, b) => a - b);
      const minBookOrdem = bookOrdens[0] || 1; // Primeiro módulo do curso (menor ordem)

      let maxReleasedModuleOrdem = 0;
      if (courseBooks && releases) {
        courseBooks.forEach(b => {
          const isModuleReleased = releasedModulos.includes(b.id);
          const isExamReleased = releasedExamBookIds.has(b.id);
          
          if (isModuleReleased && (b.ordem || 0) > maxReleasedModuleOrdem) {
            maxReleasedModuleOrdem = b.ordem;
          }
          if (isExamReleased && (b.ordem || 0) + 1 > maxReleasedModuleOrdem) {
            maxReleasedModuleOrdem = (b.ordem || 0) + 1;
          }
        });
      }

      // Se nenhum módulo foi liberado pelo professor, o primeiro módulo do curso é o vigente
      const pedagogicalLimit = maxReleasedModuleOrdem > 0 ? maxReleasedModuleOrdem : minBookOrdem;

      if (exams && releases) {
        exams.forEach(exam => {
          if (exam.is_bloco_final) {
            const rel = (releases as any[]).find(r => r.item_id === exam.id && r.item_type === 'atividade');
            if (rel) examReleaseDates[exam.livro_id] = rel.created_at;
          }
        });
      }

      if (exemptStatus) {
        // Isentos e staff veem todos os módulos até o limite pedagógico
        releasedCount = Math.max(minBookOrdem, pedagogicalLimit); 
      } else {
        const { data: payRecords } = await supabase.from('pagamentos').select('status').eq('user_id', profile.id).eq('status', 'pago');
        const paidCount = payRecords?.length || 0;
        // Sempre libera pelo menos o primeiro módulo (minBookOrdem)
        releasedCount = Math.max(minBookOrdem, Math.min(minBookOrdem + paidCount, pedagogicalLimit));
      }

      // 5. Progresso e Notas - query direta sem depender da view
      const { data: resDataRaw } = await supabase
        .from('respostas_aulas')
        .select('id, aula_id, nota, status, tentativas, created_at, updated_at, comentario_professor, primeira_correcao_at, respostas, aulas:aula_id(id, titulo, tipo, is_bloco_final, questionario, livros:livro_id(id, titulo, cursos:curso_id(nivel)))')
        .eq('aluno_id', profile.id);
      
      const resData = (resDataRaw || []).map((r: any) => ({
        ...r,
        submission_id: r.id,
        lesson_id: r.aula_id,
        lesson_title: r.aulas?.titulo,
        lesson_type: r.aulas?.tipo,
        is_bloco_final: r.aulas?.is_bloco_final,
        book_id: r.aulas?.livros?.id,
        book_title: r.aulas?.livros?.titulo,
        submitted_at: r.created_at,
      }));
      
      const { data: progData } = await supabase.from('progresso').select('aula_id, concluida').eq('aluno_id', profile.id);
      const { data: exceptions } = await supabase.from('liberacoes_excecao').select('livro_id').eq('user_id', profile.id);
      
      const exceptionIds = (exceptions || []).map(e => e.livro_id);
      const userHasActivityInModule = (livroId: string) => {
        return resData.some(res => res.book_id === livroId);
      };

      setAtividades(resData);
      setProgressoAulas(progData || []);

      const fBasicCount = (resData || []).filter(r => 
        r.is_bloco_final && 
        r.status === 'corrigida' && 
        (r.nota || 0) >= 7.0 &&
        (r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('basico') || r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('básico'))
      ).length;

      setFinishedBasicCount(fBasicCount);
      const isFinished = fBasicCount >= 27;
      setIsBasicFinished(isFinished);

      // 6. Cursos - filtra pelo curso vinculado se existir, caso contrário busca todos
      const courseSelect = 'id, nome, nivel, livros(id, titulo, capa_url, ordem, curso_id, aulas(id, titulo, tipo, ordem, nucleo_id, versao, is_bloco_final), cursos:curso_id(nivel))';
      const { data: allCourses } = cursoId
        ? await supabase.from('cursos').select(courseSelect).eq('id', cursoId)
        : await supabase.from('cursos').select(courseSelect);
      
      if (allCourses) {
        const mappedCourses: Course[] = allCourses.map((c: any) => {
          const sortedLivros = (c.livros || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
          return {
            id: c.id,
            nome: c.nome,
            livros: sortedLivros.map((l: any) => {
              const bookOrdem = l.ordem || 1;
              const isManualModuleRelease = releasedModulos.includes(l.id);
                const isModuleReleased = (
                  isStaff || 
                  isManualModuleRelease || 
                  bookOrdem <= releasedCount || 
                  bookOrdem === pedagogicalLimit ||
                  bookOrdem === 1 // Garantia absoluta para o módulo 1
                );

                // BLOQUEIO DE NÍVEL MÉDIO: Só libera se o básico estiver completo (27 módulos)
                const isMedium = (c.nivel || '').toLowerCase().includes('medio') || (c.nivel || '').toLowerCase().includes('médio');
                const levelLocked = isMedium && !isFinished && !isStaff;

                const isReleased = isModuleReleased && !levelLocked;
                const isCurrent = !isStaff && !exemptStatus && (bookOrdem === pedagogicalLimit) && !levelLocked;

              const examReleaseDate = examReleaseDates[l.id];
              const userCreatedAt = new Date(profile.created_at).getTime();
              const releaseTime = examReleaseDate ? new Date(examReleaseDate).getTime() : 0;
              
              const isPastModule = releaseTime > 0 && userCreatedAt > (releaseTime + 86400000);
              const hasException = exceptionIds.includes(l.id);
              const hasStarted = userHasActivityInModule(l.id);
              
              const isHidden = isPastModule && !hasException && !hasStarted && !isStaff;

              if (isHidden) return null;

                return {
                  ...l,
                  aulas: [...(l.aulas || [])]
                    .sort((a: any, b: any) => {
                      if (a.ordem !== b.ordem) return (a.ordem || 0) - (b.ordem || 0);
                      return (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', { numeric: true, sensitivity: 'base' });
                    })
                    .map((a: any) => {
                    if (isStaff) return { ...a, lockedByProfessor: false };
                    
                    const matchesNucleo = isStaff || !a.nucleo_id || a.nucleo_id === profile?.nucleo_id;
                    if (!matchesNucleo) return { ...a, isHidden: true };

                    let lockedByProfessor = false;
                    const displayTitle = a.titulo || '';
                    
                    // Apenas vídeos e provas finais exigem liberação manual do professor
                    const isRestrictedType = a.tipo === 'gravada' || a.tipo === 'ao_vivo' || a.tipo === 'video' || a.tipo === 'prova' || !!a.is_bloco_final;
                    
                    if (isRestrictedType) {
                      let isItemReleased = false;

                      // Liberação manual para Provas, Vídeos ou Atividades restritas
                      isItemReleased = (releasedVideos.includes(a.id) || releasedAtividades.includes(a.id));
                      
                      // Caso especial: Provas V1 liberam o bloco de prova se o livro estiver liberado e houver qualquer liberação de atividade para o livro
                      if (!isItemReleased && (a.tipo === 'prova' || !!a.is_bloco_final)) {
                        isItemReleased = releasedExamBookIds.has(l.id);
                      }

                      // Conteúdo padrão é desbloqueado se o módulo pai estiver liberado (ou manual se restrito)
                      lockedByProfessor = !isReleased || (!isItemReleased && isRestrictedType);
                    }

                    let isHiddenItem = false;
                    const v = a.versao || 1;

                    if (!isStaff && (v === 2 || v === 3)) {
                      const prevV = v - 1;
                      const prevAula = (l.aulas || []).find((pa: any) => pa.versao === prevV && !!pa.is_bloco_final);
                      const prevSub = resData.find((s: any) => s.lesson_id === prevAula?.id);
                      
                      // Regras para esconder Recuperação:
                      // 1. Se ainda não fez a anterior
                      // 2. Se a anterior ainda não foi corrigida
                      // 3. Se já passou na anterior ou em qualquer uma antes
                      const passedAnyPrevious = resData.some((s: any) => {
                        const sa = (l.aulas || []).find((pa: any) => pa.id === s.lesson_id);
                        return sa?.is_bloco_final && (sa?.versao || 0) < v && s.status === 'corrigida' && (s.nota || 0) >= 7.0;
                      });

                      if (!prevSub || prevSub.status !== 'corrigida' || passedAnyPrevious) {
                        isHiddenItem = true;
                      }
                    }

                    return { ...a, titulo: displayTitle, lockedByProfessor, isHidden: isHiddenItem };
                  }).filter((a: any) => !a.isHidden),
                  isReleased,
                  isCurrent: isCurrent && isReleased
                };
            }).filter(Boolean)
          };
        }).filter((c: any) => c.livros.length > 0 || isStaff);
        setCourses(mappedCourses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    profile?.id, 
    profile?.curso_id, 
    profile?.nucleo_id, 
    profile?.tipo, 
    profile?.bolsista,
    profile?.acesso_definitivo,
    profile?.caminhos_acesso, 
    profile?.created_at
  ]);

  return {
    courses,
    progressoAulas,
    atividades,
    loading,
    fetchStudentDashboardData,
    finishedBasicCount,
    isBasicFinished
  };
};
