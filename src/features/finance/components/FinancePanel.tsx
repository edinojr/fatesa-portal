import React from 'react'
import { CreditCard, CheckCircle2, AlertCircle, Upload, Copy, Info, ShieldAlert, QrCode, Loader2, ClipboardList, XCircle } from 'lucide-react'
import { Pagamento } from '../../../types/dashboard'

interface FinancePanelProps {
  isExempt: boolean
  pixConfig: { pixKey: string, pixQrUrl: string }
  payments: Pagamento[]
  uploading: string | null
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'pay', id?: string) => void
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
  showToast,
  isBlockedDueToPayment,
  isPastDue,
  handleRequestExtension
}) => {
  return (
    <div className="data-card" style={{ background: 'transparent', border: 'none', padding: 0 }}>
      
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
              <strong> Realize o pagamento ou solicite o desbloqueio de emergência abaixo.</strong>
            </p>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ width: 'auto', padding: '0.75rem 1.5rem', background: 'var(--error)', boxShadow: '0 4px 15px rgba(244, 63, 94, 0.4)' }}
            onClick={handleRequestExtension}
          >
            Liberar 3 Dias
          </button>
        </div>
      )}

      {/* WARNING BANNER (PAST DUE BUT NOT BLOCKED) */}
      {!isBlockedDueToPayment && isPastDue && (
        <div style={{
          marginBottom: '2rem',
          padding: '1rem 1.5rem',
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid #EAB308',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <AlertCircle size={24} color="#EAB308" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.9rem', margin: 0, color: '#EAB308', fontWeight: 600 }}>
              Atenção: O prazo para envio do comprovante vence em breve (dia 12). 
              Evite a suspensão automática do seu acesso.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        
        {/* PIX MASTER CARD */}
        <div className="glass-card" style={{ 
          padding: '2.5rem', 
          borderRadius: '24px', 
          background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(20, 20, 20, 0.8) 100%)',
          border: '1px solid var(--glass-border)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.6rem', background: 'var(--primary)', borderRadius: '12px' }}>
              <CreditCard size={24} color="#fff" />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Chave PIX</h3>
          </div>

          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
            O pagamento deve ser realizado entre os dias <strong>01 e 12</strong> de cada mês para garantir o acesso.
          </p>

          {pixConfig.pixKey ? (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                background: 'rgba(0,0,0,0.4)', 
                padding: '1.2rem', 
                borderRadius: '16px', 
                border: '1px solid var(--glass-border)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                gap: '1rem',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}>
                <code style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', letterSpacing: '1px', wordBreak: 'break-all' }}>{pixConfig.pixKey}</code>
                <button 
                  className="btn-icon" 
                  onClick={() => {
                    navigator.clipboard.writeText(pixConfig.pixKey);
                    showToast('Chave PIX copiada!');
                  }}
                  style={{ background: 'var(--primary)', color: '#fff', padding: '0.75rem', borderRadius: '12px' }}
                >
                  <Copy size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '1.5rem', background: 'rgba(255, 77, 77, 0.05)', borderRadius: '16px', border: '1px solid rgba(255, 77, 77, 0.1)', textAlign: 'center', marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--error)' }}>Chave PIX não configurada.</p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '1rem', background: 'rgba(156, 39, 176, 0.05)', borderRadius: '12px' }}>
            <Info size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.85rem' }}>Copie a chave e utilize o App do seu banco.</span>
          </div>
        </div>

        {/* QR CODE & INSTANT UPLOAD */}
        <div className="glass-card" style={{ 
          padding: '2.5rem', 
          borderRadius: '24px', 
          background: 'var(--bg-card)', 
          border: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          {pixConfig.pixQrUrl ? (
             <>
               <div style={{ background: '#fff', padding: '1rem', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', marginBottom: '1.5rem' }}>
                  <img src={pixConfig.pixQrUrl} alt="QR Code PIX" style={{ width: '140px', height: '140px' }} />
               </div>
               <span style={{ fontSize: '0.8rem', fontWeight: 800, opacity: 0.5, letterSpacing: '1px' }}>QR CODE PARA PAGAMENTO</span>
             </>
          ) : (
            <div style={{ padding: '2rem' }}>
              <QrCode size={64} opacity={0.1} />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>QR Code Indisponível</p>
            </div>
          )}
          
          <div style={{ width: '100%', height: '1px', background: 'var(--glass-border)', margin: '2rem 0' }}></div>
          
          <h4 style={{ marginBottom: '1rem' }}>Já pagou?</h4>
          <label className="btn btn-primary" style={{ width: '100%', padding: '1rem', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            {uploading === 'pay' || uploading === 'general' ? <Loader2 className="spinner" size={20} /> : <Upload size={20} />}
            {uploading ? 'Enviando...' : 'Enviar Comprovante Agora'}
            <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'pay')} />
          </label>
        </div>
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
                  padding: '1.75rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: '20px', 
                  border: p.status === 'rejeitado' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  transition: 'transform 0.2s',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '16px', 
                      background: p.status === 'pago' ? 'rgba(16, 185, 129, 0.1)' : p.status === 'rejeitado' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {p.status === 'pago' ? (
                        <CheckCircle2 color="var(--success)" size={28} />
                      ) : p.status === 'rejeitado' ? (
                        <XCircle color="var(--error)" size={28} />
                      ) : (
                        <AlertCircle color="#EAB308" size={28} />
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.5px' }}>R$ {p.valor.toFixed(2)}</div>
                        {p.status === 'rejeitado' && (
                          <span style={{ background: 'var(--error)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>RECUSADO</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {p.descricao || 'Mensalidade'} • Vencimento: {new Date(p.data_vencimento).toLocaleDateString('pt-BR')}
                      </div>
                      {p.status === 'rejeitado' && p.feedback && (
                        <div style={{ 
                          marginTop: '0.75rem', 
                          padding: '0.75rem', 
                          background: 'rgba(244, 63, 94, 0.05)', 
                          borderRadius: '8px', 
                          borderLeft: '3px solid var(--error)',
                          fontSize: '0.85rem',
                          color: '#ff8a95'
                        }}>
                          <strong>Motivo:</strong> {p.feedback}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {p.status === 'pago' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.9rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.6rem 1.25rem', borderRadius: '50px' }}>
                        <CheckCircle2 size={16} /> VALIDADO
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {p.status !== 'rejeitado' && (
                          <div className="status-badge" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#EAB308', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '0.6rem 1rem' }}>PENDENTE</div>
                        )}
                        <label className={`btn ${p.status === 'rejeitado' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', fontSize: '0.85rem', cursor: 'pointer', width: 'auto', background: p.status === 'rejeitado' ? 'var(--error)' : '', border: p.status === 'rejeitado' ? 'none' : '' }}>
                          <Upload size={16} /> {uploading === p.id ? 'Sincronizando...' : p.status === 'rejeitado' ? 'Reenviar Comprovante' : 'Anexar Comprovante'}
                          <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'pay', p.id)} />
                        </label>
                      </div>
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
        .status-badge {
          font-weight: 700;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-radius: 50px;
        }
      `}</style>
    </div>
  )
}

export default FinancePanel
