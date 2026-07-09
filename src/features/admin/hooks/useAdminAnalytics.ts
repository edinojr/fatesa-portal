import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

export const useAdminAnalytics = (showToast: (msg: string, type?: 'success' | 'error') => void) => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [academicReport, setAcademicReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [logsResponse, academicResponse, manualResponse] = await Promise.all([
        supabase.from('portal_access_logs').select('*').order('created_at', { ascending: false }).limit(5000),
        supabase.from('respostas_aulas').select(`
            *,
            users:aluno_id(id, nome, email, tipo, nucleos:nucleo_id(id, nome)),
            aulas:aula_id(id, titulo, tipo, versao, min_grade, livros:livro_id(id, titulo, cursos:curso_id(id, nivel)))
          `),
        supabase.from('historico_notas').select(`
            id, aluno_id, curso_nome, modulo_nome, nota, data_conclusao, observacao, created_at, updated_at,
            users:aluno_id(id, nome, email, tipo, nucleos:nucleo_id(id, nome))
          `)
      ]);

      if (logsResponse.data) {
        const data = logsResponse.data;
        const totalViews = data.length;
        const uniqueSessions = new Set(data.map(l => l.session_id)).size;
        const registeredViews = data.filter(l => l.user_type === 'registrado').length;
        const visitorViews = data.filter(l => l.user_type === 'visitante').length;
        const today = new Date().toISOString().split('T')[0];
        const dau = new Set(data.filter(l => l.user_type === 'registrado' && l.created_at.startsWith(today)).map(l => l.user_id)).size;
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const activeLast7 = new Set(data.filter(l => new Date(l.created_at) > last7Days).map(l => l.session_id)).size;

        setAnalyticsData({ totalViews, uniqueSessions, registeredViews, visitorViews, dau, activeLast7, logs: data.slice(0, 100) });
      }

      if (academicResponse.data) {
        const manualRecords = (manualResponse.data || []).map((r: any) => ({
          id: r.id,
          is_manual: true,
          nota: r.nota,
          status: 'corrigida',
          created_at: r.created_at,
          updated_at: r.updated_at,
          data_conclusao: r.data_conclusao,
          observacao: r.observacao,
          users: r.users,
          aulas: {
            id: null,
            titulo: r.modulo_nome,
            tipo: 'prova',
            versao: 1,
            min_grade: 7,
            is_bloco_final: true,
            livros: { id: null, titulo: r.modulo_nome, cursos: { id: null, nivel: r.curso_nome } }
          }
        }));
        setAcademicReport([...academicResponse.data, ...manualRecords]);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  return useMemo(() => ({ 
    analyticsData, 
    academicReport, 
    loading, 
    fetchAnalytics 
  }), [analyticsData, academicReport, loading, fetchAnalytics]);
};
