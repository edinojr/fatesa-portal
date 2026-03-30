import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogIn, Loader2, GraduationCap, Eye, EyeOff, ChevronLeft } from 'lucide-react'
import Logo from '../components/common/Logo'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('tipo').eq('id', user.id).single();
        const userType = data?.tipo || '';
        const isStaff = ['admin', 'professor', 'suporte'].includes(userType);
        
        if (isStaff) {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Authenticate user
      const { data: authResult, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !authResult.user) throw authError || new Error('Falha na autenticação')
      
      const userId = authResult.user.id

      // 2. Fetch User Profile using ID
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('tipo, bloqueado, caminhos_acesso')
        .eq('id', userId)
        .single()
      
      if (fetchError || !data) {
        console.error("Erro ao buscar perfil:", fetchError, "UserId:", userId)
        await supabase.auth.signOut()
        
        const details = fetchError?.message || 'Nenhum dado retornado'
        const code = fetchError?.code || 'Desconhecido'
        setError(`E-mail não identificado no banco de perfis. Detalhe técnico: [${code}] ${details}`)
        return
      }

      if (data.bloqueado) {
        await supabase.auth.signOut()
        setError('Sua conta está bloqueada. Entre em contato com a administração.')
        return
      }

      // 3. Handle roles & Automatic Redirection
      const roles = data.caminhos_acesso || []
      const rolesSet = new Set(roles)

      // Special access logic
      if (email === 'edi.ben.jr@gmail.com') {
        ['suporte', 'professor', 'aluno'].forEach(r => rolesSet.add(r))
      }
      if (email === 'ap.panisso@gmail.com') rolesSet.add('admin')

      const finalRoles = Array.from(rolesSet)
      const userType = (data.tipo || '') as string
      
      const isAdmin = finalRoles.some((r: any) => ['admin', 'suporte'].includes(r)) || ['admin', 'suporte'].includes(userType)
      const isProfessor = finalRoles.some((r: any) => r === 'professor') || userType === 'professor'

      if (isAdmin) {
        navigate('/admin')
      } else if (isProfessor) {
        navigate('/professor')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Credenciais incorretas para este e-mail.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelection = (selectedRole: string) => {
    if (selectedRole === 'aluno') {
      navigate('/dashboard')
    } else if (selectedRole === 'professor') {
      navigate('/professor')
    } else {
      navigate('/admin')
    }
  }

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
