import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogIn, Loader2, Eye, EyeOff } from 'lucide-react'
import Logo from '../components/common/Logo'
import { useSEO } from '../hooks/useSEO'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  useSEO({
    title: 'Entrar na Plataforma | Fatesa',
    description: 'Faça login no portal do aluno Fatesa para continuar seus estudos teológicos online.'
  });

  useEffect(() => {
    // 1. Escuta mudanças globais na sessão para garantir sincronia 100% segura do JWT
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Quando logado com sucesso, chama a verificação
      if (event === 'SIGNED_IN' && session?.user) {
        await checkSessionRoles(session.user);
      }
    });

    // 2. Validação inicial se já existe sessão no cache
    const initCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await checkSessionRoles(session.user);
      }
    };
    initCheck();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkSessionRoles = async (user: any) => {
    // FIX RACE CONDITION: Delay estratégico para garantir que o Headers Locais do Supabase
    // estejam sincronizados antes do PostgREST validar o Row Level Security.
    await new Promise(resolve => setTimeout(resolve, 800));

    let { data, error: fetchError } = await supabase
      .from('users')
      .select('tipo, bloqueado, caminhos_acesso')
      .eq('id', user.id)
      .maybeSingle();
    
    // Auto-repair missing profile or handle errors for Admin
    const isAdminEmail = user.email === 'edi.ben.jr@gmail.com' || user.email === 'ap.panisso@gmail.com';
    
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
      await supabase.auth.signOut();
      setError('Falha ao carregar perfil. Por favor, tente novamente em alguns instantes.');
      setLoading(false);
      return;
    }

    if (data.bloqueado) {
      await supabase.auth.signOut();
      setError('Sua conta está bloqueada. Entre em contato com a administração.');
      setLoading(false);
      return;
    }

    const roles = data.caminhos_acesso || [];
    const rolesSet = new Set(roles);

    if (user.email === 'edi.ben.jr@gmail.com') {
      ['suporte', 'professor', 'aluno'].forEach(r => rolesSet.add(r));
    }
    if (user.email === 'ap.panisso@gmail.com') rolesSet.add('admin');

    const finalRoles = Array.from(rolesSet);
    const userType = (data.tipo || '') as string;
    
    const isAdmin = finalRoles.some((r: any) => ['admin', 'suporte'].includes(r)) || ['admin', 'suporte'].includes(userType);
    const isProfessor = finalRoles.some((r: any) => r === 'professor') || userType === 'professor';

    if (isAdmin) navigate('/admin', { replace: true });
    else if (isProfessor) navigate('/professor', { replace: true });
    else navigate('/dashboard', { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate user
      const { error: authError, data: authResult } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authResult.user) throw authError || new Error('Falha na autenticação');
      
      // O handleLogin termina aqui! 
      // Não navegamos nem buscamos o banco. O onAuthStateChange listener
      // que configuramos no useEffect detectará o 'SIGNED_IN' nativamente e executará o `checkSessionRoles`
      // com segurança!
      
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Credenciais incorretas para este e-mail.' : err.message);
      setLoading(false);
    }
  };



  return (
    <div className="auth-container">
      <div className="auth-card" style={{ position: 'relative', overflow: 'hidden' }}>
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
              <label>E-mail Institucional</label>
              <input
                type="email"
                className="form-control"
                placeholder="usuario@fatesa.edu.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ margin: 0 }}>Senha de Acesso</label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Esqueceu a senha?</Link>
              </div>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            {error && <div className="error-msg" style={{ marginBottom: '1.5rem' }}>{error}</div>}

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
