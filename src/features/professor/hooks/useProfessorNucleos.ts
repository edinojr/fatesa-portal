import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export const useProfessorNucleos = () => {
  const [professorNucleos, setProfessorNucleos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNucleos = useCallback(async (userId: string, isAdmin: boolean) => {
    setLoading(true);
    try {
      if (isAdmin) {
        const { data } = await supabase.from('nucleos').select('id, nome').order('nome');
        if (data) setProfessorNucleos(data);
      } else {
        const { data: myNucs } = await supabase
          .from('professor_nucleo')
          .select('nucleo_id, nucleos(id, nome)')
          .eq('professor_id', userId);
        
        if (myNucs) {
          const nucs = myNucs.filter((n: any) => n.nucleos).map((n: any) => n.nucleos);
          setProfessorNucleos([...nucs].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
        }
      }
    } catch (err) {
      console.error('Error fetching professor nucleos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { professorNucleos, loading, fetchNucleos };
};
