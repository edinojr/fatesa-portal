import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type Tab = 'home' | 'users' | 'alumni' | 'content' | 'nucleos' | 'settings' | 'finance' | 'forum' | 'attendance' | 'professors' | 'analytics' | 'reports' | 'docs_archive' | 'academic';

export const useAdminNavigation = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab') as Tab;
    const validTabs: Tab[] = ['home', 'users', 'alumni', 'content', 'nucleos', 'settings', 'finance', 'forum', 'attendance', 'professors', 'analytics', 'reports', 'docs_archive', 'academic'];
    return validTabs.includes(tab) ? tab : 'home';
  }, [searchParams]);

  const dashboardView = useMemo(() => (searchParams.get('view') || 'main') as 'main' | 'users' | 'admin_tools', [searchParams]);
  const userTypeFilter = useMemo(() => searchParams.get('filter'), [searchParams]);

  const updateParams = useCallback((newParams: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null) params.delete(key);
        else params.set(key, value);
      });
      return params;
    });
  }, [setSearchParams]);

  const setActiveTab = useCallback((newTab: Tab) => {
    updateParams({ tab: newTab, view: 'main', filter: null, courseId: null, bookId: null, lessonId: null });
  }, [updateParams]);

  const setDashboardView = useCallback((view: string) => updateParams({ view }), [updateParams]);
  const setUserTypeFilter = useCallback((filter: string | null) => updateParams({ filter }), [updateParams]);

  return useMemo(() => ({
    activeTab,
    dashboardView,
    userTypeFilter,
    setActiveTab,
    setDashboardView,
    setUserTypeFilter,
    updateParams,
    searchParams
  }), [
    activeTab,
    dashboardView,
    userTypeFilter,
    setActiveTab,
    setDashboardView,
    setUserTypeFilter,
    updateParams,
    searchParams
  ]);
};
