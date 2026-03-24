import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { UserPlus, Loader2, GraduationCap, Eye, EyeOff, ChevronLeft, ShieldCheck } from 'lucide-react'

const Signup = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const initialEmail = location.state?.email || ''
  
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [tipo, setTipo] = useState<'presencial' | 'online'>('online')
  const [nucleo, setNucleo] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProfessor, setIsProfessor] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)

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

  useEffect(() => {
    const checkProfessor = async () => {
      if (!email || !email.includes('@')) {
        setIsProfessor(false);
        return;
      }

      setCheckingEmail(true);
      try {
        const [profRes, adminRes] = await Promise.all([
          supabase.from('professores_autorizados').select('email').eq('email', email.toLowerCase().trim()).maybeSingle(),
          supabase.from('admins_autorizados').select('email').eq('email', email.toLowerCase().trim()).maybeSingle()
        ]);
        
        setIsProfessor(!!profRes.data);
        setIsAdmin(!!adminRes.data);
      } catch (err) {
        console.error('Erro ao verificar autorização:', err);
      } finally {
        setCheckingEmail(false);
      }
    };

    const timer = setTimeout(checkProfessor, 500);
    return () => clearTimeout(timer);
  }, [email]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Password Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(password)) {
      setError('A senha deve ter no mínimo 8 caracteres, incluindo pelo menos uma letra maiúscula, uma minúscula e um número.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Supabase Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nome,
            student_type: tipo,
            nucleo: nucleo
          }
        }
      })

      if (authError) throw authError

      if (authData.session) {
        // Redirecionamento instantâneo para dentro da plataforma (Bypass da confirmação superado)
        navigate('/dashboard', { replace: true })
      } else if (authData.user) {
        // Fallback caso a trava do Supabase ainda não tenha atualizado no backend
        navigate('/login', { replace: true })
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <GraduationCap size={64} color="var(--primary)" />
          </div>
          <h1>Ativar Acesso</h1>
          <p>Exclusivo para alunos já matriculados na FATESA</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Se você já fez sua matrícula presencial ou online, use seu e-mail para definir sua senha.
          </p>
        </div>

        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label>Nome Completo</label>
            <input
              type="text"
              className="form-control"
              placeholder="Digite seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Tipo de Aluno</label>
            <div className="select-group">
              <label className="select-option">
                <input 
                  type="radio" 
                  name="tipo" 
                  checked={tipo === 'presencial'} 
                  onChange={() => setTipo('presencial')} 
                />
                <div className="box">Presencial</div>
              </label>
              <label className="select-option">
                <input 
                  type="radio" 
                  name="tipo" 
                  checked={tipo === 'online'} 
                  onChange={() => setTipo('online')} 
                />
                <div className="box">On-line</div>
              </label>
            </div>
          </div>

          {tipo === 'presencial' && (
            <div className="form-group">
              <label>Seu Núcleo de Origem</label>
              <select 
                className="form-control" 
                value={nucleo}
                onChange={(e) => setNucleo(e.target.value)}
                required
              >
                <option value="">Selecione seu núcleo...</option>
                <option value="Vila Luzita">Núcleo Vila Luzita (Sto André)</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label>E-mail</label>
            <input
              type="email"
              className="form-control"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {checkingEmail && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Verificando cadastro...</p>}
            {(isProfessor || isAdmin) && (
              <div style={{ 
                marginTop: '0.75rem', 
                padding: '0.75rem', 
                background: 'rgba(34, 197, 94, 0.1)', 
                border: '1px solid var(--success)', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--success)',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                <ShieldCheck size={16} /> {isAdmin ? 'Administrador' : 'Professor'} Identificado! Prossiga com sua senha.
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Crie uma Senha</label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="Mín. 8 caracteres, A-z, 0-9"
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
            <p className="field-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Mínimo 8 caracteres, com letra maiúscula, minúscula e número.
            </p>
          </div>

          <div className="form-group">
            <label>Confirme sua Senha</label>
            <div className="password-field">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="form-control"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
            Começar Agora
          </button>
        </form>

        <div className="auth-footer">
          Já tem conta? <Link to="/login">Faça login</Link>
          <br />
          Não é matriculado? <Link to="/matricula">Solicite sua matrícula</Link>
        </div>
      </div>
    </div>
  )
}

export default Signup
