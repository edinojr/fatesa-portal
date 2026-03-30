import React from 'react'
import { Documento } from '../../../types/dashboard'

interface DocumentUploadProps {
  documents: Documento[]
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'doc', id?: string, docType?: string) => void
  uploading: string | null
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ documents, handleFileUpload, uploading }) => {
  return (
    <div className="data-card">
      <h3>Documentos</h3>
      {['rg', 'residencia', 'exame'].map(t => {
        const d = documents.find(doc => doc.tipo === t)
        return (
          <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--glass-border)', alignItems: 'center' }}>
            <span>{t.toUpperCase()}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {d && (
                <span style={{ fontSize: '0.8rem', color: d.status === 'aprovado' ? 'var(--success)' : d.status === 'rejeitado' ? 'var(--error)' : 'var(--warning)' }}>
                  {d.status.toUpperCase()}
                </span>
              )}
              <label className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
                {uploading === t ? 'Enviando...' : (d ? 'Alterar' : 'Enviar')}
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
