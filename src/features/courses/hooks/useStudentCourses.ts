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

      // Lógica de isenção
      let nucleoIsento = false;
      if (profile.nucleo_id) {
        const { data: nucData } = await supabase.from('nucleos').select('isento').eq('id', profile.nucleo_id).maybeSingle();
        nucleoIsento = !!nucData?.isento;
      }
      const exemptStatus = profile.bolsista || isStaff || nucleoIsento;

      // Cálculo de liberação (Pagamentos + Provas)
      let releasedCount = 1;
      let courseBooks: any[] = [];
      
      if (profile.curso_id) {
        const { data: cb } = await supabase
          .from('livros')
          .select('id, ordem')
          .eq('curso_id', profile.curso_id)
          .order('ordem', { ascending: true });
        courseBooks = cb || [];
      }

      // Fetch releases first
      const { data: releases, error: relError } = await supabase
        .from('liberacoes_nucleo')
        .select('item_id, item_type, created_at')
        .eq('nucleo_id', profile.nucleo_id)
        .eq('liberado', true);
      
      if (relError) console.error('[Dashboard] Erro ao buscar liberações:', relError);

      const releasedModulos = (releases || []).filter(r => r.item_type === 'modulo').map(r => r.item_id);
      const releasedAtividades = (releases || []).filter(r => r.item_type === 'atividade').map(r => r.item_id);
      const releasedVideos = (releases || []).filter(r => r.item_type === 'video').map(r => r.item_id);

      // Limite Pedagógico Rigoroso: O aluno só acessa o módulo N+1 se o professor liberar a prova do módulo N
      const examReleaseDates: Record<string, string> = {};
      let maxReleasedExamOrdem = 0;

      const { data: exams } = await supabase
        .from('aulas')
        .select('id, livro_id, is_bloco_final')
        .or('tipo.eq.prova,is_bloco_final.eq.true');

      const releasedExamBookIds = new Set<string>();
      
      if (exams && releases) {
        exams.filter(exam => releasedAtividades.includes(exam.id)).forEach(exam => {
          releasedExamBookIds.add(exam.livro_id);
        });

        if (courseBooks) {
          courseBooks.forEach(b => {
            if (releasedExamBookIds.has(b.id) && b.ordem > maxReleasedExamOrdem) {
              maxReleasedExamOrdem = b.ordem;
            }
          });
        }

        exams.forEach(exam => {
          if (exam.is_bloco_final) {
            const rel = (releases as any[]).find(r => r.item_id === exam.id && r.item_type === 'atividade');
            if (rel) examReleaseDates[exam.livro_id] = rel.created_at;
          }
        });
      }

      const pedagogicalLimit = maxReleasedExamOrdem + 1;

      if (exemptStatus) {
        releasedCount = pedagogicalLimit; 
      } else {
        const { data: payRecords } = await supabase.from('pagamentos').select('status').eq('user_id', profile.id).eq('status', 'pago');
        const paidCount = payRecords?.length || 0;
        
        // Exige tanto financeiro quanto pedagógico para liberar
        releasedCount = Math.min(paidCount + 1, pedagogicalLimit);
      }

      // Buscar exceções individuais (liberações manuais do professor)
      const { data: exceptions } = await supabase
        .from('liberacoes_excecao')
        .select('livro_id')
        .eq('user_id', profile.id);
      
      const exceptionIds = (exceptions || []).map(e => e.livro_id);

      // Progresso e Notas - Removido filtro student_id que não existe no topo da view
      const [{ data: respostasRaw }, { data: progData }] = await Promise.all([
        supabase.from('view_submissions_detailed').select('*'),
        supabase.from('progresso').select('aula_id, concluida').eq('aluno_id', profile.id)
      ]);
      
      const resData = (respostasRaw || [])
        .filter((r: any) => r.users?.id === profile.id)
        .map((r: any) => ({ ...r, id: r.submission_id }));
      const userHasActivityInModule = (livroId: string) => {
        return resData.some(res => res.book_id === livroId);
      };

      setAtividades(resData);
      setProgressoAulas(progData || []);

      // Busca Cursos e mapeia liberação
      const { data: allCourses } = await supabase.from('cursos').select('id, nome, nivel, livros(*, aulas(*))');
      
      if (allCourses) {
        const mappedCourses: Course[] = allCourses.map((c: any) => {
          const sortedLivros = (c.livros || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
          return {
            id: c.id,
            nome: c.nome,
            livros: sortedLivros.map((l: any) => {
              const isCurrent = !isStaff && !exemptStatus && (l.ordem || 1) === releasedCount;

              // REGRA DE ACESSO POR DATA DE INGRESSO
              const examReleaseDate = examReleaseDates[l.id];
              const userCreatedAt = new Date(profile.created_at).getTime();
              const releaseTime = examReleaseDate ? new Date(examReleaseDate).getTime() : 0;
              
              // Se a prova foi liberada ANTES do aluno entrar, ele só acessa se tiver autorização ou já tiver feito algo
              const isPastModule = releaseTime > 0 && userCreatedAt > (releaseTime + 86400000); // 24h de tolerância
              const hasException = exceptionIds.includes(l.id);
              const hasStarted = userHasActivityInModule(l.id);
              
              const isHidden = isPastModule && !hasException && !hasStarted && !isStaff;

              const isReleased = (isStaff || (l.ordem || 1) <= releasedCount || releasedModulos.includes(l.id));

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
                    let displayTitle = a.titulo;
                    
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
