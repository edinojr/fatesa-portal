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
      const { data: courseBooks } = await supabase
        .from('livros')
        .select('id, ordem')
        .eq('curso_id', profile.curso_id || '')
        .order('ordem', { ascending: true });

      if (exemptStatus) {
        releasedCount = 999;
      } else {
        const { data: payRecords } = await supabase.from('pagamentos').select('status').eq('user_id', profile.id).eq('status', 'pago');
        const paidCount = payRecords?.length || 0;
        
        const { data: resExamSubmissions } = await supabase.from('respostas_aulas').select('aula_id, aulas(livro_id)').eq('aluno_id', profile.id).gte('tentativas', 1);
        const examSubmissions = (resExamSubmissions || []) as any[];
        const submittedBookIds = new Set(
          examSubmissions
            .map(s => {
              const aula = Array.isArray(s.aulas) ? s.aulas[0] : s.aulas;
              return aula?.livro_id;
            })
            .filter(id => !!id)
        );
        
        let maxSubmittedOrdem = 0;
        if (courseBooks) {
          courseBooks.forEach(b => {
            if (submittedBookIds.has(b.id) && b.ordem > maxSubmittedOrdem) maxSubmittedOrdem = b.ordem;
          });
        }
        releasedCount = Math.max(paidCount + 1, maxSubmittedOrdem + 1);
      }

      // Liberações por Núcleo (Professor releases)
      const { data: releases } = await supabase.from('liberacoes_nucleo').select('item_id, item_type').eq('nucleo_id', profile.nucleo_id).eq('liberado', true);
      const releasedModulos = (releases || []).filter(r => r.item_type === 'modulo').map(r => r.item_id);
      const releasedAtividades = (releases || []).filter(r => r.item_type === 'atividade').map(r => r.item_id);
      const releasedVideos = (releases || []).filter(r => r.item_type === 'video').map(r => r.item_id);

      // Progresso e Notas
      const [{ data: respostasData }, { data: progData }] = await Promise.all([
        supabase.from('respostas_aulas').select('id, status, nota, tentativas, aula_id, aulas(titulo, tipo, livro:livros(titulo, ordem))').eq('aluno_id', profile.id),
        supabase.from('progresso').select('aula_id, concluida').eq('aluno_id', profile.id)
      ]);
      
      const resData = respostasData || [];
      setAtividades(resData);
      setProgressoAulas(progData || []);

      // Busca Cursos e mapeia liberação
      const { data: allCourses } = await supabase.from('cursos').select('id, nome, livros(*, aulas(*))');
      
      if (allCourses) {
        const mappedCourses: Course[] = allCourses.map((c: any) => {
          const sortedLivros = (c.livros || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
          return {
            id: c.id,
            nome: c.nome,
            livros: sortedLivros.map((l: any) => {
              const professorReleased = isStaff || releasedModulos.includes(l.id);
              const isCurrent = !isStaff && !exemptStatus && (l.ordem || 1) === releasedCount;

              return {
                ...l,
                aulas: [...(l.aulas || [])]
                  .sort((a: any, b: any) => (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', { numeric: true, sensitivity: 'base' }))
                  .map((a: any) => {
                  if (isStaff) return { ...a, lockedByProfessor: false };
                  const matchesNucleo = !a.nucleo_id || a.nucleo_id === profile?.nucleo_id;
                  if (!matchesNucleo) return { ...a, isHidden: true };

                  let lockedByProfessor = false;
                  const isExercise = a.tipo === 'atividade' || a.tipo === 'prova';
                  const isVideo = a.tipo === 'gravada' || a.tipo === 'ao_vivo';

                  if (isExercise) lockedByProfessor = !releasedAtividades.includes(a.id);
                  if (isVideo) lockedByProfessor = !releasedVideos.includes(a.id);
                  if (!professorReleased) lockedByProfessor = true;

                  return { ...a, lockedByProfessor };
                }).filter((a: any) => !a.isHidden),
                isReleased: (isStaff || exemptStatus || (l.ordem || 1) <= releasedCount) && professorReleased,
                isCurrent: isCurrent && professorReleased
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
