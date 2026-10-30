import { useState, useCallback } from 'react';
import { supabase, fetchAllRows } from '../../../lib/supabase';
import { areModuleTitlesEqual, getOfficialBookTitle, getOfficialBookIndex, LEGACY_AULA_TO_BOOK_TITLE } from '../../../lib/courseTitles';

export const useProfessorAcademic = () => {
  const [academicReport, setAcademicReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAcademicReport = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1: Fetch submissions, manual history and alumni official records (paginated to bypass 1000-row limit)
      const [{ data: subDataRaw }, { data: manualDataRaw }, { data: alumniDataRaw }] = await Promise.all([
        fetchAllRows((from, to) =>
          supabase
            .from('respostas_aulas')
            .select('id, nota, status, updated_at, created_at, aula_id, aluno_id')
            .order('updated_at', { ascending: false })
            .range(from, to)
        ),
        fetchAllRows((from, to) =>
          supabase
            .from('historico_notas')
            .select('id, aluno_id, curso_nome, modulo_nome, nota, data_conclusao, observacao, created_at, updated_at')
            .range(from, to)
        ),
        fetchAllRows((from, to) =>
          supabase
            .from('registros_alumni')
            .select('id, user_id, email, nome, curso, nivel_curso, historico')
            .range(from, to)
        )
      ]);

      if (!subDataRaw) return;

      const [aulasRes, livrosRes, usersRes] = await Promise.all([
        fetchAllRows((from, to) => supabase.from('aulas').select('id, titulo, is_bloco_final, tipo, livro_id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('livros').select('id, titulo, curso_id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('users').select('id, nome, email, tipo, ano_graduacao, nucleos(id, nome)').range(from, to))
      ]);

      const livrosMap = (livrosRes.data || []).reduce((acc, l) => { acc[l.id] = l; return acc; }, {} as Record<string, any>);
      const aulasMap = (aulasRes.data || []).reduce((acc, a) => {
        const livro = a.livro_id ? livrosMap[a.livro_id] : null;
        acc[a.id] = { ...a, livros: livro || null };
        return acc;
      }, {} as Record<string, any>);
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
              const existingIdx = mergedManualData.findIndex((m: any) => 
                m.aluno_id === targetUserId && areModuleTitlesEqual(m.modulo_nome, item.modulo)
              );
              if (existingIdx >= 0) {
                if (numNota > Number(mergedManualData[existingIdx].nota || 0)) {
                  mergedManualData[existingIdx].nota = numNota;
                }
              } else {
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
        let aula = aulasMap[r.aula_id];
        let livro = aula?.livros || (aula?.livro_id ? livrosMap[aula.livro_id] : null);
        let bookTitle = livro?.titulo || (r.aula_id && LEGACY_AULA_TO_BOOK_TITLE[r.aula_id]);
        if (!bookTitle && aula?.titulo) {
          bookTitle = getOfficialBookTitle(aula.titulo);
        }
        if (!bookTitle) {
          bookTitle = 'Módulo Geral';
        }
        const canonicalTitle = getOfficialBookTitle(bookTitle);
        const nivel = livro?.curso_id ? 'Teologia Básico' : (getOfficialBookIndex(canonicalTitle) < 27 ? 'Teologia Básico' : 'Teologia Médio');

        if (!aula) {
          aula = {
            id: r.aula_id,
            titulo: canonicalTitle,
            tipo: 'prova',
            livros: { id: r.aula_id, titulo: canonicalTitle, cursos: { nivel } }
          };
        } else {
          aula = {
            ...aula,
            livros: { id: livro?.id || r.aula_id, titulo: canonicalTitle, cursos: { nivel } }
          };
        }

        return {
          ...r,
          aulas: aula,
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
      // Step 1: Fetch submissions, manual history and alumni for specific students (paginated)
      const [{ data: subDataRaw }, { data: manualDataRaw }, { data: alumniDataRaw }, aulasRes, livrosRes, usersRes] = await Promise.all([
        fetchAllRows((from, to) =>
          supabase
            .from('respostas_aulas')
            .select('id, nota, status, updated_at, created_at, aula_id, aluno_id')
            .in('aluno_id', studentIds)
            .order('updated_at', { ascending: false })
            .range(from, to)
        ),
        fetchAllRows((from, to) =>
          supabase
            .from('historico_notas')
            .select('id, aluno_id, curso_nome, modulo_nome, nota, data_conclusao, observacao, created_at, updated_at')
            .in('aluno_id', studentIds)
            .range(from, to)
        ),
        fetchAllRows((from, to) =>
          supabase
            .from('registros_alumni')
            .select('id, user_id, email, nome, curso, nivel_curso, historico')
            .range(from, to)
        ),
        fetchAllRows((from, to) => supabase.from('aulas').select('id, titulo, is_bloco_final, tipo, livro_id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('livros').select('id, titulo, curso_id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('users').select('id, nome, email, tipo, ano_graduacao, nucleos(id, nome)').range(from, to))
      ]);

      if (!subDataRaw) return;

      const livrosMap = (livrosRes.data || []).reduce((acc: Record<string, any>, l: any) => { acc[l.id] = l; return acc; }, {} as Record<string, any>);
      const aulasMap = (aulasRes.data || []).reduce((acc: Record<string, any>, a: any) => {
        const livro = a.livro_id ? livrosMap[a.livro_id] : null;
        acc[a.id] = { ...a, livros: livro || null };
        return acc;
      }, {} as Record<string, any>);
      const usersMap = (usersRes.data || []).reduce((acc: Record<string, any>, u: any) => { acc[u.id] = u; return acc; }, {} as Record<string, any>);
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
              const existingIdx = mergedManualData.findIndex((m: any) => 
                m.aluno_id === targetUserId && areModuleTitlesEqual(m.modulo_nome, item.modulo)
              );
              if (existingIdx >= 0) {
                if (numNota > Number(mergedManualData[existingIdx].nota || 0)) {
                  mergedManualData[existingIdx].nota = numNota;
                }
              } else {
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
        let aula = aulasMap[r.aula_id];
        let livro = aula?.livros || (aula?.livro_id ? livrosMap[aula.livro_id] : null);
        let bookTitle = livro?.titulo || (r.aula_id && LEGACY_AULA_TO_BOOK_TITLE[r.aula_id]);
        if (!bookTitle && aula?.titulo) {
          bookTitle = getOfficialBookTitle(aula.titulo);
        }
        if (!bookTitle) {
          bookTitle = 'Módulo Geral';
        }
        const canonicalTitle = getOfficialBookTitle(bookTitle);
        const nivel = livro?.curso_id ? 'Teologia Básico' : (getOfficialBookIndex(canonicalTitle) < 27 ? 'Teologia Básico' : 'Teologia Médio');

        if (!aula) {
          aula = {
            id: r.aula_id,
            titulo: canonicalTitle,
            tipo: 'prova',
            livros: { id: r.aula_id, titulo: canonicalTitle, cursos: { nivel } }
          };
        } else {
          aula = {
            ...aula,
            livros: { id: livro?.id || r.aula_id, titulo: canonicalTitle, cursos: { nivel } }
          };
        }

        return {
          ...r,
          aulas: aula,
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
