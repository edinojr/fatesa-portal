import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Course } from '../../../types/dashboard';


export const useStudentCourses = (profile: any) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressoAulas, setProgressoAulas] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [finishedBasicCount, setFinishedBasicCount] = useState(0);
  const [finishedMediumCount, setFinishedMediumCount] = useState(0);
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
      const { data: exams } = await supabase
        .from('aulas')
        .select('id, livro_id, is_bloco_final, tipo, titulo')
        .or('tipo.eq.prova,is_bloco_final.eq.true,titulo.ilike.%V1%,titulo.ilike.%V2%,titulo.ilike.%V3%,titulo.ilike.%RECUPERACAO%');

      const isPresencial = profile?.tipo === 'presencial';
      const temAcessoDefinitivo = profile?.acesso_definitivo === true;

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

      // 5. Progresso e Notas - query direta sem depender da view
      const { data: resDataRaw } = await supabase
        .from('respostas_aulas')
        .select('id, aula_id, nota, status, tentativas, created_at, updated_at, comentario_professor, primeira_correcao_at, respostas, aulas:aula_id(id, titulo, tipo, is_bloco_final, status_liberacao, data_liberacao, professor_active, questionario, livros:livro_id(id, titulo, cursos:curso_id(nivel)))')
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

      // 5.5 Calcular Total de Módulos Básicos Únicos Finalizados para Trava Pedagógica
      const finishedBasicModules = new Set((resData || [])
        .filter(r => 
          (r.is_bloco_final || r.lesson_type === 'prova' || r.aulas?.tipo === 'prova') && 
          r.status === 'corrigida' && 
          (r.nota || 0) >= 7.0 &&
          (r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('basico') || r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('básico'))
        )
        .map(r => r.book_id)
      );

      const fBasicCount = finishedBasicModules.size;
      setFinishedBasicCount(fBasicCount);

      const finishedMediumModules = new Set((resData || [])
        .filter(r => 
          (r.is_bloco_final || r.lesson_type === 'prova' || r.aulas?.tipo === 'prova') && 
          r.status === 'corrigida' && 
          (r.nota || 0) >= 7.0 &&
          (r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('medio') || r.aulas?.livros?.cursos?.nivel?.toLowerCase().includes('médio'))
        )
        .map(r => r.book_id)
      );

      setFinishedMediumCount(finishedMediumModules.size);
      const isFinished = fBasicCount >= 27;
      setIsBasicFinished(isFinished);

      // 6. Cursos - filtra pelo curso vinculado se existir, caso contrário busca todos
      const courseSelect = 'id, nome, nivel, livros(id, titulo, capa_url, ordem, curso_id, aulas(id, titulo, tipo, ordem, nucleo_id, versao, is_bloco_final, status_liberacao, data_liberacao, professor_active), cursos:curso_id(nivel))';
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
                // BLOQUEIO DE NÍVEL MÉDIO: Só libera se o básico estiver completo (27 módulos)
                const isMedium = (c.nivel || '').toLowerCase().includes('medio') || (c.nivel || '').toLowerCase().includes('médio');
                const levelLocked = isMedium && !isBasicFinished && !isStaff;

                // Regra de DP: Módulos em DP (3 reprovações)
                const isDP = !isStaff && resData.some(s => {
                  const sa = (l.aulas || []).find((pa: any) => pa.id === s.lesson_id);
                  const isEx = sa?.is_bloco_final || sa?.tipo === 'prova' || (sa?.titulo && /V[1-3]|RECUPERAÇ/i.test(sa.titulo));
                  return sa?.book_id === l.id && isEx && sa?.versao === 3 && s.status === 'corrigida' && (s.nota || 0) < 7.0;
                });

                // REQUISITO: O Módulo [N] é finalizado se:
                // 1. O aluno foi aprovado (nota >= 7.0)
                // 2. O aluno entrou em D.P. (reprovou na V3)
                const isApproved = resData.some(s => {
                  const isEx = s.is_bloco_final || s.lesson_type === 'prova';
                  return s.book_id === l.id && isEx && s.status === 'corrigida' && (s.nota || 0) >= 7.0;
                });
                const isFinished = isApproved || isDP;

                // REGRA DE PROGRESSÃO FLUIDA (Requisito 1)
                // O Módulo [N] é liberado se:
                // 1. É o primeiro módulo (bookOrdem === 1)
                // 2. O professor liberou manualmente este módulo (isManualModuleRelease)
                // 3. O professor liberou a PROVA V1 do módulo anterior [N-1]
                // 4. O módulo anterior [N-1] foi FINALIZADO (Aprovado ou D.P.)
                const isPreviousFinishedOrReleased = bookOrdem === 1 || Array.from(releasedExamBookIds).some(rid => {
                  const prevBook = sortedLivros.find((sl: any) => sl.id === rid);
                  // IMPORTANTE: O livro anterior deve pertencer a este mesmo curso
                  return prevBook && (prevBook.ordem === bookOrdem - 1) && (prevBook.curso_id === c.id);
                }) || sortedLivros.some((sl: any) => {
                  if (sl.ordem !== bookOrdem - 1) return false;
                  // Verifica se o anterior está finalizado no resData
                  return resData.some(s => {
                    const isEx = s.is_bloco_final || s.lesson_type === 'prova';
                    const passed = (s.nota || 0) >= 7.0;
                    const failedV3 = (s.nota || 0) < 7.0 && s.tentativas >= 3;
                    return s.book_id === sl.id && isEx && s.status === 'corrigida' && (passed || failedV3);
                  });
                });

                const isModuleReleased = (
                  isStaff || 
                  isManualModuleRelease || 
                  isPreviousFinishedOrReleased
                );

                const isReleased = isModuleReleased && !levelLocked;
                const isCurrent = (bookOrdem === pedagogicalLimit || isPreviousFinishedOrReleased) && !levelLocked;
                
                const isUnlocked = isReleased;

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
                    const v = a.versao || 1;
                    const isVideo = a.tipo === 'gravada' || a.tipo === 'ao_vivo' || a.tipo === 'video';
                    const isExam = a.tipo === 'prova' || !!a.is_bloco_final;
                    
                    // REQUISITO: Vídeos e Provas V1 sempre com trava manual (controle de presencialidade)
                    // Lições e Exercícios são automáticos assim que o módulo libera
                    const isManualType = isVideo || (isExam && v === 1);
                    const isRestrictedType = isManualType || (isExam && v > 1);
                    
                    if (isRestrictedType) {
                      let isItemReleased = false;

                      // Liberação manual para Provas V1, Vídeos ou Atividades específicas
                      isItemReleased = (releasedVideos.includes(a.id) || releasedAtividades.includes(a.id));
                      
                      // V2 e V3 são liberados automaticamente se o módulo estiver ativo
                      if (isExam && v > 1) {
                        lockedByProfessor = !isReleased;
                      } else {
                        // Vídeos e V1: Exigem liberação manual do professor (isItemReleased)
                        lockedByProfessor = !isReleased || !isItemReleased;
                      }
                    } else {
                      // Conteúdo nativo (Lições/Exercícios): Liberado se o módulo pai estiver liberado
                      lockedByProfessor = !isReleased;
                    }

                    let isHiddenItem = false;

                    if (!isStaff && (v === 2 || v === 3)) {
                      const prevV = v - 1;
                      const prevAula = (l.aulas || []).find((pa: any) => {
                        const isEx = pa.tipo === 'prova' || !!pa.is_bloco_final || (pa.titulo && /V[1-3]|RECUPERAÇ/i.test(pa.titulo));
                        return pa.versao === prevV && isEx;
                      });
                      const prevSub = resData.find((s: any) => s.lesson_id === prevAula?.id);
                      
                      // Regras para esconder Recuperação:
                      // 1. Se ainda não fez a anterior
                      // 2. Se a anterior ainda não foi corrigida
                      // 3. Se já passou na anterior ou em qualquer uma antes
                      const passedAnyPrevious = resData.some((s: any) => {
                        const sa = (l.aulas || []).find((pa: any) => pa.id === s.lesson_id);
                        const isEx = sa?.is_bloco_final || sa?.tipo === 'prova' || (sa?.titulo && /V[1-3]|RECUPERAÇ/i.test(sa.titulo));
                        return isEx && (sa?.versao || 0) < v && s.status === 'corrigida' && (s.nota || 0) >= 7.0;
                      });

                      if (!prevSub || prevSub.status !== 'corrigida' || passedAnyPrevious) {
                        isHiddenItem = true;
                      }
                    }

                    return { 
                      ...a, 
                      titulo: displayTitle, 
                      lockedByProfessor, 
                      isHidden: isHiddenItem,
                      status_liberacao: a.status_liberacao,
                      data_liberacao: a.data_liberacao,
                      professor_active: a.professor_active
                    };
                  }).map(a => {
                    // REGRA DE FILTRO NATIVO VS BLOQUEADO (Parte 4)
                    const isMediaOrExam = a.tipo === 'gravada' || a.tipo === 'ao_vivo' || a.tipo === 'video' || a.tipo === 'prova' || !!a.is_bloco_final;
                    if (isMediaOrExam && a.professor_active === false && !isStaff) {
                      return { ...a, isHidden: true };
                    }
                    return a;
                  }).filter((a: any) => !a.isHidden),
                  isReleased,
                  isCurrent: isCurrent && isReleased,
                  isUnlocked: isUnlocked && isReleased,
                  isFinished,
                  isApproved,
                  isDP: isDP
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
    finishedMediumCount,
    isBasicFinished
  };
};
