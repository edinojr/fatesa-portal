import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, onSupabaseAuthError } from '../lib/supabase';
import { checkAccessStatus } from '../lib/paymentCycle';
import { isTokenExpired, signOutLocal, ADMIN_EMAILS } from '../lib/authUtils';

// Global in-memory cache so switching tabs or remounting components reuses the loaded profile
// without re-querying Supabase or resetting UI state, unless explicitly refreshed by the user.
let globalProfilePromise: Promise<any> | null = null;
let cachedProfileData: any = null;
let lastFetchTime = 0;

export const useProfile = () => {
  const [profile, setProfile] = useState<any>(() => cachedProfileData);
  const [loading, setLoading] = useState<boolean>(() => !cachedProfileData);
  const navigate = useNavigate();
  const navigatingRef = useRef(false);
  const profileRef = useRef<any>(cachedProfileData);
  profileRef.current = profile;

  const goToLogin = useCallback((message?: string) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    cachedProfileData = null;
    globalProfilePromise = null;
    setProfile(null);
    setLoading(false);
    void signOutLocal();
    const path = message ? `/login?expired=true&message=${encodeURIComponent(message)}` : '/login?expired=true';
    navigate(path, { replace: true });
  }, [navigate]);

  const fetchProfile = useCallback(async (forceRefresh = false) => {
    // Se já temos o perfil carregado em memória e não foi pedido refresh explícito pelo usuário,
    // mantém o mesmo objeto (evita re-renderizar ou recarregar dados ao voltar de outra aba do navegador).
    if (!forceRefresh && cachedProfileData) {
      if (profileRef.current !== cachedProfileData) {
        setProfile(cachedProfileData);
      }
      setLoading(false);
      return cachedProfileData;
    }

    // Se já existe uma requisição em andamento recente, reaproveita a mesma Promise
    if (!forceRefresh && globalProfilePromise && (Date.now() - lastFetchTime < 10000)) {
      try {
        const cached = await globalProfilePromise;
        if (cached) {
          cachedProfileData = cached;
          setProfile((prev: any) => (prev?.id === cached.id && JSON.stringify(prev) === JSON.stringify(cached) ? prev : cached));
        }
        setLoading(false);
        return cached;
      } catch {
        // Continua caso a promise anterior tenha falhado
      }
    }

    const loadProfileTask = async () => {
      let session = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: { session: s }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session Error:', sessionError);
          if (sessionError.message?.toLowerCase().includes('refresh') || sessionError.message?.toLowerCase().includes('token')) {
            goToLogin('Sessão expirada. Faça login novamente.');
          }
          setLoading(false);
          return null;
        }
        if (s) {
          if (isTokenExpired(s.access_token)) {
            const { data: refreshed } = await supabase.auth.refreshSession();
            if (!refreshed.session) {
              goToLogin('Sua sessão expirou.');
              return null;
            }
            session = refreshed.session;
          } else {
            session = s;
          }
          break;
        }
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!session) {
        goToLogin();
        return null;
      }

      const emailLower = (session.user.email || '').toLowerCase().trim();
      const isMasterAdmin = ADMIN_EMAILS.includes(emailLower);
      const allMasterRoles = ['admin', 'suporte', 'professor', 'aluno'];

      const isJwtErr = (err: any) =>
        !!err && (
          err.code === 'PGRST301' ||
          err.code === '401' ||
          String(err.message || '').toLowerCase().includes('jwt')
        );

      let data: any = null, error: any = null;
      try {
        const result = await supabase
          .from('users')
          .select(`*, nucleos(nome), pagamentos (*)`)
          .eq('id', session.user.id)
          .maybeSingle();
        data = result.data;
        error = result.error;
      } catch (err: any) {
        error = err;
      }

      if (isJwtErr(error)) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!refreshed.session) {
          if (!isMasterAdmin) {
            goToLogin('Sua sessão expirou.');
            return null;
          }
        } else {
          session = refreshed.session;
          try {
            const retryJwt = await supabase
              .from('users')
              .select(`*, nucleos(nome), pagamentos (*)`)
              .eq('id', session.user.id)
              .maybeSingle();
            data = retryJwt.data;
            error = retryJwt.error;
          } catch (err: any) {
            error = err;
          }
        }
      } else if (error) {
        try {
          const retry = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (!retry.error && retry.data) {
            data = retry.data;
            error = null;
          }
        } catch {
          // keep error
        }
      }

      // Administrador Master tem imunidade contra erros de tabela e bloqueio de pagamento
      if (isMasterAdmin) {
        if (!data) {
          data = {
            id: session.user.id,
            email: session.user.email,
            nome: session.user.user_metadata?.full_name || 'Administrador Master',
            tipo: 'admin',
            bloqueado: false,
            caminhos_acesso: allMasterRoles,
            accessStatus: 'active'
          };
        } else {
          const roles = Array.from(new Set([...(data?.caminhos_acesso || []), ...allMasterRoles]));
          data = {
            ...data,
            tipo: 'admin',
            bloqueado: false,
            caminhos_acesso: roles
          };
        }
        error = null;

        const refreshedNucleo = (data as any).nucleos?.nome || data.nucleo;
        return { ...data, nucleo: refreshedNucleo, email: session.user.email, accessStatus: 'active' };
      }

      if (error) {
        if (isJwtErr(error)) {
          goToLogin('Sua sessão expirou.');
          return null;
        }
        throw error;
      }

      if (!data) {
        console.warn('Profile not found for authenticated user, applying fallback/mock.');
        const fallbackProfile = {
          id: session.user.id,
          email: session.user.email,
          nome: session.user.user_metadata?.full_name || 'Usuário',
          tipo: session.user.user_metadata?.student_type || 'aluno',
          caminhos_acesso: ['aluno'],
          accessStatus: 'active'
        };
        return fallbackProfile;
      }

      const accessStatus = checkAccessStatus(data);
      const refreshedNucleo = (data as any).nucleos?.nome || data.nucleo;
      return { ...data, nucleo: refreshedNucleo, email: session.user.email, accessStatus };
    };

    globalProfilePromise = loadProfileTask();
    lastFetchTime = Date.now();

    try {
      const finalProfile = await globalProfilePromise;
      if (finalProfile) {
        cachedProfileData = finalProfile;
        setProfile((prev: any) => {
          if (prev && prev.id === finalProfile.id && JSON.stringify(prev) === JSON.stringify(finalProfile)) {
            return prev;
          }
          return finalProfile;
        });
      }
      return finalProfile;
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (err?.code === 'PGRST301' || err?.code === '401' || msg.includes('jwt')) {
        goToLogin('Sua sessão expirou.');
        return null;
      }
      if (!cachedProfileData) {
        goToLogin('Não foi possível carregar seu perfil. Faça login novamente.');
      }
      return cachedProfileData;
    } finally {
      setLoading(false);
    }
  }, [goToLogin]);

  useEffect(() => {
    void fetchProfile(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case 'SIGNED_OUT':
          goToLogin('Sessão encerrada.');
          break;
        case 'TOKEN_REFRESHED':
          // Não refaz consulta ao banco quando o navegador volta do segundo plano e renova o token JWT!
          break;
        case 'SIGNED_IN':
          // Se o mesmo usuário já está carregado em memória (evento disparado pelo foco da aba), ignora para não atualizar a página nem consumir dados
          if (session && cachedProfileData && cachedProfileData.id === session.user?.id) {
            break;
          }
          if (session) void fetchProfile(true);
          break;
        case 'INITIAL_SESSION':
          if (!session && !cachedProfileData) {
            goToLogin();
          }
          break;
        default:
          if (event.toLowerCase().includes('failed') || event.toLowerCase().includes('error')) {
            goToLogin('Sessão expirada. Faça login novamente.');
          }
      }
    });

    const unsubAuthError = onSupabaseAuthError(() => {
      goToLogin('Sessão expirada. Faça login novamente.');
    });

    return () => {
      subscription.unsubscribe();
      unsubAuthError();
    };
  }, [fetchProfile, goToLogin]);

  const signOut = async () => {
    cachedProfileData = null;
    globalProfilePromise = null;
    await supabase.auth.signOut();
    navigate('/login');
  };

  const refreshProfile = useCallback(() => fetchProfile(true), [fetchProfile]);

  return { profile, loading, signOut, refreshProfile };
};
