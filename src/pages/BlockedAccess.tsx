import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../hooks/useProfile';
import { getTargetDueDate } from '../lib/paymentCycle';
import { 
  AlertCircle, 
  CreditCard, 
  Check, 
  Clock, 
  ShieldAlert, 
  MessageCircle, 
  ExternalLink,
  ChevronRight,
  HelpCircle,
  FileText,
  Upload,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BlockedAccess: React.FC = () => {
  const { profile, loading, refreshProfile } = useProfile();
  const [notifying, setNotifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile && !profile.status_bloqueio) {
      navigate('/dashboard');
    }
  }, [profile, loading, navigate]);

  const handleNotifyPayment = async () => {
    if (!profile) return;
    setNotifying(true);
    try {
      const targetDueDate = getTargetDueDate();
      const { error: dbError } = await supabase.from('pagamentos').insert({
        user_id: profile.id,
        valor: 0,
        status: 'pago', 
        data_vencimento: targetDueDate,
        descricao: 'Aviso de Pagamento via Central de Bloqueio',
        data_pagamento: new Date().toISOString().split('T')[0]
      });

      if (dbError) throw dbError;
      setSuccess(true);
    } catch (err: any) {
      alert('Erro ao notificar: ' + err.message);
    } finally {
      setNotifying(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}_blocked_${Date.now()}.${fileExt}`;
      const filePath = `comprovantes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(filePath);

      const targetDueDate = getTargetDueDate();
      const { error: dbError } = await supabase.from('pagamentos').insert({
        user_id: profile.id,
        valor: 0,
        status: 'pago',
        comprovante_url: publicUrl,
        data_vencimento: targetDueDate,
        descricao: 'Aviso de Pagamento com Comprovante (via Bloqueio)',
        data_pagamento: new Date().toISOString().split('T')[0]
      });

      if (dbError) throw dbError;
      setSuccess(true);
    } catch (err: any) {
      alert('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'radial-gradient(circle at top right, #0f172a, #020617)', 
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ maxWidth: '800px', width: '100%', animation: 'fadeIn 0.6s ease-out' }}>
        
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: 'rgba(244, 63, 94, 0.1)', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            boxShadow: '0 10px 30px rgba(244, 63, 94, 0.1)'
          }}>
            <ShieldAlert size={40} color="#f43f5e" />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-1px' }}>Acesso Suspenso</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
            Identificamos uma pendência financeira que restringe seu acesso aos conteúdos acadêmicos.
          </p>
        </div>

        {success ? (
          <div style={{ 
            background: 'var(--glass)', 
            padding: '3rem', 
            borderRadius: '32px', 
            border: '1px solid var(--success)', 
            textAlign: 'center',
            animation: 'scaleIn 0.4s ease-out'
          }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              background: 'rgba(16, 185, 129, 0.1)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <Check size={32} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>Comprovante Enviado!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
              Recebemos sua notificação. Nosso departamento financeiro analisará o comprovante em até 24h úteis para liberar seu acesso.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              style={{ padding: '1rem 2.5rem' }}
            >
              Entendi, obrigado!
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            
            {/* Left Col: Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'var(--glass)', padding: '2rem', borderRadius: '28px', border: '1px solid var(--glass-border)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ExternalLink size={20} color="var(--primary)" /> Regularizar Agora
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button 
                      onClick={() => navigate('/dashboard')}
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'space-between', padding: '1.25rem' }}
                    >
                      <span>Ir para Área Financeira</span>
                      <ChevronRight size={18} />
                    </button>

                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                    />

                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || notifying}
                      className="btn btn-primary" 
                      style={{ 
                        width: '100%', 
                        padding: '1.25rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.2)'
                      }}
                    >
                      {uploading ? <Loader2 className="spinner" size={20} /> : <Upload size={20} />}
                      {uploading ? 'Enviando Arquivo...' : 'Anexar Comprovante agora'}
                    </button>
                </div>
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', gap: '1rem' }}>
                <HelpCircle size={24} color="#3b82f6" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: '#94a3b8' }}>
                  Dúvidas sobre sua mensalidade? Entre em contato com nosso suporte financeiro via WhatsApp.
                </p>
              </div>
            </div>

            {/* Right Col: Info */}
            <div style={{ background: 'var(--glass)', padding: '2.5rem', borderRadius: '28px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '32px', height: '32px', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} color="var(--primary)" />
                  </div>
                  <h4 style={{ fontWeight: 700, margin: 0 }}>Política de Acesso</h4>
                </div>
                <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                    <div style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', marginTop: '0.5rem', flexShrink: 0 }}></div>
                    O vencimento das mensalidades ocorre todo dia 10.
                  </li>
                  <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                    <div style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', marginTop: '0.5rem', flexShrink: 0 }}></div>
                    O bloqueio automático é ativado após o dia 12.
                  </li>
                  <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                    <div style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', marginTop: '0.5rem', flexShrink: 0 }}></div>
                    Pagamentos via boleto podem levar até 72h para compensar. Use o envio de comprovante para agilizar.
                  </li>
                </ul>
              </div>

              <a 
                href="https://wa.me/5516999999999" 
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1.25rem', 
                  background: 'rgba(34, 197, 94, 0.1)', 
                  borderRadius: '20px', 
                  color: '#22c55e',
                  textDecoration: 'none',
                  fontWeight: 700,
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  transition: 'transform 0.2s'
                }}
              >
                <MessageCircle size={24} />
                Falar com Financeiro
              </a>
            </div>

          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '4rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.2)' }}>
          © 2026 Fatesa - Faculdade de Teologia de Santo André. Todos os direitos reservados.
        </p>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default BlockedAccess;
