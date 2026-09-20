import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export const useProfessorAcademic = () => {
  const [academicReport, setAcademicReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAcademicReport = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1: Fetch submissions
      const [{ data: subDataRaw }, { data: manualDataRaw }] = await Promise.all([
        supabase
          .from('respostas_aulas')
          .select('id, nota, status, updated_at, created_at, aula_id, aluno_id')
          .order('updated_at', { ascending: false })
          .limit(100000),
        supabase
          .from('historico_notas')
          .select('id, aluno_id, curso_nome, modulo_nome, nota, data_conclusao, observacao, created_at, updated_at')
          .limit(100000)
      ]);

      if (!subDataRaw) return;

      const aulaIds = Array.from(new Set(subDataRaw.map(r => r.aula_id).filter(Boolean)));
      const alunoIds = Array.from(new Set([
        ...subDataRaw.map(r => r.aluno_id),
        ...(manualDataRaw || []).map(r => r.aluno_id)
      ].filter(Boolean)));

      const [aulasRes, usersRes] = await Promise.all([
        aulaIds.length > 0 
          ? supabase.from('aulas').select('id, titulo, is_bloco_final, tipo, livro_id(id, titulo)').in('id', aulaIds) 
          : Promise.resolve({ data: [] }),
        alunoIds.length > 0 
          ? supabase.from('users').select('id, nome, email, tipo, ano_graduacao, nucleos(id, nome)').in('id', alunoIds) 
          : Promise.resolve({ data: [] })
      ]);

      const aulasMap = (aulasRes.data || []).reduce((acc, a) => { acc[a.id] = a; return acc; }, {} as Record<string, any>);
      const usersMap = (usersRes.data || []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {} as Record<string, any>);

      const mapped = subDataRaw.map(r => ({
        ...r,
        aulas: aulasMap[r.aula_id] ? { ...aulasMap[r.aula_id], livros: aulasMap[r.aula_id].livro_id } : null,
        users: usersMap[r.aluno_id] || null
      }));

      const manualRecords = (manualDataRaw || []).map(r => ({
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
          livros: { id: null, titulo: r.modulo_nome, cursos: { id: null, nivel: r.curso_nome } }
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
      // Step 1: Fetch submissions for specific students
      const [{ data: subDataRaw }, { data: manualDataRaw }] = await Promise.all([
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
          .limit(100000)
      ]);

      if (!subDataRaw) return;

      const aulaIds = Array.from(new Set(subDataRaw.map(r => r.aula_id).filter(Boolean)));
      const alunoIds = Array.from(new Set([
        ...subDataRaw.map(r => r.aluno_id),
        ...(manualDataRaw || []).map(r => r.aluno_id)
      ].filter(Boolean)));

      const [aulasRes, usersRes] = await Promise.all([
        aulaIds.length > 0 
          ? supabase.from('aulas').select('id, titulo, is_bloco_final, tipo, livro_id(id, titulo)').in('id', aulaIds) 
          : Promise.resolve({ data: [] }),
        alunoIds.length > 0 
          ? supabase.from('users').select('id, nome, email, tipo, ano_graduacao, nucleos(id, nome)').in('id', alunoIds) 
          : Promise.resolve({ data: [] })
      ]);

      const aulasMap = (aulasRes.data || []).reduce((acc, a) => { acc[a.id] = a; return acc; }, {} as Record<string, any>);
      const usersMap = (usersRes.data || []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {} as Record<string, any>);

      const mapped = subDataRaw.map(r => ({
        ...r,
        aulas: aulasMap[r.aula_id] ? { ...aulasMap[r.aula_id], livros: aulasMap[r.aula_id].livro_id } : null,
        users: usersMap[r.aluno_id] || null
      }));

      const manualRecords = (manualDataRaw || []).map(r => ({
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
          livros: { id: null, titulo: r.modulo_nome, cursos: { id: null, nivel: r.curso_nome } }
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

  return { academicReport, loading, fetchAcademicHistory, fetchAcademicReport };
};
