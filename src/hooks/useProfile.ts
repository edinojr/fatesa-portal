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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Sessão expirada ou inválida');
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile({ ...data, email: user.email });
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      // Fallback: Se for erro de auth, limpa e redireciona
      if (err?.message?.includes('Refresh Token') || err?.message?.includes('Sessão expirada') || err?.code === 'PGRST301') {
        await supabase.auth.signOut();
        navigate('/login');
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
