import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../hooks/useProfile';
import { getTargetDueDate } from '../lib/paymentCycle';
import { 
  AlertCircle, 
  CreditCard, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  LogOut,
  ChevronRight,
  Info
} from 'lucide-react';

const BlockedAccess: React.FC = () => {
  const { profile, signOut } = useProfile();
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pixKey, setPixKey] = useState<string>('');
  const [pixQrUrl, setPixQrUrl] = useState<string>('');
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase.from('configuracoes').select('chave, valor');
      if (data) {
        data.forEach(item => {
          if (item.chave === 'pix_key') setPixKey(item.valor);
          if (item.chave === 'pix_qr_url') setPixQrUrl(item.valor);
        });
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('comprovantes').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(filePath);

      const targetDueDate = getTargetDueDate();

      const { error: dbError } = await supabase.from('pagamentos').insert({
        user_id: profile.id,
        valor: 0,
        status: 'pago', // 'pago' aqui significa "enviado para validação"
        comprovante_url: publicUrl,
        data_vencimento: targetDueDate,
        descricao: 'Comprovante enviado via Central de Bloqueio'
      });

      if (dbError) throw dbError;

      setSuccess(true);
    } catch (err: any) {
      alert('Falha no upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="auth-container" style={{ minHeight: '100vh', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <div className="auth-card" style={{ maxWidth: '600px', width: '100%', border: '1px solid rgba(255, 71, 87, 0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: 'rgba(255, 71, 87, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 1.5rem',
            border: '2px solid rgba(255, 71, 87, 0.3)',
            animation: 'pulse 2s infinite'
          }}>
            <AlertCircle size={40} color="#ff4757" />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#fff' }}>Acesso Suspenso</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Não identificamos o pagamento referente ao ciclo de <strong>{currentMonth}</strong>.
          </p>
        </div>

        {success ? (
          <div style={{ 
            background: 'rgba(46, 213, 115, 0.1)', 
            padding: '2rem', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid rgba(46, 213, 115, 0.2)'
          }}>
            <CheckCircle2 size={48} color="#2ed573" style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Recebemos seu comprovante!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Nossa equipe administrativa validará seu pagamento em breve para liberar seu acesso.
            </p>
            <button className="btn btn-primary" style={{ marginTop: '1.5rem', width: 'auto' }} onClick={() => window.location.reload()}>
              Entendi
            </button>
          </div>
        ) : (
          <>
            <div style={{ 
              background: 'rgba(255,255,255,0.03)', 
              borderRadius: '12px', 
              padding: '1.5rem', 
              marginBottom: '2rem',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                <CreditCard size={20} />
                <span style={{ fontWeight: 600 }}>Dados para Pagamento (PIX)</span>
              </div>
              
              {loadingConfig ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Loader2 className="spinner" /></div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  {pixQrUrl && (
                    <img src={pixQrUrl} alt="QR Code PIX" style={{ width: '180px', height: '180px', borderRadius: '8px', marginBottom: '1rem', background: '#fff', padding: '10px' }} />
                  )}
                  {pixKey && (
                    <div style={{ 
                      background: 'rgba(0,0,0,0.3)', 
                      padding: '0.75rem', 
                      borderRadius: '8px', 
                      fontSize: '0.9rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Chave PIX:</span>
                      <code style={{ color: 'var(--primary)', fontWeight: 700, wordBreak: 'break-all' }}>{pixKey}</code>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="btn btn-primary" style={{ width: '100%', cursor: 'pointer', height: 'auto', padding: '1rem' }}>
                {uploading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Loader2 className="spinner" size={20} /> Enviando...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Upload size={20} /> Já paguei! Enviar Comprovante
                  </span>
                )}
                <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          </>
        )}

        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '0.75rem', 
          background: 'rgba(255,165,0,0.05)', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid rgba(255,165,0,0.1)'
        }}>
          <Info size={18} color="#ffa500" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            O prazo para envio do comprovante é até o dia <strong>12 de cada mês</strong>. 
            Após essa data, o acesso é suspenso preventivamente até a confirmação bancária.
          </p>
        </div>

        <button 
          onClick={signOut}
          style={{ 
            width: '100%', 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-muted)', 
            fontSize: '0.9rem', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '1rem',
            transition: 'color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <LogOut size={16} /> Sair do Portal
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(255, 71, 87, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
        }
      `}</style>
    </div>
  );
};

export default BlockedAccess;
