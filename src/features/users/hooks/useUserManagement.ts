import { useState, useCallback } from 'react';
import { userService } from '../../../services/userService';

export const useUserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getAllUsers();
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNucleos = useCallback(async () => {
    try {
      const data = await userService.getAllNucleos();
      setNucleos(data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const updateUser = async (userId: string, updates: any) => {
    setActionLoading(userId);
    try {
      await userService.updateUser(userId, updates);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
      return { success: true };
    } catch (err: any) {
      return { error: err.message };
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await userService.deleteUserEntirely(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      return { success: true };
    } catch (err: any) {
      return { error: err.message };
    } finally {
      setActionLoading(null);
    }
  };

  const createSpecialUser = async (payload: any) => {
    setActionLoading('create-special');
    try {
      const { email, password, nome, tipo, additionalData } = payload;
      await userService.createSpecialUser(email, password, nome, tipo, additionalData);
      return { success: true };
    } catch (err: any) {
      return { error: err.message };
    } finally {
      setActionLoading(null);
    }
  };

  return {
    users,
    nucleos,
    loading,
    actionLoading,
    fetchUsers,
    fetchNucleos,
    updateUser,
    deleteUser,
    createSpecialUser
  };
};
