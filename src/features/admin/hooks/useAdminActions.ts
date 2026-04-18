import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export const useAdminActions = (showToast: (msg: string, type?: 'success' | 'error') => void, fetchData: () => void) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pixKey, setPixKey] = useState('');
  const [pixQrUrl, setPixQrUrl] = useState('');
  
  // Teacher/Admin Management States
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherNome, setNewTeacherNome] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');

  const handleSaveSettings = async (currentPixKey: string, currentPixQrUrl: string) => {
    setActionLoading('save-settings');
    try {
      await Promise.all([
        supabase.from('configuracoes').upsert({ chave: 'pix_key', valor: currentPixKey }),
        supabase.from('configuracoes').upsert({ chave: 'pix_qr_url', valor: currentPixQrUrl })
      ]);
      showToast('Configurações salvas!');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddTeacher = async () => {
    if (!newTeacherEmail || !newTeacherNome) return;
    setActionLoading('add-teacher');
    try {
      const { error } = await supabase.from('professores_autorizados').insert({ email: newTeacherEmail, nome: newTeacherNome });
      if (error) throw error;
      showToast('Professor autorizado!');
      setNewTeacherEmail('');
      setNewTeacherNome('');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddAdmin = async (email: string) => {
    setActionLoading('add-admin');
    try {
      const { error } = await supabase.from('admins_autorizados').insert({ email });
      if (error) throw error;
      showToast('Administrador autorizado!');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetAutoCorrectedExams = async () => {
    if (!window.confirm('Resetar todas as notas automáticas?')) return;
    setActionLoading('reset-exams');
    try {
      const { error } = await supabase.from('respostas_aulas').update({ nota: null, status: 'pendente' }).is('feedback', null);
      if (error) throw error;
      showToast('Notas resetadas.');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return {
    actionLoading,
    setActionLoading,
    pixKey, setPixKey,
    pixQrUrl, setPixQrUrl,
    newTeacherEmail, setNewTeacherEmail,
    newTeacherNome, setNewTeacherNome,
    newTeacherPassword, setNewTeacherPassword,
    handleSaveSettings,
    handleAddTeacher,
    handleAddAdmin,
    handleResetAutoCorrectedExams
  };
};
