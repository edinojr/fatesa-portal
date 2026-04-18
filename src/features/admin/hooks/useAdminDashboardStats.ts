import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export const useAdminDashboardStats = () => {
  const [userCount, setUserCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingProofsCount, setPendingProofsCount] = useState(0);
  const [pendingDocsCount, setPendingDocsCount] = useState(0);
  const [pendingPaysCount, setPendingPaysCount] = useState(0);
  const [pendingStudentsCount, setPendingStudentsCount] = useState(0);
  const [pendingUsersByNucleo, setPendingUsersByNucleo] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [usersCount, coursesCount, docsCount, paysCount, proofsPending] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('cursos').select('id', { count: 'exact', head: true }),
        supabase.from('documentos').select('id', { count: 'exact', head: true }).not('url', 'is', null).filter('status', 'not.in', '(aprovado,rejeitado)'),
        supabase.from('pagamentos').select('id', { count: 'exact', head: true }).not('comprovante_url', 'is', null).filter('status', 'not.in', '(aprovado,rejeitado)'),
        supabase.from('respostas_aulas')
          .select('id, aulas!inner(is_bloco_final)', { count: 'exact', head: true })
          .is('nota', null)
          .eq('aulas.is_bloco_final', true)
      ]);

      setUserCount(usersCount.count || 0);
      setCourseCount(coursesCount.count || 0);
      
      const financeCount = (docsCount.count || 0) + (paysCount.count || 0);
      setPendingCount(financeCount);
      setPendingProofsCount(proofsPending.count || 0);
      setPendingDocsCount(docsCount.count || 0);
      setPendingPaysCount(paysCount.count || 0);

      const { count: studentsCount } = await supabase.from('users')
        .select('id', { count: 'exact', head: true })
        .or('acesso_definitivo.is.null,acesso_definitivo.eq.false');
      setPendingStudentsCount(studentsCount || 0);

      // Pending users per nucleus
      const { data: pendingUsersData } = await supabase.from('users').select('id, nucleo_id').or('acesso_definitivo.is.null,acesso_definitivo.eq.false');
      if (pendingUsersData) {
        const counts: Record<string, number> = {};
        pendingUsersData.forEach(u => {
          const nId = u.nucleo_id || 'none';
          counts[nId] = (counts[nId] || 0) + 1;
        });
        setPendingUsersByNucleo(counts);
      }

    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    userCount,
    courseCount,
    pendingCount,
    pendingProofsCount,
    pendingDocsCount,
    pendingPaysCount,
    pendingStudentsCount,
    pendingUsersByNucleo,
    loading,
    fetchStats
  };
};
