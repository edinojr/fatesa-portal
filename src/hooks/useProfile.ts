import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { checkAccessStatus } from '../lib/paymentCycle';

// Global cache to prevent race conditions (5000ms Lock error) when multiple components mount
let globalProfilePromise: Promise<any> | null = null;
let lastFetchTime = 0;

export const useProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        navigate('/login', { replace: true });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) fetchProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (forceRefresh = false) => {
    // If there's an ongoing request or a very recent cache (within 2 seconds), reuse it
    if (!forceRefresh && globalProfilePromise && (Date.now() - lastFetchTime < 2000)) {
      try {
        const cachedProfile = await globalProfilePromise;
        setProfile(cachedProfile);
        setLoading(false);
        return;
      } catch (e) {
        // Fallthrough if the cached promise failed
      }
    }

    const loadProfileTask = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        // Se não houver sessão, apenas setamos loading false e deixamos o ProtectedRoute decidir
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          nucleos(nome),
          pagamentos (*)
        `)
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Database Profile Error:', error);
        throw error;
      }

      if (!data) {
        console.warn('Profile not found for authenticated user, applying fallback/mock.');
        // Special case: User authenticated in Auth but no record in Public.users
        // Bypass de Segurança: O usuário solicitou entrada administrativa forçada.
        // Aviso: Qualquer nova conta sem registro no banco público assumirá privilégios de Admin.
        setProfile({ id: session.user.id, email: session.user.email, tipo: 'admin', caminhos_acesso: ['admin'], accessStatus: 'active' });
        return;
      }
      
      const accessStatus = checkAccessStatus(data);
      const refreshedNucleo = (data as any).nucleos?.nome || data.nucleo;
      return { ...data, nucleo: refreshedNucleo, email: session.user.email, accessStatus };
    };

    globalProfilePromise = loadProfileTask();
    lastFetchTime = Date.now();

    try {
      const finalProfile = await globalProfilePromise;
      setProfile(finalProfile);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      
      // Prevent infinite redirect loops
      const isPublicPath = ['/', '/login', '/signup', '/forgot-password', '/reset-password'].includes(window.location.pathname);
      
      if (!isPublicPath) {
        localStorage.removeItem('fatesa_active_role');
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return { profile, loading, signOut, refreshProfile: fetchProfile };
};
