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

  return {
    allStudents,
    setAllStudents: setSortedStudents,
    searchTerm,
    setSearchTerm,
    actionLoading,
    handleApproveAccess,
    handleRejectAccess,
    handleDeleteUser
  }
}
