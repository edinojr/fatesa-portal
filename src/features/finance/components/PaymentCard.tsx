import React, { useRef } from 'react'
import { CreditCard, Copy, QrCode, Upload, Loader2 } from 'lucide-react'

interface PaymentCardProps {
  pixKey: string
  pixQrUrl?: string
  uploading?: boolean
  onUpload: (file: File) => Promise<void>
  onCopyKey?: () => void
}

const PaymentCard: React.FC<PaymentCardProps> = ({
  pixKey,
  pixQrUrl,
  uploading,
  onUpload,
  onCopyKey
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onUpload(file)
    e.target.value = ''
  }

  const copyKey = () => {
    navigator.clipboard.writeText(pixKey)
    onCopyKey?.()
  }

  return (
    <div
      className="data-card"
      style={{
        padding: '2.5rem',
        borderRadius: '28px',
        background: 'rgba(255,255,255,0.01)',
        border: '1px solid var(--glass-border)'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h4 style={{
          fontSize: '1.2rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <CreditCard size={22} color="#00f2fe" /> Pagamento via PIX
        </h4>
        <div style={{
          padding: '0.4rem 0.8rem',
          background: 'rgba(16, 185, 129, 0.1)',
          color: 'var(--success)',
          borderRadius: '10px',
          fontSize: '0.7rem',
          fontWeight: 800,
          whiteSpace: 'nowrap'
        }}>
          MENSALIDADE VIGENTE
        </div>
      </div>

      {/* PIX Key */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        padding: '1.5rem',
        borderRadius: '20px',
        marginBottom: '2rem',
        border: '1px solid var(--glass-border)'
      }}>
        <p style={{
          fontSize: '0.8rem',
          opacity: 0.6,
          marginBottom: '0.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Chave PIX (E-mail)
        </p>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--primary)',
            wordBreak: 'break-all'
          }}>
            {pixKey}
          </span>
          <button
            className="btn-icon"
            onClick={copyKey}
            style={{
              background: 'rgba(var(--primary-rgb), 0.1)',
              color: 'var(--primary)',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              flexShrink: 0,
              marginLeft: '1rem'
            }}
          >
            <Copy size={18} />
          </button>
        </div>
      </div>

      {/* QR Code + Upload */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {pixQrUrl ? (
          <div style={{
            background: '#fff',
            padding: '0.75rem',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            flexShrink: 0
          }}>
            <img
              src={pixQrUrl}
              alt="QR Code PIX"
              style={{ width: '100px', height: '100px', display: 'block' }}
            />
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 800,
              opacity: 0.5,
              letterSpacing: '1px',
              display: 'block',
              textAlign: 'center',
              marginTop: '0.4rem'
            }}>
              QR CODE
            </span>
          </div>
        ) : (
          <div style={{
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: 0
          }}>
            <QrCode size={40} opacity={0.15} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              QR Indisponível
            </p>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,application/pdf"
          onChange={handleFileChange}
        />

        <button
          type="button"
          className="btn btn-primary"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '1rem 2rem',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            fontWeight: 800,
            flex: 1,
            minWidth: '200px',
            boxShadow: '0 5px 15px rgba(var(--primary-rgb), 0.2)'
          }}
        >
          {uploading ? (
            <Loader2 className="spinner" size={18} />
          ) : (
            <Upload size={18} />
          )}
          {uploading ? 'Enviando...' : 'ENVIAR COMPROVANTE'}
        </button>
      </div>

      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default PaymentCard
