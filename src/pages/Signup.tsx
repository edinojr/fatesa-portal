import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { UserPlus, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import Logo from '../components/common/Logo'

const Signup = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const initialEmail = location.state?.email || ''
  
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [tipo, setTipo] = useState<'presencial' | 'online' | 'super_visitante' | 'ex_aluno' | 'colaborador'>('presencial')
  const [alumniVerified, setAlumniVerified] = useState<any>(null)
  const [nucleo, setNucleo] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProfessor, setIsProfessor] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [preRegistered, setPreRegistered] = useState<{nome: string, tipo: string, nucleo: string, nucleo_id?: string} | null>(null)
  const [availableNucleos, setAvailableNucleos] = useState<{id: string, nome: string}[]>([])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('tipo').eq('id', user.id).maybeSingle();
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
        setPreRegistered(null);
        return;
      }

      setCheckingEmail(true);
      try {
        const [profRes, adminRes, regRes] = await Promise.all([
          supabase.from('professores_autorizados').select('email').eq('email', email.toLowerCase().trim()).maybeSingle(),
          supabase.from('admins_autorizados').select('email').eq('email', email.toLowerCase().trim()).maybeSingle(),
          supabase.rpc('get_registration_details', { p_email: email.toLowerCase().trim() })
        ]);
        
        setIsProfessor(!!profRes.data);
        setIsAdmin(!!adminRes.data);

        if (regRes.data && regRes.data.length > 0) {
          const reg = regRes.data[0];
          setPreRegistered(reg);
          setNome(reg.nome);
          setTipo(reg.tipo === 'admin' || reg.tipo === 'professor' ? 'online' : reg.tipo);
          setNucleo(reg.nucleo_id || reg.nucleo || '');
        } else {
          setPreRegistered(null);
        }
      } catch (err) {
        console.error('Erro ao verificar autorização:', err);
      } finally {
        setCheckingEmail(false);
      }
    };

    const timer = setTimeout(checkProfessor, 500);
    return () => clearTimeout(timer);
  }, [email]);

  const verifyAlumniStatus = async () => {
    if (!nome) {
      setError('Por favor, preencha seu Nome Completo para verificação.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('registros_alumni')
        .select('*')
        .ilike('nome', nome.trim())
        .is('user_id', null)
        .maybeSingle();

      if (err) throw err;
      if (data) {
        setAlumniVerified(data);
        setError(null);
      } else {
        setError('Não encontramos um registro de formado com este nome ou o acesso já foi ativado. Verifique se o nome está idêntico ao da lista ou contate o suporte.');
      }
    } catch (err: any) {
      setError('Erro na verificação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchNucleos = async () => {
      const { data } = await supabase.from('nucleos').select('id, nome').order('nome');
      if (data) setAvailableNucleos(data);
    };
    fetchNucleos();
  }, []);

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
            nucleo: availableNucleos.find(n => n.id === nucleo)?.nome || (nucleo.includes('-') ? '' : nucleo),
            nucleo_id: nucleo.includes('-') ? nucleo : null
          }
        }
      })

      if (authError) throw authError

      // 2. Vincular se for Alumni
      if (authData.user && alumniVerified) {
        await supabase
          .from('registros_alumni')
          .update({ user_id: authData.user.id, email: email.toLowerCase() })
          .eq('id', alumniVerified.id);
      }

      if (authData.session) {
        // Redirecionamento instantâneo para dentro da plataforma (Bypass da confirmação superado)
        navigate('/dashboard', { replace: true })
      } else if (authData.user) {
        // Fallback caso a trava do Supabase ainda não tenha atualizado no backend
        navigate('/login', { replace: true })
      }

    } catch (err: any) {
      if (err.status === 422 || err.message?.includes('already registered')) {
        setError('Este e-mail já está ativado no portal. Tente fazer login ou recuperar sua senha.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Logo size={220} />
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
              readOnly={!!preRegistered}
              style={{ opacity: preRegistered ? 0.7 : 1 }}
            />
          </div>

          {!(isProfessor || isAdmin || (preRegistered && (preRegistered.tipo === 'professor' || preRegistered.tipo === 'admin'))) && (
            <div className="form-group">
              <label>Tipo de Cadastro</label>
              <select 
                className="form-control" 
                value={tipo} 
                onChange={(e) => setTipo(e.target.value as any)}
                required
                disabled={!!preRegistered}
              >
                <option value="presencial">Aluno Presencial (Já Matriculado)</option>
                <option value="super_visitante">Super Visitante (Acesso Vídeos)</option>
                <option value="ex_aluno">Ex-Aluno (Acesso Conteúdo)</option>
                <option value="colaborador">Colaborador / Parceiro</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {tipo === 'presencial' ? 'Obrigatório selecionar seu núcleo de origem.' : tipo === 'ex_aluno' ? 'Seu perfil será validado contra a lista oficial de formados.' : 'Seu perfil terá acesso imediato aos conteúdos liberados para sua categoria.'}
              </p>
            </div>
          )}

          {tipo === 'ex_aluno' && !alumniVerified && (
            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px', border: '1px solid rgba(var(--primary-rgb), 0.1)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                Clique no botão abaixo para confirmar se seu nome consta na nossa lista oficial de formados.
              </p>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={verifyAlumniStatus}
                disabled={loading}
              >
                {loading ? <Loader2 className="spinner" /> : <ShieldCheck size={18} />} Verificar Meu Nome na Lista
              </button>
            </div>
          )}

          {alumniVerified && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: '12px', color: 'var(--success)', fontSize: '0.9rem', textAlign: 'center' }}>
              <ShieldCheck size={24} style={{ marginBottom: '0.5rem' }} />
              <p><strong>Identidade Confirmada!</strong></p>
              <p>Olá, {alumniVerified.nome}. Sua conta será vinculada ao registro de formado.</p>
            </div>
          )}

          {tipo === 'presencial' && (
            <div className="form-group">
              <label>Seu Núcleo de Origem</label>
              <select 
                className="form-control" 
                value={nucleo}
                onChange={(e) => setNucleo(e.target.value)}
                required
                disabled={!!preRegistered && !!preRegistered.nucleo}
              >
                <option value="">Selecione seu núcleo...</option>
                {availableNucleos.map(n => (
                  <option key={n.id} value={n.id}>{n.nome}</option>
                ))}
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
