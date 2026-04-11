import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { checkAccessStatus } from '../lib/paymentCycle';

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

  const fetchProfile = async () => {
    try {
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
      // Map Joined Name to the profile.nucleo field for UI compatibility
      const refreshedNucleo = (data as any).nucleos?.nome || data.nucleo;
      setProfile({ ...data, nucleo: refreshedNucleo, email: session.user.email, accessStatus });
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
