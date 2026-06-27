import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Plus,
  Trash2,
  Megaphone,
  Loader2,
  X,
  AlertTriangle,
  Info,
  AlertOctagon,
  Wrench,
  Power,
  PowerOff
} from 'lucide-react';

const tipoConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  info: { icon: <Info size={16} />, label: 'Informativo', color: 'var(--primary)' },
  warning: { icon: <AlertTriangle size={16} />, label: 'Atenção', color: '#f59e0b' },
  error: { icon: <AlertOctagon size={16} />, label: 'Crítico', color: '#ef4444' },
  maintenance: { icon: <Wrench size={16} />, label: 'Manutenção', color: '#8b5cf6' }
};

const PopupAlertsManagement = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    tipo: 'info',
    ativo: true,
    data_inicio: new Date().toISOString().slice(0, 16),
    data_fim: ''
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('popup_alerts')
        .select('*')
        .order('created_at', { ascending: false });
      setAlerts(data || []);
    } catch (error) {
      console.error('Erro ao buscar popups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload: any = {
        titulo: formData.titulo,
        conteudo: formData.conteudo,
        tipo: formData.tipo,
        ativo: formData.ativo,
        data_inicio: new Date(formData.data_inicio).toISOString(),
        data_fim: formData.data_fim ? new Date(formData.data_fim).toISOString() : null
      };

      if (editingAlert) {
        payload.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from('popup_alerts')
          .update(payload)
          .eq('id', editingAlert.id);
        if (error) throw error;
      } else {
        payload.created_by = user.id;
        const { error } = await supabase
          .from('popup_alerts')
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      setEditingAlert(null);
      resetForm();
      fetchAlerts();
    } catch (error) {
      alert('Erro ao salvar popup');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este popup permanentemente?')) return;
    try {
      const { error } = await supabase.from('popup_alerts').delete().eq('id', id);
      if (error) throw error;
      fetchAlerts();
    } catch (error) {
      alert('Erro ao excluir popup');
    }
  };

  const handleToggleActive = async (alert: any) => {
    try {
      const { error } = await supabase
        .from('popup_alerts')
        .update({ ativo: !alert.ativo, updated_at: new Date().toISOString() })
        .eq('id', alert.id);
      if (error) throw error;
      fetchAlerts();
    } catch (error) {
      alert('Erro ao alterar status');
    }
  };

  const openEdit = (alert: any) => {
    setEditingAlert(alert);
    setFormData({
      titulo: alert.titulo,
      conteudo: alert.conteudo,
      tipo: alert.tipo,
      ativo: alert.ativo,
      data_inicio: alert.data_inicio ? new Date(alert.data_inicio).toISOString().slice(0, 16) : '',
      data_fim: alert.data_fim ? new Date(alert.data_fim).toISOString().slice(0, 16) : ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      conteudo: '',
      tipo: 'info',
      ativo: true,
      data_inicio: new Date().toISOString().slice(0, 16),
      data_fim: ''
    });
  };

  const now = new Date();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="spinner" /></div>;

  return (
    <div className="admin-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Pop-ups de Alertas e Informes</h2>
          <p style={{ color: 'var(--text-muted)' }}>Crie pop-ups que aparecem para todos os usuários sobre manutenções, problemas ou comunicados importantes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingAlert(null); resetForm(); setShowModal(true); }}>
          <Plus size={20} /> Novo Pop-up
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {alerts.length === 0 ? (
          <div className="admin-card" style={{ textAlign: 'center', padding: '4rem' }}>
            <Megaphone size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>Nenhum pop-up criado ainda.</p>
          </div>
        ) : (
          alerts.map(alert => {
            const tipo = tipoConfig[alert.tipo] || tipoConfig.info;
            const isActive = alert.ativo
              && (!alert.data_inicio || new Date(alert.data_inicio) <= now)
              && (!alert.data_fim || new Date(alert.data_fim) >= now);

            return (
              <div key={alert.id} className="admin-card" style={{
                borderLeft: `4px solid ${isActive ? tipo.color : 'var(--text-muted)'}`,
                opacity: alert.ativo ? 1 : 0.5
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                        color: tipo.color, background: `${tipo.color}1a`,
                        padding: '2px 8px', borderRadius: '4px',
                        display: 'flex', alignItems: 'center', gap: '0.3rem'
                      }}>
                        {tipo.icon} {tipo.label}
                      </span>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                        background: isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isActive ? '#22c55e' : '#ef4444'
                      }}>
                        {isActive ? 'ATIVO' : alert.ativo ? 'AGENDADO / EXPIRADO' : 'INATIVO'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(alert.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{alert.titulo}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{alert.conteudo}</p>
                    {(alert.data_inicio || alert.data_fim) && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                        {alert.data_inicio && <span>Início: {new Date(alert.data_inicio).toLocaleString('pt-BR')}</span>}
                        {alert.data_fim && <span>Término: {new Date(alert.data_fim).toLocaleString('pt-BR')}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                    <button className="btn-icon" onClick={() => handleToggleActive(alert)} title={alert.ativo ? 'Desativar' : 'Ativar'}>
                      {alert.ativo ? <PowerOff size={18} /> : <Power size={18} />}
                    </button>
                    <button className="btn-icon" onClick={() => openEdit(alert)} title="Editar">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="btn-icon" onClick={() => handleDelete(alert.id)} style={{ color: 'var(--error)' }} title="Excluir">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingAlert ? 'Editar Pop-up' : 'Novo Pop-up'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="admin-form">
              <div className="form-group">
                <label>Título do Pop-up</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Manutenção Programada"
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo de Alerta</label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {Object.entries(tipoConfig).map(([key, cfg]) => (
                    <label key={key} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                      padding: '0.5rem 1rem', borderRadius: '8px',
                      background: formData.tipo === key ? `${cfg.color}1a` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${formData.tipo === key ? cfg.color : 'var(--glass-border)'}`
                    }}>
                      <input
                        type="radio"
                        name="tipo"
                        value={key}
                        checked={formData.tipo === key}
                        onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                        style={{ display: 'none' }}
                      />
                      {cfg.icon}
                      <span style={{ fontWeight: formData.tipo === key ? 700 : 400, fontSize: '0.85rem' }}>{cfg.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Conteúdo da Mensagem</label>
                <textarea
                  value={formData.conteudo}
                  onChange={e => setFormData({ ...formData, conteudo: e.target.value })}
                  placeholder="Escreva aqui a mensagem que aparecerá no pop-up..."
                  rows={5}
                  required
                ></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Data de Início</label>
                  <input
                    type="datetime-local"
                    value={formData.data_inicio}
                    onChange={e => setFormData({ ...formData, data_inicio: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Data de Término (opcional)</label>
                  <input
                    type="datetime-local"
                    value={formData.data_fim}
                    onChange={e => setFormData({ ...formData, data_fim: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  <span>Ativo (aparecerá para os usuários dentro do período definido)</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="spinner" /> : (editingAlert ? 'Salvar Alterações' : 'Criar Pop-up')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PopupAlertsManagement;
