import React from 'react'
import { Documento } from '../../../types/dashboard'

interface DocumentUploadProps {
  documents: Documento[]
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'doc', id?: string, docType?: string) => void
  uploading: string | null
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ documents, handleFileUpload, uploading }) => {
  const labelMap: Record<string, string> = {
    rg: 'RG / CNH',
    residencia: 'Comprovante de Residência',
    certidao: 'Certidões (Nasc./Cas.)',
    exame: 'Exame Médico',
    outro: 'Outros'
  }

  return (
    <div className="data-card">
      <h3>Documentação Obrigatória</h3>
      {['rg', 'residencia', 'certidao'].map(t => {
        const d = documents.find(doc => doc.tipo === t)
        return (
          <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>{labelMap[t] || t.toUpperCase()}</span>
              {d && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Enviado em: {new Date(d.created_at).toLocaleDateString()}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              {d && (
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: d.status === 'aprovado' ? 'rgba(34, 197, 94, 0.1)' : d.status === 'rejeitado' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                  color: d.status === 'aprovado' ? '#22c55e' : d.status === 'rejeitado' ? '#ef4444' : '#eab308' 
                }}>
                  {d.status.toUpperCase()}
                </span>
              )}
              <label className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', cursor: 'pointer', width: 'auto', minWidth: '100px', textAlign: 'center' }}>
                {uploading === t ? 'Enviando...' : (d ? 'Alterar Arquivo' : 'Enviar Documento')}
                <input 
                  type="file" 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleFileUpload(e, 'doc', undefined, t)} 
                  disabled={uploading !== null}
                />
              </label>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default DocumentUpload
