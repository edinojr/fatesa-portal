import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { Student } from '../../../types/professor'

export const useProfessorStudents = () => {
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const setSortedStudents = useCallback((data: Student[]) => {
    const sorted = [...data].sort((a, b) => {
      const nameA = a.nome || ''
      const nameB = b.nome || ''
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' })
    })
    setAllStudents(sorted)
  }, [])

  const handleApproveAccess = async (userId: string, onSuccess?: () => void) => {
    setActionLoading(userId)
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          status_nucleo: 'aprovado',
          acesso_definitivo: true 
        })
        .eq('id', userId)
      
      if (error) throw error
      alert('Acesso aprovado com sucesso!')
      if (onSuccess) onSuccess()
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectAccess = async (userId: string, onSuccess?: () => void) => {
    if (!confirm('Deseja realmente recusar o acesso deste aluno?')) return
    setActionLoading(userId)
    try {
      const { error } = await supabase
        .from('users')
        .update({ status_nucleo: 'recusado' })
        .eq('id', userId)
      
      if (error) throw error
      alert('Acesso recusado.')
      if (onSuccess) onSuccess()
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetProgress = async (userId: string, onSuccess?: () => void) => {
    if (!window.confirm('ATENÇÃO: Deseja realmente resetar TODO o progresso e todas as avaliações deste aluno? Esta ação removerá permanentemente todas as notas, respostas e aulas concluídas.')) return;
    
    setActionLoading(userId);
    try {
      const { error: errorRes } = await supabase.from('respostas_aulas').delete().eq('aluno_id', userId);
      if (errorRes) throw errorRes;
      
      const { error: errorProg } = await supabase.from('progresso').delete().eq('aluno_id', userId);
      if (errorProg) throw errorProg;
      
      alert('Progresso e atividades resetados com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Erro ao resetar progresso: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  }

  const handleDeleteUser = async (userId: string, onSuccess?: () => void) => {
    if (!confirm('Deseja realmente EXCLUIR este aluno permanentemente? Esta ação não pode ser desfeita.')) return
    setActionLoading(userId)
    try {
      const { error } = await supabase.rpc('delete_user_entirely', { target_user_id: userId })
      if (error) throw error
      alert('Aluno excluído com sucesso.')
      if (onSuccess) onSuccess()
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateUserNucleo = async (userId: string, nucleoId: string, nucleoNome: string, onSuccess?: () => void) => {
    if (!confirm(`Deseja realmente trocar o núcleo deste aluno para "${nucleoNome}"?`)) return;
    
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          nucleo_id: nucleoId || null,
          nucleo: nucleoNome || null,
          status_nucleo: 'aprovado'
        })
        .eq('id', userId);
      
      if (error) throw error;
      alert('Núcleo atualizado com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Erro ao atualizar núcleo: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  }

  const handleUpdateUserType = async (userId: string, newType: string, onSuccess?: () => void) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ tipo: newType })
        .eq('id', userId);
      
      if (error) throw error;
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Erro ao atualizar tipo: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  }

  const handleGrantModuleException = async (userId: string, bookId: string, onSuccess?: () => void) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('liberacoes_excecao')
        .upsert({ user_id: userId, livro_id: bookId }, { onConflict: 'user_id,livro_id' });
      
      if (error) throw error;

      // Release apenas avaliações V1 (V2/V3 dependem de reprovação anterior)
      const { data: avaliacoes } = await supabase
        .from('aulas')
        .select('id, tipo, versao, is_bloco_final')
        .eq('livro_id', bookId)
        .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true');

      const v1Items = (avaliacoes || []).filter(a => {
        if (a.is_bloco_final) return true;
        const v = a.versao;
        if (v == null) return true;
        return Number(v) === 1;
      });

      if (v1Items.length > 0) {
        const { error: examErr } = await supabase
          .from('liberacoes_excecao_atividade')
          .upsert(v1Items.map(a => ({
            user_id: userId,
            aula_id: a.id
          })), { onConflict: 'user_id,aula_id' });
        if (examErr && examErr.code !== '23505') throw examErr;
      }

      alert('Módulo liberado com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Erro ao liberar módulo: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  }

  const handleRevokeModuleException = async (userId: string, bookId: string, onSuccess?: () => void) => {
    setActionLoading(userId);
    try {
      // Remove module exception
      const { error: modErr } = await supabase
        .from('liberacoes_excecao')
        .delete()
        .eq('user_id', userId)
        .eq('livro_id', bookId);
      if (modErr) throw modErr;

      // Remove V1 assessment releases for this module
      const { data: avaliacoes } = await supabase
        .from('aulas')
        .select('id')
        .eq('livro_id', bookId)
        .or('tipo.eq.prova,tipo.eq.avaliacao,is_bloco_final.eq.true');

      if (avaliacoes && avaliacoes.length > 0) {
        const { error: examErr } = await supabase
          .from('liberacoes_excecao_atividade')
          .delete()
          .eq('user_id', userId)
          .in('aula_id', avaliacoes.map(a => a.id));
        if (examErr) throw examErr;
      }

      alert('Liberação de módulo revogada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Erro ao revogar liberação: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  }

  return {
    allStudents,
    setAllStudents: setSortedStudents,
    searchTerm,
    setSearchTerm,
    actionLoading,
    handleApproveAccess,
    handleRejectAccess,
    handleDeleteUser,
    handleResetProgress,
    handleUpdateUserNucleo,
    handleUpdateUserType,
    handleGrantModuleException,
    handleRevokeModuleException
  }
}
