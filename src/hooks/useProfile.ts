import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, onSupabaseAuthError } from '../lib/supabase';
import { checkAccessStatus } from '../lib/paymentCycle';
import { isTokenExpired } from '../lib/authUtils';

// Global cache to prevent race conditions (5000ms Lock error) when multiple components mount
let globalProfilePromise: Promise<any> | null = null;
let lastFetchTime = 0;

export const useProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const navigatingRef = useRef(false);

  const goToLogin = (message?: string) => {
    if (navigatingRef.current) return
    navigatingRef.current = true
    setProfile(null)
    setLoading(false)
    const path = message ? `/login?expired=true&message=${encodeURIComponent(message)}` : '/login?expired=true'
    navigate(path, { replace: true })
  }

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case 'SIGNED_OUT':
          goToLogin('Sessão encerrada.');
          break
        case 'TOKEN_REFRESHED':
          if (session) fetchProfile()
          break
        case 'SIGNED_IN':
          if (session) fetchProfile()
          break
        case 'INITIAL_SESSION':
          if (!session) {
            goToLogin()
          }
          break
        default:
          if (event.toLowerCase().includes('failed') || event.toLowerCase().includes('error')) {
            goToLogin('Sessão expirada. Faça login novamente.')
          }
      }
    });

    const healthCheck = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && isTokenExpired(session.access_token)) {
        const { data: refreshed } = await supabase.auth.refreshSession()
        if (!refreshed.session) {
          goToLogin('Sua sessão expirou.')
        }
      }
    }, 60000)

    const unsubAuthError = onSupabaseAuthError(() => {
      goToLogin('Sessão expirada. Faça login novamente.')
    })

    return () => {
      subscription.unsubscribe()
      clearInterval(healthCheck)
      unsubAuthError()
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
      let session = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: { session: s }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session Error:', sessionError);
          if (sessionError.message?.toLowerCase().includes('refresh') || sessionError.message?.toLowerCase().includes('token')) {
            goToLogin('Sessão expirada. Faça login novamente.')
          }
          setLoading(false);
          return;
        }
        if (s) {
          if (isTokenExpired(s.access_token)) {
            const { data: refreshed } = await supabase.auth.refreshSession()
            if (!refreshed.session) {
              goToLogin('Sua sessão expirou.')
              return
            }
            session = refreshed.session
          } else {
            session = s
          }
          break;
        }
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (!session) {
        goToLogin();
        return;
      }

      let data, error;
      // Try with full joins first
      const result = await supabase
        .from('users')
        .select(`*, nucleos(nome), pagamentos (*)`)
        .eq('id', session.user.id)
        .maybeSingle();
      data = result.data;
      error = result.error;
      
      // If full query fails (e.g., missing column or RLS issue), retry without joins
      if (error) {
        console.warn('Full profile query failed, retrying without joins:', error.message || error);
        const retry = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!retry.error && retry.data) {
          data = retry.data;
          error = null;
        }
      }
      
      if (error) {
        console.error('Database Profile Error:', error);
        if (error.code === 'PGRST301' || error.code === '401' || error.message?.toLowerCase().includes('jwt')) {
          goToLogin('Sua sessão expirou.')
          return
        }
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
      if (finalProfile) setProfile(finalProfile);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      // Fallback: If we have a session but db failed, set a minimal profile to avoid loop
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setProfile({ 
          id: session.user.id, 
          email: session.user.email, 
          tipo: 'aluno', 
          accessStatus: 'active',
          isTemporary: true 
        });
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
