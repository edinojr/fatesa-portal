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
        const { data: nucData } = await supabase.from('nucleos').select('isento').eq('id', profile.nucleo_id).single();
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

      if (exemptStatus) {
        releasedCount = 999;
      } else {
        const { data: payRecords } = await supabase.from('pagamentos').select('status').eq('user_id', profile.id).eq('status', 'pago');
        const paidCount = payRecords?.length || 0;
        
        // Release count based on Exams (tipo 'prova')
        const { data: resExamSubmissions } = await supabase
          .from('respostas_aulas')
          .select('aula_id, aulas(tipo, livro_id)')
          .eq('aluno_id', profile.id)
          .gte('tentativas', 1);
        
        const examSubmissions = (resExamSubmissions || []) as any[];
        const submittedExamBookIds = new Set(
          examSubmissions
            .filter(s => (Array.isArray(s.aulas) ? s.aulas[0]?.tipo : s.aulas?.tipo) === 'prova') // Only count exams for module release
            .map(s => {
              const aula = Array.isArray(s.aulas) ? s.aulas[0] : s.aulas;
              return aula?.livro_id;
            })
            .filter(id => !!id)
        );
        
        let maxExamOrdem = 0;
        if (courseBooks) {
          courseBooks.forEach(b => {
            if (submittedExamBookIds.has(b.id) && b.ordem > maxExamOrdem) maxExamOrdem = b.ordem;
          });
        }
        releasedCount = Math.max(paidCount + 1, maxExamOrdem + 1);
      }

      // Liberações por Polo: Consultamos apenas o que está vinculado ao Polo do aluno
      const { data: releases, error: relError } = await supabase
        .from('liberacoes_nucleo')
        .select('item_id, item_type')
        .eq('nucleo_id', profile.nucleo_id)
        .eq('liberado', true);
      
      if (relError) console.error('[Dashboard] Erro ao buscar liberações:', relError);

      const releasedModulos = (releases || []).filter(r => r.item_type === 'modulo').map(r => r.item_id);
      const releasedAtividades = (releases || []).filter(r => r.item_type === 'atividade').map(r => r.item_id);
      const releasedVideos = (releases || []).filter(r => r.item_type === 'video').map(r => r.item_id);

      if (releases && releases.length > 0) {
        console.log(`[Dashboard] ${releases.length} liberações vinculadas encontradas.`, { modulos: releasedModulos.length, videos: releasedVideos.length, atividades: releasedAtividades.length });
      } else {
        console.warn(`[Dashboard] Nenhuma ativação individual encontrada para seu Polo. Solicitando liberação ao professor...`);
      }

      // Progresso e Notas
      const [{ data: respostasData }, { data: progData }] = await Promise.all([
        supabase.from('respostas_aulas').select('id, status, nota, tentativas, aula_id, respostas, aulas(titulo, tipo, questionario, questionario_v2, questionario_v3, livro:livros(id, titulo, ordem))').eq('aluno_id', profile.id),
        supabase.from('progresso').select('aula_id, concluida').eq('aluno_id', profile.id)
      ]);
      
      const resData = respostasData || [];
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

              const isReleased = (isStaff || exemptStatus || (l.ordem || 1) <= releasedCount || releasedModulos.includes(l.id));

                return {
                  ...l,
                  aulas: [...(l.aulas || [])]
                    .sort((a: any, b: any) => (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', { numeric: true, sensitivity: 'base' }))
                    .map((a: any) => {
                    if (isStaff) return { ...a, lockedByProfessor: false };
                    
                    const matchesNucleo = !a.nucleo_id || a.nucleo_id === profile?.nucleo_id;
                    if (!matchesNucleo) return { ...a, isHidden: true };

                    let lockedByProfessor = false;
                    
                    // Apenas vídeos e provas finais exigem liberação manual do professor
                    const isRestrictedType = a.tipo === 'gravada' || a.tipo === 'ao_vivo' || a.tipo === 'video' || a.tipo === 'prova' || !!a.is_bloco_final;
                    
                    if (isRestrictedType) {
                      const title = a.titulo || '';
                      let isItemReleased = false;
                      if (title.toUpperCase().includes('V2')) {
                        // Automático se V1 reprovou e foi corrigida
                        const v1Sub = resData.find((s: any) => {
                          const aulaData = Array.isArray(s.aulas) ? s.aulas[0] : s.aulas;
                          return aulaData?.livro?.id === l.id && aulaData?.titulo?.toUpperCase().includes('V1');
                        });
                        const v1Reprovou = !!v1Sub && v1Sub.status === 'corrigida' && (v1Sub.nota || 0) < 7.0;
                        isItemReleased = v1Reprovou;
                      } else if (title.toUpperCase().includes('V3')) {
                        // Automático se V2 reprovou e foi corrigida
                        const v2Sub = resData.find((s: any) => {
                          const aulaData = Array.isArray(s.aulas) ? s.aulas[0] : s.aulas;
                          return aulaData?.livro?.id === l.id && aulaData?.titulo?.toUpperCase().includes('V2');
                        });
                        const v2Reprovou = !!v2Sub && v2Sub.status === 'corrigida' && (v2Sub.nota || 0) < 7.0;
                        isItemReleased = v2Reprovou;
                      } else {
                        // V1 ou Vídeo: Liberação manual
                        isItemReleased = (a.tipo === 'gravada' || a.tipo === 'ao_vivo' || a.tipo === 'video') 
                          ? releasedVideos.includes(a.id) 
                          : releasedAtividades.includes(a.id);
                      }
                      
                      // Conteúdo padrão é desbloqueado se o módulo pai estiver liberado
                      lockedByProfessor = !isReleased && !isItemReleased;
                    }

                    return { ...a, lockedByProfessor };
                  }).filter((a: any) => !a.isHidden),
                  isReleased,
                  isCurrent: isCurrent && isReleased
                };
            })
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
