import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from './useProfile'
import { useAdminNavigation } from '../features/admin/hooks/useAdminNavigation'
import { useAdminDashboardStats } from '../features/admin/hooks/useAdminDashboardStats'
import { useAdminUsers } from '../features/admin/hooks/useAdminUsers'
import { useAdminContent } from '../features/admin/hooks/useAdminContent'
import { useAdminFinance } from '../features/admin/hooks/useAdminFinance'
import { useAdminAnalytics } from '../features/admin/hooks/useAdminAnalytics'
import { useAdminUIState } from '../features/admin/hooks/useAdminUIState'
import { useAdminActions } from '../features/admin/hooks/useAdminActions'

export const useAdminManagement = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  
  // 1. UI State & Navigation
  const ui = useAdminUIState();
  const nav = useAdminNavigation();

  // 2. Data Hooks
  const stats = useAdminDashboardStats();
  const users = useAdminUsers(ui.showToast);
  const content = useAdminContent(ui.showToast);
  const finance = useAdminFinance(ui.showToast);
  const analytics = useAdminAnalytics(ui.showToast);

  // 3. Global Actions
  const fetchData = useCallback(async () => {
    if (nav.activeTab === 'home') stats.fetchStats();
    if (nav.activeTab === 'users') users.fetchUsers();
    if (nav.activeTab === 'content') content.fetchCourses();
    if (nav.activeTab === 'finance') finance.fetchFinanceData();
    if (nav.activeTab === 'analytics') analytics.fetchAnalytics();
    if (nav.activeTab === 'reports') finance.fetchFinanceReport();
  }, [nav.activeTab, stats, users, content, finance, analytics]);

  const actions = useAdminActions(ui.showToast, fetchData);

  // 4. Initial Auth Guard
  useEffect(() => {
    if (!profileLoading) {
      if (!profile) {
        navigate('/login');
        return;
      }

      const roles = (profile.caminhos_acesso as string[]) || [];
      const isAdmin = ['admin', 'suporte'].includes(profile.tipo || '') || 
                      roles.some(r => ['admin', 'suporte'].includes(r)) || 
                      profile.email === 'edi.ben.jr@gmail.com';

      if (!isAdmin) {
        navigate('/dashboard');
        return;
      }
    }
  }, [profile, profileLoading, navigate]);

  // 5. Initial Data Fetch
  useEffect(() => {
    if (profile && !profileLoading) {
      fetchData();
    }
  }, [nav.activeTab, profile, profileLoading, fetchData]);

  // Return the unified interface (Bridge)
  return {
    ...ui,
    ...nav,
    ...stats,
    ...users,
    ...content,
    ...finance,
    ...analytics,
    ...actions,
    profile,
    userRole: profile?.tipo,
    availableRoles: profile?.caminhos_acesso || [profile?.tipo].filter(Boolean),
    fetchData,
    loading: profileLoading || stats.loading || users.loading || content.loading || finance.loading || analytics.loading
  };
};
