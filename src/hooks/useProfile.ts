import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const useProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setProfile(null);
        navigate('/login');
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
        // Only redirect if we're not already on a public page
        if (!['/', '/login', '/signup', '/forgot-password', '/reset-password'].includes(window.location.pathname)) {
          throw new Error('Sessão expirada ou inválida');
        }
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Database Profile Error:', error);
        // Special case: User authenticated in Auth but no record in Public.users
        if (error.code === 'PGRST116') {
           setProfile({ id: session.user.id, email: session.user.email, tipo: 'aluno', caminhos_acesso: ['aluno'] });
           return;
        }
        throw error;
      }
      
      setProfile({ ...data, email: session.user.email });
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
