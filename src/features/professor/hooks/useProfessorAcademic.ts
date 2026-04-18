import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export const useProfessorAcademic = () => {
  const [academicReport, setAcademicReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAcademicHistory = useCallback(async (studentIds: string[]) => {
    if (studentIds.length === 0) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('respostas_aulas')
        .select(`
          id, 
          nota, 
          status, 
          updated_at,
          aulas:aula_id ( id, titulo, is_bloco_final, livros ( id, titulo ) ), 
          users:aluno_id ( id, nome, email, tipo, ano_graduacao, nucleos ( id, nome ) )
        `)
        .in('aluno_id', studentIds)
        .not('nota', 'is', null)
        .order('updated_at', { ascending: false });
      if (data) setAcademicReport(data);
    } catch (err) {
      console.error('Error fetching academic history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { academicReport, loading, fetchAcademicHistory };
};
