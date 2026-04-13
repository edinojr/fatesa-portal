import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { graduationService } from '../services/graduationService';
import Logo from '../components/common/Logo';
import { CheckCircle, XCircle, Loader2, ShieldCheck, ArrowLeft, Search } from 'lucide-react';

const CertificateVerification = () => {
  const { code: urlCode } = useParams<{ code?: string }>();
  const [code, setCode] = useState(urlCode || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlCode) {
      handleVerify(urlCode);
    }
  }, [urlCode]);

  const handleVerify = async (verifyCode: string) => {
    if (!verifyCode) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await graduationService.verifyCertificate(verifyCode);
      if (data) {
        setResult(data);
      } else {
        setError('Certificado não encontrado ou código inválido.');
      }
    } catch (err: any) {
      setError('Erro ao verificar certificado. Verifique o código e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0a', 
      color: '#fff', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '2rem' 
    }}>
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <Logo size={250} />
      </div>

      <div className="admin-card" style={{ maxWidth: '600px', width: '100%', padding: '2.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', textAlign: 'center' }}>Verificação de Autenticidade</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>Insira o código impresso no certificado para validar os dados do formado.</p>

        <form onSubmit={(e) => { e.preventDefault(); handleVerify(code); }} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '1.1rem', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Ex: 550e8400-e29b-41d4-a716..."
              style={{ paddingLeft: '3rem', textTransform: 'uppercase', fontFamily: 'monospace' }}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 1.5rem' }} disabled={loading}>
            {loading ? <Loader2 className="spinner" /> : 'Verificar'}
          </button>
        </form>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader2 className="spinner" size={48} color="var(--primary)" />
            <p style={{ marginTop: '1rem', opacity: 0.6 }}>Consultando registros oficiais...</p>
          </div>
        )}

        {result && (
          <div style={{ 
            background: 'rgba(34, 197, 94, 0.05)', 
            border: '1px solid var(--success)', 
            borderRadius: '15px', 
            padding: '2rem',
            animation: 'fadeIn 0.5s ease'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <CheckCircle size={48} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
              <h2 style={{ color: 'var(--success)', margin: 0 }}>Certificado Autêntico</h2>
              <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Registro vinculado à Fatesa - Casa do Saber</p>
            </div>

            <div style={{ display: 'grid', gap: '1rem', fontSize: '1rem' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                <span style={{ opacity: 0.6, fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Nome do Formado</span>
                <strong style={{ fontSize: '1.2rem' }}>{result.nome}</strong>
              </div>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                <span style={{ opacity: 0.6, fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Curso / Especialidade</span>
                <strong>{result.curso}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ opacity: 0.6, fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Nível</span>
                  <strong>{result.nivel__curso || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ opacity: 0.6, fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Ano de Formação</span>
                  <strong>{result.ano_formacao}</strong>
                </div>
              </div>
              <div>
                <span style={{ opacity: 0.6, fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Polo / Núcleo</span>
                <strong>{result.nucleo}</strong>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.05)', 
            border: '1px solid var(--error)', 
            borderRadius: '15px', 
            padding: '2rem',
            textAlign: 'center',
            animation: 'shake 0.5s ease' 
          }}>
            <XCircle size={48} color="var(--error)" style={{ marginBottom: '0.5rem' }} />
            <h2 style={{ color: 'var(--error)', margin: 0 }}>Verificação Falhou</h2>
            <p style={{ marginTop: '0.5rem' }}>{error}</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '3rem', display: 'flex', gap: '1.5rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Voltar ao Início
        </Link>
        <span style={{ opacity: 0.2 }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
          <ShieldCheck size={16} /> Verificação Oficial Fatesa
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};

export default CertificateVerification;
