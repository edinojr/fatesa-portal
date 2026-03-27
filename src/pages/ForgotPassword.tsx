import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Mail, Loader2, ChevronLeft, CheckCircle2 } from 'lucide-react'
import Logo from '../components/common/Logo'

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar o e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center" style={{ textAlign: 'center' }}>
          <CheckCircle2 size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ marginBottom: '1rem', fontSize: '1.8rem' }}>E-mail Enviado!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Enviamos as instruções de recuperação para <strong style={{color: '#fff'}}>{email}</strong>. Por favor, verifique sua caixa de entrada e sua pasta de spam.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>Voltar ao Login</Link>
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
          <h1 style={{ fontSize: '2rem' }}>Recuperar Senha</h1>
          <p>Insira seu e-mail institucional para receber um link de redefinição seguro.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>E-mail Cadastrado</label>
            <input
              type="email"
              className="form-control"
              placeholder="aluno@fatesa.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-msg" style={{ marginBottom: '1.5rem' }}>{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? <Loader2 className="spinner" /> : <><Mail size={20} /> Recuperar Senha</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
