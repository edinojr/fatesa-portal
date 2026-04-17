import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Course } from '../../../types/dashboard';


export const useStudentCourses = (profile: any) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressoAulas, setProgressoAulas] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

      // 2. Livros do Curso
      const { data: courseBooks } = await supabase.from('livros').select('id, ordem').eq('curso_id', profile.curso_id).order('ordem');
      
      // 3. Liberações do Núcleo
      const { data: releases } = await supabase.from('liberacoes_nucleo').select('item_id, item_type, created_at').eq('nucleo_id', profile.nucleo_id).eq('liberado', true);
       
      const releasedModulos = (releases || []).filter(r => r.item_type === 'modulo').map(r => r.item_id);
      const releasedAtividades = (releases || []).filter(r => r.item_type === 'atividade').map(r => r.item_id);
      const releasedVideos = (releases || []).filter(r => r.item_type === 'video').map(r => r.item_id);
      
      // 4. Provas / Atividades do Professor
      const { data: exams } = await supabase.from('aulas').select('id, livro_id, is_bloco_final, tipo').or('tipo.eq.prova,is_bloco_final.eq.true');

      const exemptStatus = profile.bolsista || isStaff || nucleoIsento;

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

      // Módulo Vigente: O maior módulo liberado manualmente pelo professor
      let maxReleasedModuleOrdem = 0;
      if (courseBooks && releases) {
        courseBooks.forEach(b => {
          if (releasedModulos.includes(b.id) && (b.ordem || 0) > maxReleasedModuleOrdem) {
            maxReleasedModuleOrdem = b.ordem;
          }
        });
      }

      const pedagogicalLimit = maxReleasedModuleOrdem > 0 ? maxReleasedModuleOrdem : 1;

      if (exams && releases) {
        exams.forEach(exam => {
          if (exam.is_bloco_final) {
            const rel = (releases as any[]).find(r => r.item_id === exam.id && r.item_type === 'atividade');
            if (rel) examReleaseDates[exam.livro_id] = rel.created_at;
          }
        });
      }



      if (exemptStatus) {
        releasedCount = pedagogicalLimit; 
      } else {
        const { data: payRecords } = await supabase.from('pagamentos').select('status').eq('user_id', profile.id).eq('status', 'pago');
        const paidCount = payRecords?.length || 0;
        
        // Exige tanto financeiro quanto pedagógico para liberar
        releasedCount = Math.min(paidCount + 1, pedagogicalLimit);
      }

      // 5. Progresso e Notas
      const { data: resDataRaw } = await supabase.from('view_submissions_detailed').select('*').eq('student_id', profile.id);
      const resData = (resDataRaw || []).map((r: any) => ({ ...r, id: r.submission_id }));
      
      const { data: progData } = await supabase.from('progresso').select('aula_id, concluida').eq('aluno_id', profile.id);
      const { data: exceptions } = await supabase.from('liberacoes_excecao').select('livro_id').eq('user_id', profile.id);
      
      const exceptionIds = (exceptions || []).map(e => e.livro_id);
      const userHasActivityInModule = (livroId: string) => {
        return resData.some(res => res.book_id === livroId);
      };

      setAtividades(resData);
      setProgressoAulas(progData || []);

      // 6. Cursos
      const { data: allCourses } = await supabase.from('cursos').select('id, nome, nivel, livros(id, titulo, capa_url, ordem, curso_id, aulas(id, titulo, tipo, ordem, nucleo_id, versao, is_bloco_final))');
      
      if (allCourses) {
        const mappedCourses: Course[] = allCourses.map((c: any) => {
          const sortedLivros = (c.livros || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
          return {
            id: c.id,
            nome: c.nome,
            livros: sortedLivros.map((l: any) => {
              const bookOrdem = l.ordem || 1;
              const isManualModuleRelease = releasedModulos.includes(l.id);
              const isReleased = (
                isStaff || 
                (isManualModuleRelease && (exemptStatus || bookOrdem <= releasedCount || bookOrdem === pedagogicalLimit))
              );
              const isCurrent = !isStaff && !exemptStatus && (bookOrdem === pedagogicalLimit);

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
                    
                    const matchesNucleo = !a.nucleo_id || a.nucleo_id === profile?.nucleo_id;
                    if (!matchesNucleo) return { ...a, isHidden: true };

                    let lockedByProfessor = false;
                    const displayTitle = a.titulo || '';
                    
                    // Apenas vídeos e provas finais exigem liberação manual do professor
                    const isRestrictedType = a.tipo === 'gravada' || a.tipo === 'ao_vivo' || a.tipo === 'video' || a.tipo === 'prova' || !!a.is_bloco_final;
                    
                    if (isRestrictedType) {
                      let isItemReleased = false;

                      // Liberação manual para Provas ou Vídeos restritos
                      isItemReleased = (a.tipo === 'gravada' || a.tipo === 'ao_vivo' || a.tipo === 'video' || a.tipo === 'prova' || !!a.is_bloco_final) 
                        ? (releasedVideos.includes(a.id) || releasedAtividades.includes(a.id) || (a.tipo === 'prova' && releasedExamBookIds.has(l.id)))
                        : true;
                      
                      // Conteúdo padrão é desbloqueado se o módulo pai estiver liberado (ou manual se restrito)
                      lockedByProfessor = !isReleased && !isItemReleased;
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
        }).filter((c: any) => c.livros.length > 0);
        setCourses(mappedCourses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  return {
    courses,
    progressoAulas,
    atividades,
    loading,
    fetchStudentDashboardData
  };
};
