import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type Tab = 'home' | 'nucleos' | 'content' | 'students' | 'grading' | 'avisos' | 'materiais' | 'attendance' | 'forum' | 'academic';

export const useProfessorNavigation = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab') as Tab;
    const validTabs: Tab[] = ['home', 'nucleos', 'content', 'students', 'grading', 'avisos', 'materiais', 'attendance', 'forum', 'academic'];
    return validTabs.includes(tab) ? tab : 'home';
  }, [searchParams]);

  const setActiveTab = useCallback((newTab: Tab) => {
    setSearchParams({ tab: newTab });
  }, [setSearchParams]);

  return {
    activeTab,
    setActiveTab,
    searchParams
  };
};
