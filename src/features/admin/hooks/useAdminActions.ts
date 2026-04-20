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

  const normalizeFileName = (name: string) => {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('save-settings');
    try {
      await Promise.all([
        supabase.from('configuracoes').upsert({ chave: 'pix_key', valor: pixKey }),
        supabase.from('configuracoes').upsert({ chave: 'pix_qr_url', valor: pixQrUrl })
      ]);
      showToast('Configurações salvas!');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUploadQrCode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading('upload-qr');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `pix_qr_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('public_assets').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('public_assets').getPublicUrl(data.path);
      setPixQrUrl(publicUrl);
      showToast('QR Code enviado!');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get('email') as string;
    const nome = formData.get('nome') as string;
    const tipo = formData.get('tipo') as string;
    const password = formData.get('password') as string;
    const nucleo_id = formData.get('nucleo_id') as string || null;

    setActionLoading('add-admin');
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome, tipo }
        }
      });

      if (authError) throw authError;

      if (authData.user && nucleo_id) {
        await supabase.from('users').update({ nucleo_id }).eq('id', authData.user.id);
      }

      showToast('Usuário criado com sucesso!');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, table: 'livros' | 'aulas', id: string, column: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading(id);
    try {
      const fileExt = file.name.split('.').pop();
      const cleanName = normalizeFileName(file.name.replace(`.${fileExt}`, ''));
      const fileName = `${cleanName}_${Date.now()}.${fileExt}`;
      const filePath = `${table}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('course-content').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from(table).update({ [column]: publicUrl }).eq('id', id);
      if (updateError) throw updateError;

      showToast('Arquivo enviado com sucesso!');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchUpload = async (files: FileList, parentId: string, libroId: string, blocoId: number | null, startOrder: number) => {
    setActionLoading('batch');
    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const cleanName = normalizeFileName(file.name.replace(`.${fileExt}`, ''));
        const fileName = `${cleanName}_${Date.now()}.${fileExt}`;
        const filePath = `aulas/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('course-content').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(filePath);
        
        return supabase.from('aulas').insert({
          titulo: file.name.replace(`.${fileExt}`, ''),
          tipo: 'material',
          livro_id: libroId,
          parent_aula_id: parentId,
          arquivo_url: publicUrl,
          ordem: startOrder + index,
          bloco_id: blocoId
        });
      });

      await Promise.all(uploadPromises);
      showToast(`${files.length} arquivos enviados com sucesso!`);
      fetchData();
    } catch (err: any) {
      showToast('Erro no upload em lote: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFileFinal = async (table: 'livros' | 'aulas', id: string, column: string) => {
    if (!window.confirm('Remover este arquivo permanentemente?')) return;
    setActionLoading(id);
    try {
      const { error } = await supabase.from(table).update({ [column]: null }).eq('id', id);
      if (error) throw error;
      showToast('Arquivo removido.');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualPayment = async (userId: string) => {
    if (!window.confirm('Confirmar pagamento manual e liberar acesso definitivo?')) return;
    setActionLoading(userId);
    try {
      await supabase.from('pagamentos').insert({
        user_id: userId,
        valor: 0,
        status: 'aprovado',
        feedback: 'Liberado manualmente pela administração'
      });
      await supabase.from('users').update({ acesso_definitivo: true }).eq('id', userId);
      showToast('Pagamento manual registrado e acesso liberado!');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteValidation = async (target: 'doc' | 'pay', id: string) => {
    if (!window.confirm('Excluir este registro de validação?')) return;
    setActionLoading(id);
    try {
      const table = target === 'pay' ? 'pagamentos' : 'documentos';
      await supabase.from(table).delete().eq('id', id);
      showToast('Registro excluído.');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!window.confirm('Excluir esta atividade permanentemente? O aluno poderá refazê-la.')) return;
    setActionLoading(submissionId);
    try {
      const { error } = await supabase.from('respostas_aulas').delete().eq('id', submissionId);
      if (error) throw error;
      showToast('Atividade excluída com sucesso.');
      fetchData();
    } catch (err: any) {
      showToast('Erro ao excluir: ' + err.message, 'error');
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
    normalizeFileName,
    handleSaveSettings,
    handleUploadQrCode,
    handleAddTeacher,
    handleAddAdmin,
    handleResetAutoCorrectedExams,
    handleFileUpload,
    handleBatchUpload,
    handleRemoveFileFinal,
    handleManualPayment,
    handleDeleteValidation,
    handleDeleteSubmission
  };
};
