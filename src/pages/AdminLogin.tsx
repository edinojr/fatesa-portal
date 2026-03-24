import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogIn, Loader2, ShieldAlert, Eye, EyeOff, ChevronLeft, ShieldCheck } from 'lucide-react'

const AdminLogin = () => {
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
        const { data } = await supabase.from('users').select('tipo, caminhos_acesso').eq('id', user.id).single();
        const roles = (data?.caminhos_acesso as string[]) || [];
        const isAdmin = ['admin', 'suporte'].includes(data?.tipo || '') || roles.some((r: string) => ['admin', 'suporte'].includes(r));
        
        if (isAdmin) {
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
        setError('E-mail não identificado no banco de dados administrativo.')
        return
      }

      if (data.bloqueado) {
        await supabase.auth.signOut()
        setError('Sua conta está bloqueada. Entre em contato com a TI.')
        return
      }

      const roles = (data.caminhos_acesso as string[]) || []
      const isAdmin = ['admin', 'suporte'].includes(data.tipo) || roles.some((r: string) => ['admin', 'suporte'].includes(r)) || email === 'edi.ben.jr@gmail.com';

      if (!isAdmin) {
        await supabase.auth.signOut()
        setError('Acesso restrito ao corpo administrativo.')
        return
      }

      navigate('/admin')
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Credenciais incorretas para este e-mail.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="auth-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', maxWidth: '450px', width: '100%' }}>
        <div className="auth-header" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', position: 'relative' }}>
            <ShieldAlert size={64} color="var(--error)" />
            <ShieldCheck size={24} color="var(--success)" style={{ position: 'absolute', bottom: 0, right: '40%' }} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Portal Administrativo</h1>
          <p style={{ color: 'var(--text-muted)' }}>Acesso exclusivo para Gestores FATESA</p>
        </div>

        <div className="auth-form-container">
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>E-mail Administrativo</label>
              <input
                type="email"
                className="form-control"
                placeholder="admin@fatesa.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff' }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ margin: 0, fontWeight: 600 }}>Chave de Acesso</label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--error)', textDecoration: 'none', fontWeight: 600 }}>Redefinir</Link>
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

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'linear-gradient(90deg, #ef4444, #991b1b)', border: 'none', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              {loading ? <Loader2 className="spinner" /> : <><LogIn size={20} /> Autenticar Sistema</>}
            </button>
          </form>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <ChevronLeft size={16} /> Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
