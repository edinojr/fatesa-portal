import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { isUserAdmin } from '../../../lib/authUtils';

export const useCoordinatorData = (profile: any) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    presenceRate: 0,
    evasionAlerts: 0,
    approvalRate: 0
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCoordinatorDashboard = useCallback(async () => {
    setLoading(true);
    try {
      let targetNucleoId = profile?.nucleo_id;

      // Se for admin e não tiver nucleo_id vinculado, busca o primeiro polo cadastrado
      if (!targetNucleoId && isUserAdmin(profile)) {
        const { data: firstNuc } = await supabase
          .from('nucleos')
          .select('id, nome')
          .order('nome')
          .limit(1)
          .maybeSingle();
        if (firstNuc) {
          targetNucleoId = firstNuc.id;
        }
      }

      // Se não for admin e não tiver nucleo_id, encerra o carregamento com segurança
      if (!targetNucleoId && !isUserAdmin(profile)) {
        setLoading(false);
        return;
      }

      // 1. Fetch Students (Paginated) - exclude blocked users
      let studentQuery = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('bloqueado', false)
        .in('tipo', ['online', 'presencial']);

      if (targetNucleoId) {
        studentQuery = studentQuery.eq('nucleo_id', targetNucleoId);
      }

      const { data: studentData, count, error: studentError } = await studentQuery
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('nome', { ascending: true });

      if (studentError) throw studentError;
      setStudents(studentData || []);
      setTotalCount(count || 0);

      // 2. Calculate Metrics
      // Total Active
      let activeQuery = supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('bloqueado', false);
      if (targetNucleoId) {
        activeQuery = activeQuery.eq('nucleo_id', targetNucleoId);
      }
      const { count: activeCount } = await activeQuery;

      // Presence Rate (Last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let attQuery = supabase
        .from('frequencia')
        .select('status')
        .gte('data', thirtyDaysAgo.toISOString().split('T')[0]);
      if (targetNucleoId) {
        attQuery = attQuery.eq('nucleo_id', targetNucleoId);
      }
      const { data: attendanceData } = await attQuery;

      const totalAttendance = attendanceData?.length || 0;
      const presents = attendanceData?.filter(a => a.status === 'P').length || 0;
      const rate = totalAttendance > 0 ? (presents / totalAttendance) * 100 : 0;

      // Evasion Alerts (Students inactive for more than 15 days)
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const { data: recentProgress } = await supabase
        .from('progresso')
        .select('aluno_id')
        .gte('updated_at', fifteenDaysAgo.toISOString());
      
      const { data: recentSubmissions } = await supabase
        .from('respostas_aulas')
        .select('aluno_id')
        .gte('updated_at', fifteenDaysAgo.toISOString());
      
      const activeIds = new Set([
        ...(recentProgress?.map(i => i.aluno_id) || []),
        ...(recentSubmissions?.map(i => i.aluno_id) || [])
      ]);
      const evasionCount = (studentData || []).filter(s => !activeIds.has(s.id)).length;

      // Academic Success (Students with at least one approval >= 7.0)
      const { data: allSubmissions } = await supabase
        .from('respostas_aulas')
        .select('aluno_id, nota')
        .eq('status', 'corrigida')
        .gte('nota', 7.0);
      
      const approvedIds = new Set(allSubmissions?.map(s => s.aluno_id));
      const approvedCount = (studentData || []).filter(s => approvedIds.has(s.id)).length;
      const appRate = (studentData || []).length > 0 ? (approvedCount / (studentData || []).length) * 100 : 0;

      setMetrics({
        totalStudents: activeCount || 0,
        presenceRate: Math.round(rate),
        evasionAlerts: evasionCount,
        approvalRate: Math.round(appRate)
      });

    } catch (err) {
      console.error('Coordinator Data Error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.nucleo_id, profile, page, pageSize]);

  useEffect(() => {
    fetchCoordinatorDashboard();
  }, [fetchCoordinatorDashboard]);

  const saveBatchAttendance = async (attendanceList: { aluno_id: string, status: 'P' | 'F' }[]) => {
    if (!profile?.id || !profile?.nucleo_id) return { success: false };

    try {
      const records = attendanceList.map(a => ({
        ...a,
        professor_id: profile.id,
        nucleo_id: profile.nucleo_id,
        data: new Date().toISOString().split('T')[0]
      }));

      const { error } = await supabase
        .from('frequencia')
        .upsert(records, { onConflict: 'aluno_id,data' });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Batch Attendance Error:', err);
      return { success: false, error: err };
    }
  };

  return {
    students,
    loading,
    metrics,
    page,
    setPage,
    totalCount,
    pageSize,
    saveBatchAttendance,
    refresh: fetchCoordinatorDashboard
  };
};
