import React from 'react'
import { CreditCard, CheckCircle2, AlertCircle, Upload } from 'lucide-react'
import { Pagamento } from '../../types/dashboard'

interface FinancePanelProps {
  isExempt: boolean
  pixConfig: { key: string, qr: string }
  payments: Pagamento[]
  uploading: string | null
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'pay', id?: string) => void
  showToast: (msg: string) => void
}

const FinancePanel: React.FC<FinancePanelProps> = ({ isExempt, pixConfig, payments, uploading, handleFileUpload, showToast }) => {
  return (
    <div className="data-card">
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CreditCard /> Financeiro e Mensalidades</h3>
      
      {isExempt ? (
        <div style={{ padding: '2rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.1)', textAlign: 'center' }}>
          <CheckCircle2 color="var(--success)" size={32} style={{ marginBottom: '1rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--success)' }}>Você possui isenção ou gratuidade ativa.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Nenhum pagamento é necessário no momento.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {(pixConfig.key || pixConfig.qr) && (
            <div style={{ padding: '1.5rem', background: 'var(--glass)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1rem' }}>Pagamento via PIX</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Utilize a chave abaixo ou o QR Code ao lado para realizar o pagamento. Após concluir, anexe o comprovante na mensalidade correspondente abaixo.</p>
                  
                  {pixConfig.key && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <code style={{ fontSize: '1rem', color: '#fff', letterSpacing: '1px' }}>{pixConfig.key}</code>
                      <button 
                        className="btn btn-outline" 
                        style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          navigator.clipboard.writeText(pixConfig.key);
                          showToast('Chave PIX copiada!');
                        }}
                      >Copiar Chave</button>
                    </div>
                  )}
                </div>
                
                {pixConfig.qr && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '12px', width: '130px', height: '130px', margin: '0 auto 0.5rem' }}>
                      <img src={pixConfig.qr} alt="QR Code PIX" style={{ width: '100%', height: '100%' }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>QR Code do Polo</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '1rem', opacity: 0.8 }}>Minhas Mensalidades</h4>
            {payments.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {p.status === 'pago' ? <CheckCircle2 color="var(--success)" size={20} /> : <AlertCircle color="#EAB308" size={20} />}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>R$ {p.valor.toFixed(2)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vencimento: {new Date(p.data_vencimento).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  {p.status === 'pago' ? (
                    <div className="status-badge status-approved">Pago</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div className="status-badge status-pending" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#EAB308', border: '1px solid rgba(234, 179, 8, 0.2)' }}>Em Aberto</div>
                      <label className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Upload size={14} /> {uploading === p.id ? 'Enviando...' : 'Anexar Comprovante'}
                        <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'pay', p.id)} />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma mensalidade registrada até o momento.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancePanel
