import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { areModuleTitlesEqual } from '../../../lib/courseTitles';

export const useProfessorAcademic = () => {
  const [academicReport, setAcademicReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAcademicReport = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1: Fetch submissions, manual history and alumni official records
      const [{ data: subDataRaw }, { data: manualDataRaw }, { data: alumniDataRaw }] = await Promise.all([
        supabase
          .from('respostas_aulas')
          .select('id, nota, status, updated_at, created_at, aula_id, aluno_id')
          .order('updated_at', { ascending: false })
          .limit(100000),
        supabase
          .from('historico_notas')
          .select('id, aluno_id, curso_nome, modulo_nome, nota, data_conclusao, observacao, created_at, updated_at')
          .limit(100000),
        supabase
          .from('registros_alumni')
          .select('id, user_id, email, nome, curso, nivel_curso, historico')
          .limit(100000)
      ]);

      if (!subDataRaw) return;

      const [aulasRes, usersRes] = await Promise.all([
        supabase.from('aulas').select('id, titulo, is_bloco_final, tipo, livro_id(id, titulo)').limit(5000),
        supabase.from('users').select('id, nome, email, tipo, ano_graduacao, nucleos(id, nome)').limit(5000)
      ]);

      const aulasMap = (aulasRes.data || []).reduce((acc, a) => { acc[a.id] = a; return acc; }, {} as Record<string, any>);
      const usersMap = (usersRes.data || []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {} as Record<string, any>);
      const usersByEmailMap: Record<string, any> = {};
      (usersRes.data || []).forEach((u: any) => {
        if (u.email) {
          usersByEmailMap[u.email.toLowerCase().trim()] = u;
        }
      });

      // Mesclar notas de registros_alumni com histórico manual
      const mergedManualData = [...(manualDataRaw || [])];
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
                  observacao: 'Histórico oficial de formados',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }
            }
          });
        }
      });

      const mapped = subDataRaw.map(r => {
        const aula = aulasMap[r.aula_id] || {
          id: r.aula_id,
          titulo: 'Avaliação Online',
          tipo: 'prova',
          livro_id: { id: r.aula_id, titulo: 'Módulo Geral' }
        };
        return {
          ...r,
          aulas: { ...aula, livros: aula.livro_id },
          users: usersMap[r.aluno_id] || null
        };
      });

      const manualRecords = mergedManualData.map(r => ({
        id: r.id,
        is_manual: true,
        nota: r.nota,
        status: 'corrigida',
        created_at: r.created_at,
        updated_at: r.updated_at,
        data_conclusao: r.data_conclusao,
        observacao: r.observacao,
        users: usersMap[r.aluno_id] || null,
        aulas: {
          id: null,
          titulo: r.modulo_nome,
          tipo: 'prova',
          versao: 1,
          min_grade: 7,
          is_bloco_final: true,
          livros: { id: r.modulo_nome, titulo: r.modulo_nome, cursos: { id: null, nivel: r.curso_nome } }
        }
      }));

      const allRecords = [...mapped, ...manualRecords].filter(item => {
        const isStaff = item.users && ['admin', 'suporte', 'professor', 'colaborador'].includes(item.users.tipo?.toLowerCase());
        return !isStaff;
      });

      setAcademicReport(allRecords);
    } catch (err) {
      console.error('Error fetching academic report:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAcademicHistory = useCallback(async (studentIds: string[]) => {
    if (studentIds.length === 0) return;
    setLoading(true);
    try {
      // Step 1: Fetch submissions, manual history and alumni for specific students
      const [{ data: subDataRaw }, { data: manualDataRaw }, { data: alumniDataRaw }, aulasRes, usersRes] = await Promise.all([
        supabase
          .from('respostas_aulas')
          .select('id, nota, status, updated_at, created_at, aula_id, aluno_id')
          .in('aluno_id', studentIds)
          .order('updated_at', { ascending: false })
          .limit(100000),
        supabase
          .from('historico_notas')
          .select('id, aluno_id, curso_nome, modulo_nome, nota, data_conclusao, observacao, created_at, updated_at')
          .in('aluno_id', studentIds)
          .limit(100000),
        supabase
          .from('registros_alumni')
          .select('id, user_id, email, nome, curso, nivel_curso, historico')
          .limit(100000),
        supabase.from('aulas').select('id, titulo, is_bloco_final, tipo, livro_id(id, titulo)').limit(5000),
        supabase.from('users').select('id, nome, email, tipo, ano_graduacao, nucleos(id, nome)').limit(5000)
      ]);

      if (!subDataRaw) return;

      const aulasMap = (aulasRes.data || []).reduce((acc, a) => { acc[a.id] = a; return acc; }, {} as Record<string, any>);
      const usersMap = (usersRes.data || []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {} as Record<string, any>);
      const usersByEmailMap: Record<string, any> = {};
      (usersRes.data || []).forEach((u: any) => {
        if (u.email) {
          usersByEmailMap[u.email.toLowerCase().trim()] = u;
        }
      });

      // Mesclar notas de registros_alumni
      const mergedManualData = [...(manualDataRaw || [])];
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
        if (targetUserId && studentIds.includes(targetUserId) && Array.isArray(al.historico)) {
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
                  observacao: 'Histórico oficial de formados',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }
            }
          });
        }
      });

      const mapped = subDataRaw.map(r => {
        const aula = aulasMap[r.aula_id] || {
          id: r.aula_id,
          titulo: 'Avaliação Online',
          tipo: 'prova',
          livro_id: { id: r.aula_id, titulo: 'Módulo Geral' }
        };
        return {
          ...r,
          aulas: { ...aula, livros: aula.livro_id },
          users: usersMap[r.aluno_id] || null
        };
      });

      const manualRecords = mergedManualData.map(r => ({
        id: r.id,
        is_manual: true,
        nota: r.nota,
        status: 'corrigida',
        created_at: r.created_at,
        updated_at: r.updated_at,
        data_conclusao: r.data_conclusao,
        observacao: r.observacao,
        users: usersMap[r.aluno_id] || null,
        aulas: {
          id: null,
          titulo: r.modulo_nome,
          tipo: 'prova',
          versao: 1,
          min_grade: 7,
          is_bloco_final: true,
          livros: { id: r.modulo_nome, titulo: r.modulo_nome, cursos: { id: null, nivel: r.curso_nome } }
        }
      }));

      const allRecords = [...mapped, ...manualRecords].filter(item => {
        const isStaff = item.users && ['admin', 'suporte', 'professor', 'colaborador'].includes(item.users.tipo?.toLowerCase());
        return !isStaff;
      });

      setAcademicReport(allRecords);
    } catch (err) {
      console.error('Error fetching academic history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    academicReport,
    loading,
    fetchAcademicReport,
    fetchAcademicHistory
  };
};
