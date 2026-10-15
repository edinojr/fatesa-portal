import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { UserPlus, Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft, Clock, Search } from 'lucide-react'
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
  const [showReturnButton, setShowReturnButton] = useState(false)

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

        if (regRes.error) {
          console.error('RPC get_registration_details falhou:', regRes.error);
          // 400 indica que a função não foi encontrada ou argumentos inválidos
          // Isso costuma acontecer em ambientes onde a migração de banco não foi concluída
        }

        if (regRes.data && regRes.data.length > 0) {
          const reg = regRes.data[0];
          console.log('Pré-registro encontrado:', reg);
          setPreRegistered(reg);
          setNome(reg.nome);
          // Garantir que tipos administrativos sejam convertidos para tipos de aluno válidos na UI
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

  const [alumniCheckStatus, setAlumniCheckStatus] = useState<'idle' | 'found' | 'not_found'>('idle')

  const verifyAlumniStatus = async (manualCheck = false) => {
    if (!nome.trim() && !email.trim()) return;

    setLoading(true);
    setError(null);
    try {
      let found = null;
      // 1. Tentar buscar por e-mail se informado
      if (email && email.includes('@')) {
        const { data: byEmail } = await supabase
          .from('registros_alumni')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();
        if (byEmail) found = byEmail;
      }

      // 2. Tentar buscar por nome exato
      if (!found && nome.trim().length >= 3) {
        const { data: byName } = await supabase
          .from('registros_alumni')
          .select('*')
          .ilike('nome', nome.trim())
          .limit(1)
          .maybeSingle();
        if (byName) found = byName;
      }

      // 3. Fallback: buscar por aproximação se clicou no botão manual
      if (!found && manualCheck && nome.trim().length >= 4) {
        const { data: byNamePartial } = await supabase
          .from('registros_alumni')
          .select('*')
          .ilike('nome', `%${nome.trim()}%`)
          .limit(1)
          .maybeSingle();
        if (byNamePartial) found = byNamePartial;
      }

      if (found) {
        setAlumniVerified(found);
        setAlumniCheckStatus('found');
        setTipo('ex_aluno');
      } else {
        setAlumniVerified(null);
        if (manualCheck || (nome.trim().length >= 4 && email.includes('@'))) {
          setAlumniCheckStatus('not_found');
        }
      }
    } catch (err: any) {
      console.error('Erro na verificação de alumni:', err);
    } finally {
      setLoading(false);
    }
  };

  // Autoverificar quando nome ou email mudar no modo ex_aluno
  useEffect(() => {
    if (tipo === 'ex_aluno' && ((nome && nome.length >= 4) || (email && email.includes('@')))) {
      const timer = setTimeout(() => verifyAlumniStatus(false), 1200);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, email, tipo]);

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
    setShowReturnButton(false)

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
            nucleo_id: nucleo.includes('-') ? nucleo : null,
            // Liberar automaticamente se for alumni confirmado
            acesso_definitivo: !!alumniVerified
          }
        }
      })

      if (authError) throw authError

      // 2. Vincular ou Criar Registro de Formado
      if (authData.user && tipo === 'ex_aluno') {
        if (alumniVerified) {
          // Constava na lista: vincula conta
          const { error: rpcErr } = await supabase.rpc('vincular_alumni_cadastro', {
            p_alumni_id: alumniVerified.id,
            p_user_id: authData.user.id,
            p_email: email.toLowerCase().trim()
          });
          if (rpcErr) {
            await supabase
              .from('registros_alumni')
              .update({ user_id: authData.user.id, email: email.toLowerCase().trim(), status_aprovacao: 'aprovado' })
              .eq('id', alumniVerified.id);
          }
        } else {
          // NÃO constava na lista: cria registro pendente de aprovação
          const nucleoName = availableNucleos.find(n => n.id === nucleo)?.nome || nucleo || 'Geral';
          const { error: rpcErr } = await supabase.rpc('solicitar_cadastro_alumni', {
            p_nome: nome.toUpperCase().trim(),
            p_email: email.toLowerCase().trim(),
            p_user_id: authData.user.id,
            p_nucleo: nucleoName
          });
          if (rpcErr) {
            await supabase.from('registros_alumni').insert({
              nome: nome.toUpperCase().trim(),
              email: email.toLowerCase().trim(),
              curso: 'Teologia',
              nivel_curso: 'Básico',
              nucleo: nucleoName,
              ano_formacao: 'Pendente',
              user_id: authData.user.id,
              status_aprovacao: 'pendente',
              observacoes: '[PENDENTE_APROVACAO] Cadastro realizado no portal - Aguardando aprovação administrativa.'
            });
          }
        }
      }

      // 4. Roteamento pós-cadastro
      // Alumni e staff autorizado têm acesso imediato ao portal (alumni não aprovado entra na sala de espera)
      const trustedImmediate = tipo === 'ex_aluno' || !!alumniVerified || isProfessor || isAdmin

      if (authData.user && authData.session && (authData.user.email_confirmed_at || trustedImmediate)) {
        navigate('/dashboard', { replace: true })
      } else if (authData.user) {
        // Sem sessão confirmada: encerra qualquer sessão temporária e avisa o aluno
        if (authData.session) {
          await supabase.auth.signOut()
        }
        setError('Cadastro iniciado! Verifique seu e-mail (incluindo pasta de spam) e clique no link de confirmação para ativar sua conta. Após confirmar, faça login.')
      } else {
        navigate('/login', { replace: true })
      }

    } catch (err: any) {
      if (err.status === 422 || err.message?.includes('already registered')) {
        const { data: existingUser } = await supabase.from('users').select('status_nucleo').eq('email', email.toLowerCase().trim()).maybeSingle();
        if (existingUser && existingUser.status_nucleo === 'hiato') {
          setError('Você está cadastrado como desistente (hiato). Se deseja retornar ao curso, clique no botão abaixo para falar com o suporte/financeiro e reativar sua matrícula.');
          setShowReturnButton(true);
        } else {
          setError('Este e-mail já está ativado no portal. Tente fazer login ou recuperar sua senha.')
        }
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container" style={{ position: 'relative' }}>
      <Link to="/login" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, background: 'var(--primary)', padding: '0.6rem 1.2rem', borderRadius: '50px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 9999 }}>
        <ArrowLeft size={18} /> Voltar
      </Link>
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
            <label htmlFor="signup-nome">Nome Completo</label>
            <input
              id="signup-nome"
              name="nome"
              type="text"
              className="form-control"
              placeholder="Digite seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              readOnly={!!preRegistered}
              style={{ opacity: preRegistered ? 0.7 : 1 }}
              autoComplete="name"
            />
          </div>

          {!(isProfessor || isAdmin || (preRegistered && (preRegistered.tipo === 'professor' || preRegistered.tipo === 'admin'))) && (
            <div className="form-group">
              <label htmlFor="signup-tipo">Tipo de Cadastro</label>
              <select 
                id="signup-tipo"
                name="tipo"
                className="form-control" 
                value={tipo} 
                onChange={(e) => setTipo(e.target.value as any)}
                required
                disabled={!!preRegistered}
              >
                <option value="presencial">Aluno Presencial (Já Matriculado)</option>
                <option value="super_visitante">Super Visitante (Acesso Vídeos)</option>
                <option value="ex_aluno">Formado (Acesso Conteúdo)</option>
                <option value="colaborador">Colaborador / Parceiro</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {tipo === 'presencial' ? 'Obrigatório selecionar seu núcleo de origem.' : tipo === 'ex_aluno' ? 'Seu perfil será validado contra a lista oficial de Formados.' : 'Seu perfil terá acesso imediato aos conteúdos liberados para sua categoria.'}
              </p>
            </div>
          )}

          {tipo === 'ex_aluno' && (
            <div style={{ marginBottom: '1.5rem' }}>
              {alumniCheckStatus === 'found' && alumniVerified ? (
                <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: '12px', color: 'var(--success)', fontSize: '0.9rem', textAlign: 'center' }}>
                  <ShieldCheck size={28} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 800 }}>Nome Localizado na Lista Oficial!</p>
                  <p style={{ margin: 0 }}>Olá, <strong>{alumniVerified.nome}</strong>. Sua conta será vinculada imediatamente como Aluno Formado.</p>
                </div>
              ) : alumniCheckStatus === 'not_found' ? (
                <div style={{ padding: '1.25rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #f59e0b', borderRadius: '12px', color: '#b45309', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 800 }}>
                    <Clock size={20} color="#d97706" /> Nome não localizado na lista preliminar
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', lineHeight: 1.5, color: 'var(--text-main, #333)' }}>
                    Não se preocupe! Você pode concluir seu cadastro agora. Sua solicitação entrará na <strong>Área de Espera para Aprovação da Administração</strong> e será liberada pela secretaria após a conferência.
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>
                    Preencha seus dados de senha abaixo e clique em Ativar Meu Acesso.
                  </p>
                </div>
              ) : (
                <div style={{ padding: '1.25rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px', border: '1px solid rgba(var(--primary-rgb), 0.1)', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.88rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                    Digite seu Nome Completo acima e clique abaixo para conferir se seu nome já consta na lista de Formados.
                  </p>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => verifyAlumniStatus(true)}
                    disabled={loading || !nome.trim()}
                  >
                    {loading ? <Loader2 className="spinner" size={18} /> : <Search size={18} />} 
                    Verificar Meu Nome na Lista Oficial
                  </button>
                </div>
              )}
            </div>
          )}

          {tipo === 'presencial' && (
            <div className="form-group">
              <label htmlFor="signup-nucleo">Seu Núcleo de Origem</label>
              <select 
                id="signup-nucleo"
                name="nucleo"
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
            <label htmlFor="signup-email">E-mail</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              className="form-control"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
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
            <label htmlFor="signup-password">Crie uma Senha</label>
            <div className="password-field">
              <input
                id="signup-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="Mín. 8 caracteres, A-z, 0-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
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
            <label htmlFor="signup-confirm-password">Confirme sua Senha</label>
            <div className="password-field">
              <input
                id="signup-confirm-password"
                name="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                className="form-control"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
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
