import React from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

interface SettingsPanelProps {
  pixKey: string
  setPixKey: (val: string) => void
  pixQrUrl: string
  handleSaveSettings: (e: React.FormEvent) => Promise<void>
  handleUploadQrCode: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  actionLoading: string | null
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  pixKey,
  setPixKey,
  pixQrUrl,
  handleSaveSettings,
  handleUploadQrCode,
  actionLoading
}) => {
  return (
    <div className="data-card" style={{ maxWidth: '600px' }}>
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CreditCard /> Configuração de Pagamento (PIX)
      </h3>
      <form onSubmit={handleSaveSettings}>
        <div className="form-group">
          <label>Chave PIX da Instituição</label>
          <input 
            type="text" 
            className="form-control" 
            value={pixKey} 
            onChange={e => setPixKey(e.target.value)} 
            placeholder="Ex: 00.000.000/0001-00" 
          />
        </div>
        <div className="form-group">
          <label>QR Code do PIX (Imagem)</label>
          {pixQrUrl && (
            <img 
              src={pixQrUrl} 
              alt="QR Code PIX oficial para pagamento na Fatesa Casa do Saber" 
              style={{ width: '150px', background: 'white', padding: '0.5rem', display: 'block', marginBottom: '1rem', borderRadius: '8px' }} 
            />
          )}
          <input 
            type="file" 
            accept="image/*" 
            className="form-control" 
            onChange={handleUploadQrCode} 
          />
        </div>
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={actionLoading === 'save-settings'}
        >
          {actionLoading === 'save-settings' ? <Loader2 className="spinner" /> : 'Salvar Configurações'}
        </button>
      </form>
    </div>
  );
};

export default SettingsPanel;
