import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { areModuleTitlesEqual } from '../../../lib/courseTitles';

export const useAdminAnalytics = (showToast: (msg: string, type?: 'success' | 'error') => void) => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [academicReport, setAcademicReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const [
        totalCountRes,
        registeredCountRes,
        visitorCountRes,
        recentLogsRes
      ] = await Promise.all([
        // Total count (exact)
        supabase.from('portal_access_logs').select('*', { count: 'exact', head: true }),
        // Registered count (exact)
        supabase.from('portal_access_logs').select('*', { count: 'exact', head: true }).eq('user_type', 'registrado'),
        // Visitor count (exact)
        supabase.from('portal_access_logs').select('*', { count: 'exact', head: true }).eq('user_type', 'visitante'),
        // Recent logs for DAU and session analysis
        supabase.from('portal_access_logs').select('user_id, session_id, user_type, created_at').order('created_at', { ascending: false }).limit(10000)
      ]);

      // Pagination helper to bypass Supabase default row limit
      const fetchAllPages = async (table: string, selectQuery: string, extraFilters?: (q: any) => any) => {
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        while (true) {
          let q = supabase.from(table).select(selectQuery).range(from, from + step - 1);
          if (extraFilters) q = extraFilters(q);
          const { data, error } = await q;
          if (error) { console.error(`fetchAllPages(${table}) error:`, error); break; }
          if (!data || data.length === 0) break;
          allData = allData.concat(data);
          if (data.length < step) break;
          from += step;
        }
        return allData;
      };

      const totalViews = totalCountRes.count || 0;
      const registeredViews = registeredCountRes.count || 0;
      const visitorViews = visitorCountRes.count || 0;
      const recentData = recentLogsRes.data || [];
      const uniqueSessions = new Set(recentData.map((l: any) => l.session_id)).size;
      const dau = new Set(recentData.filter((l: any) => l.user_type === 'registrado' && l.created_at.startsWith(today)).map((l: any) => l.user_id)).size;
      const activeLast7 = new Set(recentData.filter((l: any) => new Date(l.created_at) > last7Days).map((l: any) => l.session_id)).size;
      setAnalyticsData({ totalViews, uniqueSessions, registeredViews, visitorViews, dau, activeLast7, logs: recentData.slice(0, 100) });

      // Step 1: Fetch base data without joins (joins can fail due to RLS)
      const [subDataRaw, manualDataRaw, alumniDataRaw, aulasData, usersData] = await Promise.all([
        fetchAllPages('respostas_aulas', 'id, nota, status, updated_at, created_at, aula_id, aluno_id'),
        fetchAllPages('historico_notas', 'id, aluno_id, curso_nome, modulo_nome, nota, data_conclusao, observacao, created_at, updated_at'),
        fetchAllPages('registros_alumni', 'id, user_id, nome, email, curso, historico'),
        fetchAllPages('aulas', 'id, titulo, is_bloco_final, tipo, min_grade, livro_id(id, titulo, curso_id(id, nivel))'),
        fetchAllPages('users', 'id, nome, email, tipo, nucleo_id, nucleos:nucleo_id(id, nome)')
      ]);

      // Step 2: Build lookup maps
      const aulasMap: Record<string, any> = aulasData.reduce((acc: any, a: any) => {
        const livro = Array.isArray(a.livro_id) ? a.livro_id[0] : a.livro_id;
        const curso = livro ? (Array.isArray(livro.curso_id) ? livro.curso_id[0] : livro.curso_id) : null;
        acc[a.id] = { ...a, livros: livro ? { ...livro, cursos: curso } : null };
        return acc;
      }, {});

      const usersMap: Record<string, any> = usersData.reduce((acc: any, u: any) => {
        const nucleo = Array.isArray(u.nucleos) ? u.nucleos[0] : u.nucleos;
        acc[u.id] = { ...u, nucleos: nucleo };
        return acc;
      }, {});

      // Mapear também por email para fallback
      const usersByEmailMap: Record<string, any> = {};
      usersData.forEach((u: any) => {
        if (u.email) {
          usersByEmailMap[u.email.toLowerCase().trim()] = u;
        }
      });

      // Mesclar notas de registros_alumni que não estejam em manualDataRaw
      const mergedManualData = [...manualDataRaw];
      (alumniDataRaw || []).forEach((al: any) => {
        const u = (al.user_id && usersMap[al.user_id]) || (al.email && usersByEmailMap[al.email.toLowerCase().trim()]);
        const targetUserId = u?.id || al.user_id || `alumni-${al.id}`;
        if (!usersMap[targetUserId]) {
          usersMap[targetUserId] = {
            id: targetUserId,
            nome: al.nome || 'Aluno Formado',
            email: al.email || '',
            tipo: 'ex_aluno',
            nucleos: { id: null, nome: al.nucleo || 'SEDE' }
          };
        }
        if (targetUserId && Array.isArray(al.historico)) {
          al.historico.forEach((item: any, idx: number) => {
            if (item && item.modulo && item.nota != null && String(item.nota).trim() !== '') {
              const numNota = parseFloat(String(item.nota).replace(',', '.'));
              if (isNaN(numNota)) return;
              const alreadyExists = mergedManualData.some((m: any) => 
                m.aluno_id === targetUserId && areModuleTitlesEqual(m.modulo_nome, item.modulo)
              );
              if (!alreadyExists) {
                mergedManualData.push({
                  id: `alumni-${al.id}-${idx}`,
                  aluno_id: targetUserId,
                  curso_nome: al.curso || 'Teologia Básico',
                  modulo_nome: item.modulo,
                  nota: numNota,
                  data_conclusao: item.data || new Date().toISOString(),
                  observacao: 'Histórico de formados',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }
            }
          });
        }
      });

      // Step 3: Map online records com fallback de aula
      const onlineRecords = subDataRaw.map((r: any) => {
        let aula = aulasMap[r.aula_id];
        if (!aula) {
          aula = {
            id: r.aula_id,
            titulo: 'Avaliação Online',
            tipo: 'prova',
            min_grade: 7,
            is_bloco_final: true,
            livros: { id: r.aula_id, titulo: 'Módulo Geral', cursos: { id: null, nivel: 'Teologia Básico' } }
          };
        }
        return {
          ...r,
          aulas: aula,
          users: usersMap[r.aluno_id] || null
        };
      });

      // Step 4: Map manual records vinculando livros reais quando possível
      const manualRecords = mergedManualData.map((r: any) => {
        const matchedAula = aulasData.find((a: any) => {
          const l = Array.isArray(a.livro_id) ? a.livro_id[0] : a.livro_id;
          return l && areModuleTitlesEqual(l.titulo, r.modulo_nome);
        });
        const matchedLivro = matchedAula ? (Array.isArray(matchedAula.livro_id) ? matchedAula.livro_id[0] : matchedAula.livro_id) : null;
        const bookId = matchedLivro?.id || r.modulo_nome;

        return {
          id: r.id,
          aluno_id: r.aluno_id,
          is_manual: true,
          nota: r.nota,
          status: 'corrigida',
          created_at: r.created_at,
          updated_at: r.updated_at,
          data_conclusao: r.data_conclusao,
          observacao: r.observacao,
          users: usersMap[r.aluno_id] || null,
          aulas: {
            id: matchedAula?.id || null,
            titulo: r.modulo_nome,
            tipo: 'prova',
            versao: 1,
            min_grade: 7,
            is_bloco_final: true,
            livros: { 
              id: bookId, 
              titulo: r.modulo_nome, 
              cursos: { id: null, nivel: r.curso_nome || 'Teologia Básico' } 
            }
          }
        };
      });

      // Step 5: Merge and filter out staff records
      const allRecords = [...onlineRecords, ...manualRecords].filter((item: any) => {
        const isStaff = item.users && ['admin', 'suporte', 'professor', 'colaborador'].includes(item.users?.tipo?.toLowerCase());
        return !isStaff;
      });

      setAcademicReport(allRecords);

    } catch (err: any) {
      console.error("fetchAnalytics error:", err);
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
