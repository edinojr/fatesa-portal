import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Loader2, CheckCircle2, AlertCircle, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import Logo from '../components/common/Logo';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Escutar por mudanças de hash da recuperação de senha no momento que o componente carrega.
    const listener = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Fluxo de Recuperação PKCE ativado com sucesso via URL.
      }
    });
    
    return () => {
      listener.data.subscription.unsubscribe();
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('A senha deve ter no mínimo 8 caracteres, com pelo menos uma letra maiúscula, uma minúscula e um número.');
      return;
    }

    if (password !== confirmPassword) {
      setError('A confirmação não coincide com a nova senha.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 3000);
      
    } catch (err: any) {
      setError(err.message || 'Houve um erro técnico. Se o link expirou de validade, contate a coordenação ou solicite outra troca.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center" style={{ textAlign: 'center' }}>
          <CheckCircle2 size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ marginBottom: '1rem', fontSize: '1.8rem' }}>Senha Redefinida!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Sua senha foi blindada e atualizada com sucesso. Agora a plataforma está redirecionando o seu navegador logado para o Painel Geral.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header" style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Logo size={80} />
          </div>
          <h1 style={{ fontSize: '2rem' }}>Sua Nova Senha</h1>
          <p>Digite e confirme a sua nova credencial de acesso impenetrável à plataforma educacional FATESA.</p>
        </div>

        <form onSubmit={handleReset}>
          <div className="form-group">
            <label>Crie a Nova Senha</label>
            <div className="password-field" style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="Mínimo de 8 caracteres seguros"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="field-hint">Maiúsculas, minúsculas e números obrigatórios.</p>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label>Repita para Confirmar</label>
            <div className="password-field" style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="form-control"
                placeholder="Digite a senha idêntica acima"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <div className="error-msg" style={{ marginBottom: '1.5rem' }}>{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '2rem' }}>
            {loading ? <Loader2 className="spinner" /> : <><Lock size={20} /> Blindar Nova Senha</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
