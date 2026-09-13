import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isTokenExpired, signOutLocal } from '../lib/authUtils'
import { LogIn, Loader2, Eye, EyeOff, ArrowLeft, AlertTriangle } from 'lucide-react'
import Logo from '../components/common/Logo'
import { useSEO } from '../hooks/useSEO'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReturnButton, setShowReturnButton] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const expiredMessage = searchParams.get('expired') === 'true' ? (searchParams.get('message') || 'Sua sessão expirou. Faça login novamente.') : null

  useSEO({
    title: 'Entrar na Plataforma | Fatesa',
    description: 'Faça login no portal do aluno Fatesa para continuar seus estudos teológicos online.'
  });

  useEffect(() => {
    // Verifica se já existe sessão no cache (ex.: refresh da página)
    const initCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return
      if (isTokenExpired(session.access_token)) {
        const { data: refreshed } = await supabase.auth.refreshSession()
        if (refreshed.session?.user) {
          await checkSessionRoles(refreshed.session.user)
          return
        }
        await signOutLocal()
        return
      }
      await checkSessionRoles(session.user);
    };
    initCheck();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const checkSessionRoles = async (user: any) => {
    await new Promise<void>((resolve) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.id === user.id) {
          subscription.unsubscribe();
          resolve();
        }
      });
      setTimeout(() => {
        subscription.unsubscribe();
        resolve();
      }, 2000);
    });

    const fetchProfile = async () => {
      return await supabase
        .from('users')
        .select('tipo, bloqueado, caminhos_acesso, status_nucleo')
        .eq('id', user.id)
        .maybeSingle();
    };

    let { data, error: fetchError } = await fetchProfile();

    const isJwtError = (err: any) =>
      !!err && (
        err.code === 'PGRST301' ||
        String(err.message || '').toLowerCase().includes('jwt')
      )

    if (isJwtError(fetchError)) {
      const { data: refreshed } = await supabase.auth.refreshSession()
      if (refreshed.session) {
        const retry = await fetchProfile()
        data = retry.data
        fetchError = retry.error
      } else {
        await signOutLocal()
        setError('Sua sessão expirou. Faça login novamente.')
        setLoading(false)
        return
      }
    }

    if (!data && !fetchError) {
      console.warn("Perfil não encontrado na 1ª tentativa. Aguardando sincronização de JWT e tentando novamente...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      const retryFetch = await fetchProfile();
      data = retryFetch.data;
      fetchError = retryFetch.error;
    }
    
    // Auto-repair missing profile or handle errors for Admin (DB-driven via admins_autorizados)
    let isAdminEmail = false;
    if (user.email) {
      const { data: authorized } = await supabase
        .from('admins_autorizados')
        .select('email')
        .eq('email', user.email.toLowerCase().trim())
        .maybeSingle();
      isAdminEmail = !!authorized;
    }
    
    if ((!data && !fetchError) || (fetchError && isAdminEmail)) {
      console.warn("Perfil não encontrado ou erro de RLS para Admin. Tentando auto-reparo...", user.id);
      const metadata = user.user_metadata || {};
      const defaultTipo = isAdminEmail ? 'admin' : (metadata.student_type || 'online');
      
      try {
        const { data: createdProfile, error: insertError } = await supabase.rpc('create_profile_if_missing', {
          p_user_id: user.id,
          p_email: user.email,
          p_nome: metadata.full_name || (isAdminEmail ? 'Administrador' : 'Usuário'),
          p_tipo: defaultTipo,
          p_nucleo_id: metadata.nucleo_id || null,
          p_caminhos_acesso: isAdminEmail ? ['admin', 'suporte', 'professor', 'aluno'] : [defaultTipo]
        });

        if (!insertError && createdProfile) {
          data = createdProfile;
          fetchError = null;
        } else if (insertError) {
          console.error("Erro no RPC de reparo:", insertError);
        }
      } catch (e) {
        console.error("Falha catastrófica no reparo:", e);
      }
    }

    if (fetchError || !data) {
      if (isAdminEmail) {
        console.warn("Admin profile missing but allowing bypass for persistence.");
        navigate('/admin', { replace: true });
        setLoading(false);
        return;
      }
      console.error("Erro ao buscar perfil:", fetchError, "UserId:", user.id);
      await signOutLocal();
      setError('Falha ao carregar perfil. Por favor, tente novamente.');
      setLoading(false);
      return;
    }

    if (data.bloqueado) {
      await supabase.auth.signOut();
      setError('Sua conta está bloqueada. Entre em contato com a administração.');
      setLoading(false);
      return;
    }

    if (data.status_nucleo === 'hiato') {
      await supabase.auth.signOut();
      setError('Você está cadastrado como desistente (hiato). Se deseja retornar ao curso, entre em contato com o suporte/financeiro para reativar sua matrícula.');
      setShowReturnButton(true);
      setLoading(false);
      return;
    }

    const roles = (data.caminhos_acesso as string[]) || [];
    const userType = (data.tipo || '') as string;
    
    const isAdmin = roles.some((r: string) => ['admin', 'suporte'].includes(r)) || ['admin', 'suporte'].includes(userType);
    const isProfessor = roles.some((r: string) => r === 'professor') || userType === 'professor' || isAdmin;

    if (isAdmin) navigate('/admin', { replace: true });
    else if (isProfessor) navigate('/professor', { replace: true });
    else navigate('/dashboard', { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowReturnButton(false);

    try {
      // 1. Authenticate user
      const { error: authError, data: authResult } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authResult.user) throw authError || new Error('Falha na autenticação');
      
      await checkSessionRoles(authResult.user);
      
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Credenciais incorretas para este e-mail.' : err.message);
      setLoading(false);
    }
  };



  return (
    <div className="auth-container" style={{ position: 'relative' }}>
      <Link to="/" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, background: 'var(--primary)', padding: '0.6rem 1.2rem', borderRadius: '50px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 9999 }}>
        <ArrowLeft size={18} /> Voltar
      </Link>
      <div className="auth-card">
        <div className="auth-header" style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Logo size={220} />
          </div>
          <h1>Acesso ao Portal</h1>
          <p>Seja bem-vindo à FATESA</p>
        </div>

        <div className="auth-form-container">
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="login-email">E-mail Institucional</label>
              <input
                id="login-email"
                name="email"
                type="email"
                className="form-control"
                placeholder="usuario@fatesa.edu.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label htmlFor="login-password" style={{ margin: 0 }}>Senha de Acesso</label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Esqueceu a senha?</Link>
              </div>
              <div className="password-field">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {expiredMessage && (
              <div className="error-msg" style={{ marginBottom: '1.5rem', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} /> {expiredMessage}
              </div>
            )}
            {error && <div className="error-msg" style={{ marginBottom: '1.5rem' }}>{error}</div>}
            
            {showReturnButton && (
              <a 
                href="https://wa.me/5516999999999?text=Ol%C3%A1%2C%20eu%20estava%20como%20desistente%20e%20gostaria%20de%20retornar%20ao%20curso!"
                target="_blank"
                rel="noreferrer"
                className="btn"
                style={{ background: '#25D366', color: '#fff', width: '100%', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
              >
                Sim, quero retornar (WhatsApp)
              </a>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="spinner" /> : <><LogIn size={20} /> Entrar</>}
            </button>
          </form>
        </div>

        <div className="auth-footer" style={{ marginTop: '2.5rem' }}>
          Não possui acesso ativado? <Link to="/signup">Ative aqui</Link>
        </div>
      </div>
    </div>
  )
}

export default Login
