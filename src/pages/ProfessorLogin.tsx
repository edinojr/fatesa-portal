import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogIn, Loader2, GraduationCap, Eye, EyeOff, ChevronLeft, ShieldCheck } from 'lucide-react'

const ProfessorLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: email + password, 2: role selection
  const [role, setRole] = useState<'aluno' | 'professor' | 'admin' | 'suporte'>('professor')
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('tipo, caminhos_acesso').eq('id', user.id).single();
        const roles = (data?.caminhos_acesso as string[]) || [];
        const isStaff = ['admin', 'professor', 'suporte'].includes(data?.tipo || '') || roles.some((r: string) => ['admin', 'professor', 'suporte'].includes(r));
        
        if (isStaff) {
          navigate('/professor', { replace: true });
        } else {
          // If a student tries to access teacher portal while logged in, send them to their dashboard
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
      const { data: authResult, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !authResult.user) throw authError || new Error('Falha na autenticação')
      
      const userId = authResult.user.id

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('tipo, bloqueado, caminhos_acesso')
        .eq('id', userId)
        .single()
      
      if (fetchError || !data) {
        await supabase.auth.signOut()
        setError('E-mail não identificado no banco de dados de docentes.')
        return
      }

      if (data.bloqueado) {
        await supabase.auth.signOut()
        setError('Sua conta está bloqueada. Entre em contato com a diretoria.')
        return
      }

      // Check if user has permission to be in the teacher portal
      const roles = (data.caminhos_acesso as string[]) || []
      const isStaff = ['admin', 'professor', 'suporte'].includes(data.tipo) || roles.some((r: string) => ['admin', 'professor', 'suporte'].includes(r)) || email === 'edi.ben.jr@gmail.com';

      if (!isStaff) {
        await supabase.auth.signOut()
        setError('Acesso restrito ao corpo docente e administrativo.')
        return
      }

      let userRoles = roles
      if (email === 'edi.ben.jr@gmail.com') {
        userRoles = ['aluno', 'professor', 'suporte']
      }

      if (userRoles.length > 1) {
        setAvailableRoles(userRoles)
        setStep(2)
      } else {
        const userType = data.tipo as any
        if (userType === 'professor') navigate('/professor')
        else if (userType === 'admin' || userType === 'suporte') navigate('/admin')
        else navigate('/professor') // Fallback
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Credenciais incorretas para este e-mail.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelection = (selectedRole: string) => {
    if (selectedRole === 'aluno') navigate('/dashboard')
    else if (selectedRole === 'professor') navigate('/professor')
    else navigate('/admin')
  }

  return (
    <div className="auth-container" style={{ background: 'linear-gradient(135deg, #1a0f1a 0%, #0a0a0a 100%)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className={`auth-card ${step === 2 ? 'step-2-active' : ''}`} style={{ borderColor: 'rgba(168, 85, 247, 0.2)', maxWidth: '450px', width: '100%' }}>
        <div className="auth-header" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', position: 'relative' }}>
            <GraduationCap size={64} color="var(--primary)" />
            <ShieldCheck size={24} color="var(--success)" style={{ position: 'absolute', bottom: 0, right: '40%' }} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Portal do Professor</h1>
          <p style={{ color: 'var(--text-muted)' }}>Acesso restrito ao Corpo Docente</p>
        </div>

        <div className="auth-form-container" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="auth-form-wrapper" style={{ 
              display: 'flex', 
              width: '200%', 
              transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
              transform: step === 1 ? 'translateX(0)' : 'translateX(-50%)'
            }}>
            <div style={{ width: '50%', padding: '0 1rem' }}>
              <form onSubmit={handleLogin}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>E-mail Docente / Administrativo</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="professor@fatesa.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff' }}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ margin: 0, fontWeight: 600 }}>Senha de Acesso</label>
                    <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Esqueceu a senha?</Link>
                  </div>
                  <div className="password-field" style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff' }}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {error && <div className="error-msg" style={{ marginBottom: '1.5rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.9rem' }}>{error}</div>}

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'linear-gradient(90deg, var(--primary), #9c27b0)', border: 'none', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  {loading ? <Loader2 className="spinner" /> : <><LogIn size={20} /> Entrar no Portal</>}
                </button>
              </form>
            </div>

            <div style={{ width: '50%', padding: '0 1rem' }}>
              <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.1rem' }}>Selecione o Ambiente</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {availableRoles.map((r: string) => (
                  <button 
                    key={r}
                    type="button" 
                    className="btn btn-outline"
                    onClick={() => handleRoleSelection(r)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {r === 'aluno' ? 'Portal do Aluno' : r === 'professor' ? 'Painel do Professor' : r === 'suporte' ? 'Painel de Suporte' : 'Administração'}
                  </button>
                ))}
              </div>
              <button 
                type="button" 
                className="btn btn-link" 
                onClick={async () => { await supabase.auth.signOut(); setStep(1); }}
                style={{ marginTop: '1.5rem', color: 'var(--text-muted)', width: '100%', textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>

        <div className="auth-footer" style={{ marginTop: '2.5rem', opacity: 0.6, fontSize: '0.85rem', textAlign: 'center' }}>
          Problemas no acesso? Contate o suporte técnico.
        </div>
      </div>
    </div>
  )
}

export default ProfessorLogin
