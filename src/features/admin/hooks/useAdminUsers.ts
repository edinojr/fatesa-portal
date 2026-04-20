import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

export const useAdminUsers = (showToast: (msg: string, type?: 'success' | 'error') => void) => {
  const [users, setUsers] = useState<any[]>([]);
  const [pendingActivityByNucleo, setPendingActivityByNucleo] = useState<Record<string, any>>({});
  const [allNucleos, setAllNucleos] = useState<any[]>([]);
  const [professors, setProfessors] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: usersData }, 
        { data: payIds },
        { data: nucleosData },
        { data: professorsData },
        { data: attendanceData }
      ] = await Promise.all([
        supabase.from('users').select('*, nucleos(nome)').order('nome'),
        supabase.from('pagamentos').select('user_id').not('comprovante_url', 'is', null).filter('status', 'not.in', '(aprovado,rejeitado)'),
        supabase.from('nucleos').select('*').order('nome'),
        supabase.from('users').select('*').eq('tipo', 'professor').order('nome'),
        supabase.from('frequencia').select('*, aluno:users!aluno_id(nome), professor:users!professor_id(nome), nucleo:nucleos(nome)').order('data', { ascending: false }).limit(200)
      ]);
      
      const pendingUserIds = new Set(payIds?.map(p => p.user_id) || []);

      if (usersData) {
        const enrichedUsers = usersData.map(u => ({
          ...u,
          hasPendingPayment: pendingUserIds.has(u.id)
        }));
        setUsers(enrichedUsers);
        
        const activity: Record<string, { students: number; payments: number }> = {};
        enrichedUsers.forEach(u => {
          const nId = u.nucleo_id || 'none';
          if (!activity[nId]) activity[nId] = { students: 0, payments: 0 };
          
          if (u.acesso_definitivo === false || u.acesso_definitivo === null) {
            activity[nId].students++;
          }
          if (u.hasPendingPayment) {
            activity[nId].payments++;
          }
        });
        setPendingActivityByNucleo(activity);
      }

      if (nucleosData) setAllNucleos(nucleosData);
      if (professorsData) setProfessors(professorsData);
      if (attendanceData) setAttendanceRecords(attendanceData);

    } catch (err: any) {
      showToast('Erro ao buscar dados de usuários: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleTypeChange = useCallback(async (userId: string, newType: string) => {
    try {
      await supabase.from('users').update({ tipo: newType }).eq('id', userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, tipo: newType } : u));
      showToast('Tipo de usuário atualizado.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  const handleApproveAccess = useCallback(async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase.from('users').update({ 
        acesso_definitivo: true,
        status_nucleo: 'aprovado'
      }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, acesso_definitivo: true } : u));
      showToast('Acesso definitivo concedido!');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  const handleToggleBlock = useCallback(async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase.from('users').update({ bloqueado: !currentStatus }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, bloqueado: !currentStatus } : u));
      showToast(`Usuário ${!currentStatus ? 'bloqueado' : 'desbloqueado'}!`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  const handleToggleGratuidade = useCallback(async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase.from('users').update({ bolsista: !currentStatus }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, bolsista: !currentStatus } : u));
      showToast(`Gratuidade ${!currentStatus ? 'ativada' : 'revogada'}!`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  const handleDeleteUser = useCallback(async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase.rpc('delete_user_entirely', { target_user_id: userId });
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast('Usuário excluído.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  const handleResetProgress = useCallback(async (userId: string) => {
    if (!window.confirm('ATENÇÃO: Deseja realmente resetar TODO o progresso e avaliações deste aluno?')) return;
    setActionLoading(userId);
    try {
      await supabase.from('respostas_aulas').delete().eq('aluno_id', userId);
      await supabase.from('progresso').delete().eq('aluno_id', userId);
      showToast('Atividades e progresso resetados.');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast, fetchUsers]);

  const handleUpdateUserNucleo = useCallback(async (userId: string, nucleoId: string) => {
    try {
      const nucleoObj = allNucleos.find(n => n.id === nucleoId);
      const nucleoNome = nucleoObj ? nucleoObj.nome : 'Sem Núcleo';
      const { error } = await supabase.from('users').update({ 
        nucleo_id: nucleoId || null,
        nucleo: nucleoId ? nucleoNome : null,
        status_nucleo: 'aprovado'
      }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { 
        ...u, 
        nucleo_id: nucleoId || null, 
        nucleo: nucleoId ? nucleoNome : null, 
        status_nucleo: 'aprovado',
        nucleos: nucleoId ? { nome: nucleoNome } : null
      } : u));
      showToast('Polo atualizado.');
    } catch(err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast, allNucleos]);

  const handleUpdateUserName = useCallback(async (userId: string, newName: string) => {
    if (!newName.trim()) return;
    setActionLoading(userId);
    try {
      const { error } = await supabase.from('users').update({ nome: newName }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, nome: newName } : u));
      showToast('Nome atualizado.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  const handleDeleteNucleo = useCallback(async (id: string) => {
    if (!window.confirm('Excluir este polo permanentemente?')) return;
    setActionLoading(id);
    try {
      const { error } = await supabase.from('nucleos').delete().eq('id', id);
      if (error) throw error;
      setAllNucleos(prev => prev.filter(n => n.id !== id));
      showToast('Polo excluído.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  return useMemo(() => ({
    users,
    pendingActivityByNucleo,
    allNucleos,
    professors,
    attendanceRecords,
    loading,
    actionLoading,
    fetchUsers,
    handleTypeChange,
    handleApproveAccess,
    handleToggleBlock,
    handleToggleGratuidade,
    handleDeleteUser,
    handleResetProgress,
    handleUpdateUserNucleo,
    handleUpdateUserName,
    handleDeleteNucleo
  }), [
    users,
    pendingActivityByNucleo,
    allNucleos,
    professors,
    attendanceRecords,
    loading,
    actionLoading,
    fetchUsers,
    handleTypeChange,
    handleApproveAccess,
    handleToggleBlock,
    handleToggleGratuidade,
    handleDeleteUser,
    handleResetProgress,
    handleUpdateUserNucleo,
    handleUpdateUserName,
    handleDeleteNucleo
  ]);
};
