import React, { useState, useRef } from 'react'
import { CreditCard, CheckCircle2, AlertCircle, ShieldAlert, ClipboardList, Clock, Upload, Loader2 } from 'lucide-react'
import { Pagamento } from '../../../types/dashboard'
import PaymentCard from './PaymentCard'

interface FinancePanelProps {
  isExempt: boolean
  pixConfig: { pixKey: string, pixQrUrl: string }
  payments: Pagamento[]
  uploading: string | null
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'pay', id?: string) => void
  handleNotifyPayment: (id?: string) => Promise<void>
  showToast: (msg: string) => void
  isBlockedDueToPayment?: boolean
  isPastDue?: boolean
  handleRequestExtension: () => Promise<void>
}

const FinancePanel: React.FC<FinancePanelProps> = ({ 
  isExempt, 
  pixConfig, 
  payments, 
  uploading,
  handleFileUpload,
  handleNotifyPayment,
  showToast,
  isBlockedDueToPayment,
  handleRequestExtension
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  
  const activePayments = payments.filter(p => ['aberto', 'rejeitado', 'pago', 'pendente'].includes(p.status));

  const onNotifyClick = async (id?: string) => {
    if (id) {
      setPendingFile(id);
      fileInputRef.current?.click();
    } else {
      await handleNotifyPayment();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e, 'pay', pendingFile || undefined);
    setPendingFile(null);
  };

  const onPaymentCardUpload = async (file: File) => {
    const openPayment = activePayments[0];
    const dt = new DataTransfer();
    dt.items.add(file);
    const fakeEvent = { target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>;
    setPendingFile(openPayment?.id || null);
    setTimeout(() => {
      handleFileUpload(fakeEvent, 'pay', openPayment?.id || undefined);
      setPendingFile(null);
    }, 0);
  };

  return (
    <div className="data-card" style={{ background: 'transparent', border: 'none', padding: 0 }}>
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept="image/*,application/pdf"
        onChange={onFileChange}
      />

      {/* URGENT BLOCK BANNER */}
      {isBlockedDueToPayment && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem 2rem',
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid var(--error)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          animation: 'pulse-border 2s infinite'
        }}>
          <ShieldAlert size={40} color="var(--error)" />
          <div style={{ flex: 1 }}>
            <h3 style={{ color: 'var(--error)', margin: 0, fontSize: '1.2rem' }}>Acesso Suspenso</h3>
            <p style={{ fontSize: '0.95rem', margin: '0.25rem 0 0', opacity: 0.9 }}>
              Seu acesso foi bloqueado automaticamente por falta de pagamento ou envio de comprovante (vencimento dia 12). 
              <strong> Realize o pagamento e envie o comprovante abaixo para análise imediata.</strong>
            </p>
          </div>
          <button 
            className="btn" 
            style={{ background: 'var(--error)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', fontWeight: 800, borderRadius: '12px' }}
            onClick={handleRequestExtension}
          >
            Prorrogar dia 15
          </button>
        </div>
      )}

      {/* Informativo Santander & Isenções */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '1rem 1.5rem',
        background: 'rgba(236, 0, 0, 0.06)',
        border: '1px solid rgba(236, 0, 0, 0.25)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <strong style={{ color: '#ff4d4d', fontSize: '0.95rem' }}>PIX Banco Santander • Fatesa</strong>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
              Favorecido: <strong>MARIA HELENA PIRANI CAVALLERO</strong> | Chave Telefone: <strong>11958259144</strong>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: 'var(--primary, #0056b3)', color: '#ffffff', borderRadius: '10px', fontWeight: 800 }}>
            🗓️ Meses de Janeiro e Julho Isentos
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          A partir de Novembro, o pop-up com a chave Pix abre a cada login para todos os alunos pagantes até o envio e validação do comprovante. Os valores são personalizados por núcleo.
        </p>
      </div>

      {/* Standard Payment Card */}
      <div style={{ marginBottom: '2.5rem' }}>
        <PaymentCard
          pixKey={pixConfig.pixKey || '11958259144'}
          pixQrUrl={pixConfig.pixQrUrl}
          uploading={!!uploading}
          onUpload={onPaymentCardUpload}
          onCopyKey={() => showToast('Chave PIX copiada!')}
        />
      </div>

      {/* BILLING LIST */}
      <div className="data-card" style={{ padding: '2.5rem', borderRadius: '28px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h4 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardList size={22} color="var(--primary)" /> Histórico Financeiro
          </h4>
        </div>
        
        {isExempt ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.03)', borderRadius: '24px', border: '1px dashed var(--success)' }}>
            <CheckCircle2 color="var(--success)" size={56} style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.5rem', color: 'var(--success)', marginBottom: '0.5rem' }}>Bolsista / Isento</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Sua conta possui isenção de mensalidades.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {payments.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.3 }}>
                <CreditCard size={48} style={{ marginBottom: '1rem' }} />
                <p>Nenhuma movimentação financeira encontrada.</p>
              </div>
            ) : (
              payments.map(p => (
                <div key={p.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1.5rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: '20px', 
                  border: p.status === 'rejeitado' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '12px', 
                      background: p.status === 'aprovado' ? 'rgba(16, 185, 129, 0.1)' : (p.status === 'pago') ? 'rgba(234, 179, 8, 0.1)' : 'rgba(244, 63, 94, 0.1)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {p.status === 'aprovado' ? (
                        <CheckCircle2 color="var(--success)" size={24} />
                      ) : p.status === 'pago' ? (
                        <Clock color="#EAB308" size={24} />
                      ) : (
                        <AlertCircle color="var(--error)" size={24} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>R$ {p.valor.toFixed(2)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Vencimento: {new Date(p.data_vencimento).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {p.status === 'aprovado' ? (
                      <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1rem', borderRadius: '50px' }}>
                        PAGAMENTO VALIDADO
                      </div>
                    ) : p.status === 'pago' ? (
                      <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', background: 'var(--primary, #0056b3)', padding: '0.5rem 1rem', borderRadius: '50px' }}>
                        EM ANÁLISE
                      </div>
                    ) : (
                      <button 
                        className="btn btn-primary" 
                        onClick={() => onNotifyClick(p.id)}
                        disabled={uploading === p.id}
                        style={{ width: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.85rem', borderRadius: '12px', gap: '0.5rem', display: 'inline-flex', alignItems: 'center' }}
                      >
                        {uploading === p.id ? <Loader2 size={16} className="spinner" /> : <Upload size={16} />}
                        ANEXAR COMPROVANTE
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-border {
          0% { border-color: var(--error); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.4); }
          70% { border-color: var(--error); box-shadow: 0 0 0 10px rgba(244, 63, 94, 0); }
          100% { border-color: var(--error); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
        }
      `}</style>
    </div>
  )
}

export default FinancePanel
