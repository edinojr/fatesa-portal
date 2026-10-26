import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Loader2, 
  Building2, 
  User, 
  DollarSign, 
  ShieldCheck, 
  Calendar, 
  Save, 
  CheckCircle2, 
  Info,
  Phone
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { financeService, PixFullConfig, DEFAULT_PIX_CONSTANTS } from '../../../services/financeService';

interface SettingsPanelProps {
  pixKey: string;
  setPixKey: (val: string) => void;
  pixQrUrl: string;
  handleSaveSettings: (e: React.FormEvent) => Promise<void>;
  handleUploadQrCode: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  actionLoading: string | null;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  pixKey,
  setPixKey,
  pixQrUrl,
  handleSaveSettings,
  handleUploadQrCode,
  actionLoading
}) => {
  const [fullConfig, setFullConfig] = useState<PixFullConfig>({
    pixKey: DEFAULT_PIX_CONSTANTS.pixKey,
    pixQrUrl: '',
    beneficiario: DEFAULT_PIX_CONSTANTS.beneficiario,
    banco: DEFAULT_PIX_CONSTANTS.banco,
    tipoChave: DEFAULT_PIX_CONSTANTS.tipoChave,
    nucleoValores: {}
  });

  const [nucleosList, setNucleosList] = useState<any[]>([]);
  const [localTuitions, setLocalTuitions] = useState<Record<string, number>>({});
  const [savingTuitions, setSavingTuitions] = useState(false);
  const [tuitionsSavedSuccess, setTuitionsSavedSuccess] = useState(false);

  useEffect(() => {
    loadSettingsAndNucleos();
  }, []);

  const loadSettingsAndNucleos = async () => {
    try {
      const [cfg, { data: nucs }] = await Promise.all([
        financeService.getPixFullConfig(),
        supabase.from('nucleos').select('*').order('nome')
      ]);

      setFullConfig(cfg);
      if (cfg.pixKey && !pixKey) {
        setPixKey(cfg.pixKey);
      }

      setNucleosList(nucs || []);

      // Mapeia valores existentes (de configuracoes ou nucleos)
      const initialMap: Record<string, number> = { ...(cfg.nucleoValores || {}) };
      (nucs || []).forEach(n => {
        if (initialMap[n.id] === undefined) {
          initialMap[n.id] = (n as any).valor_mensalidade || 0;
        }
      });
      setLocalTuitions(initialMap);
    } catch (err) {
      console.error('Erro ao carregar configurações de pagamento:', err);
    }
  };

  const handleTuitionChange = (nucleoId: string, valueStr: string) => {
    const val = parseFloat(valueStr) || 0;
    setLocalTuitions(prev => ({ ...prev, [nucleoId]: val }));
  };

  const handleSaveAllTuitions = async () => {
    setSavingTuitions(true);
    setTuitionsSavedSuccess(false);
    try {
      await financeService.saveAllNucleoTuitions(localTuitions);
      setTuitionsSavedSuccess(true);
      setTimeout(() => setTuitionsSavedSuccess(false), 3000);
    } catch (err: any) {
      alert('Erro ao salvar valores por núcleo: ' + err.message);
    } finally {
      setSavingTuitions(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '850px' }}>
      
      {/* CARD 1: DADOS OFICIAIS DO PIX SANTANDER */}
      <div className="data-card" style={{ padding: '2rem', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.25rem', fontWeight: 800 }}>
              <CreditCard color="#ec0000" /> Configuração Oficial do PIX (Santander)
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Dados exibidos no pop-up automático para todos os alunos pagantes a partir de Novembro.
            </p>
          </div>

          <div style={{
            padding: '0.35rem 0.8rem',
            background: 'rgba(236, 0, 0, 0.12)',
            border: '1px solid rgba(236, 0, 0, 0.3)',
            borderRadius: '999px',
            fontSize: '0.75rem',
            color: '#ff4d4d',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <ShieldCheck size={14} /> Ativo a partir de Novembro
          </div>
        </div>

        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* Chave Pix (Telefone) */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>
                <Phone size={14} color="var(--primary)" /> Chave PIX (Telefone)
              </label>
              <input 
                type="text" 
                className="form-control" 
                value={pixKey || DEFAULT_PIX_CONSTANTS.pixKey} 
                onChange={e => setPixKey(e.target.value)} 
                placeholder="11958259144" 
                required
              />
              <span style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.2rem', display: 'block' }}>
                Formato padrão: 11958259144 (Telefone celular)
              </span>
            </div>

            {/* Banco */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>
                <Building2 size={14} color="#ec0000" /> Banco / Instituição
              </label>
              <input 
                type="text" 
                className="form-control" 
                value={fullConfig.banco || DEFAULT_PIX_CONSTANTS.banco} 
                disabled
                style={{ opacity: 0.8, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          {/* Nome do Recebedor */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>
              <User size={14} color="var(--primary)" /> Nome do Recebedor / Favorecido (Para Validação de Comprovante)
            </label>
            <input 
              type="text" 
              className="form-control" 
              value={fullConfig.beneficiario || DEFAULT_PIX_CONSTANTS.beneficiario} 
              disabled
              style={{ fontWeight: 700, color: '#10b981', opacity: 0.9, cursor: 'not-allowed' }}
            />
            <span style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.2rem', display: 'block' }}>
              O sistema utiliza este nome oficial para reconhecimento óptico automático dos comprovantes enviados pelos alunos.
            </span>
          </div>

          {/* QR Code Opcional */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>QR Code do PIX Santander (Opcional)</label>
            {pixQrUrl && (
              <img 
                src={pixQrUrl} 
                alt="QR Code PIX oficial Santander Fatesa" 
                style={{ width: '130px', background: 'white', padding: '0.5rem', display: 'block', marginBottom: '0.75rem', borderRadius: '12px' }} 
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
            style={{ width: 'auto', alignSelf: 'flex-start', padding: '0.65rem 1.75rem', fontWeight: 700 }}
            disabled={actionLoading === 'save-settings'}
          >
            {actionLoading === 'save-settings' ? <Loader2 className="spinner" size={18} /> : 'Salvar Chave PIX'}
          </button>
        </form>
      </div>

      {/* CARD 2: TABELA DE VALORES DE MENSALIDADE POR NÚCLEO */}
      <div className="data-card" style={{ padding: '2rem', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.25rem', fontWeight: 800 }}>
              <DollarSign color="#10b981" /> Valores das Mensalidades por Núcleo
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Defina o valor cobrado individualmente para cada pólo/núcleo. O sistema valida se o comprovante corresponde ao valor do núcleo do aluno.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveAllTuitions}
            disabled={savingTuitions}
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem', fontWeight: 800 }}
          >
            {savingTuitions ? <Loader2 className="spinner" size={18} /> : (tuitionsSavedSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />)}
            {savingTuitions ? 'Salvando...' : (tuitionsSavedSuccess ? 'Valores Salvos!' : 'Salvar Todos os Valores')}
          </button>
        </div>

        {/* Informação sobre Isenção */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center'
        }}>
          <Info size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.85)' }}>
            <strong>Meses Isentos:</strong> O sistema automaticamente <strong>não realiza cobrança nos meses de Janeiro e Julho</strong> para nenhum aluno.
          </span>
        </div>

        {/* Tabela de Núcleos */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Núcleo / Pólo</th>
                <th style={{ padding: '0.75rem 1rem' }}>Cidade / UF</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', width: '220px' }}>Valor Mensalidade (R$)</th>
              </tr>
            </thead>
            <tbody>
              {nucleosList.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum núcleo cadastrado no momento.
                  </td>
                </tr>
              ) : (
                nucleosList.map(nuc => {
                  const currentVal = localTuitions[nuc.id] !== undefined ? localTuitions[nuc.id] : 0;
                  return (
                    <tr key={nuc.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                        {nuc.nome}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {nuc.cidade ? `${nuc.cidade} - ${nuc.estado}` : '-'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {nuc.isento ? (
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontWeight: 700 }}>
                            Isento de Cobrança
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe', fontWeight: 700 }}>
                            Pagante
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>R$</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            className="form-control"
                            style={{ maxWidth: '140px', padding: '0.5rem 0.75rem', fontWeight: 700 }}
                            value={currentVal || ''}
                            onChange={(e) => handleTuitionChange(nuc.id, e.target.value)}
                            placeholder="0.00"
                            disabled={nuc.isento}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default SettingsPanel;
