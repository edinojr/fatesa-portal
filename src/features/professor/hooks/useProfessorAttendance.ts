import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export const useProfessorAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttendance = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('frequencia')
        .select('*, aluno:users!aluno_id(nome)')
        .eq('professor_id', userId)
        .order('data', { ascending: false });
      if (data) setAttendanceRecords(data);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSaveAttendance = useCallback(async (records: any[], refreshFn: () => void) => {
    try {
      const { error } = await supabase.from('frequencia').upsert(records);
      if (error) throw error;
      await refreshFn();
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  }, []);

  return { attendanceRecords, loading, fetchAttendance, handleSaveAttendance };
};
