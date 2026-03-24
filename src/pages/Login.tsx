import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogIn, Loader2, GraduationCap, Eye, EyeOff, ChevronLeft } from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: email + password, 2: role selection
  const [role, setRole] = useState<'aluno' | 'professor' | 'admin' | 'suporte'>('aluno')
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('tipo').eq('id', user.id).single();
        if (data && ['admin', 'professor', 'suporte'].includes(data.tipo)) {
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

      // 3. Handle roles
      let roles = data.caminhos_acesso || []
      const rolesSet = new Set(roles)

      // Add specific roles based on email for testing/special access
      if (email === 'edi.ben.jr@gmail.com') {
        if (!rolesSet.has('suporte')) rolesSet.add('suporte')
        if (!rolesSet.has('professor')) rolesSet.add('professor')
        if (!rolesSet.has('aluno')) rolesSet.add('aluno')
      }
      if (email === 'ap.panisso@gmail.com' && !rolesSet.has('admin')) rolesSet.add('admin')

      roles = Array.from(rolesSet)

      if (roles.length > 1) {
        setAvailableRoles(roles)
        setStep(2)
      } else {
        const userType = data.tipo as any
        if (userType === 'aluno') {
          navigate('/dashboard')
        } else if (userType === 'admin' || userType === 'professor' || userType === 'suporte') {
          navigate('/admin')
        } else {
          setError('Tipo de usuário não reconhecido para redirecionamento.')
        }
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
      <div className={`auth-card ${step === 2 ? 'step-2-active' : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="auth-header" style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <GraduationCap size={64} color="var(--primary)" />
          </div>
          <h1>Portal do Aluno</h1>
          <p>Seja bem-vindo à FATESA</p>
        </div>

        <div className="auth-form-container" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="auth-form-wrapper" style={{ 
              display: 'flex', 
              width: '200%', 
              transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
              transform: step === 1 ? 'translateX(0)' : 'translateX(-50%)'
            }}>
            {/* Step 1: Email + Senha */}
            <div style={{ width: '50%', padding: '0 1rem' }}>
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>E-mail Institucional</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="aluno@fatesa.edu"
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

            {/* Step 2: Role Selection (conditional for multi-role users) */}
            <div style={{ width: '50%', padding: '0 1rem' }}>
              <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.1rem' }}>Como deseja acessar?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {availableRoles.map((r: any) => (
                  <button 
                    key={r}
                    type="button" 
                    className={`btn ${role === r ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleRoleSelection(r)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {r === 'aluno' ? 'Portal do Aluno' : r === 'professor' ? 'Painel do Professor' : r === 'suporte' ? 'Painel de Suporte' : 'Administração do Site'}
                  </button>
                ))}
              </div>
              <button 
                type="button" 
                className="btn btn-link" 
                onClick={async () => { await supabase.auth.signOut(); setStep(1); }}
                style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>

        <div className="auth-footer" style={{ marginTop: '2.5rem', opacity: step === 1 ? 1 : 0, transition: 'opacity 0.3s' }}>
          Não possui acesso ativado? <Link to="/signup">Ative aqui</Link>
          <p style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.8 }}>
            Área do <Link to="/professor/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Professor</Link> ou <Link to="/admin/login" style={{ color: 'var(--error)', fontWeight: 600 }}>Administrador</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
