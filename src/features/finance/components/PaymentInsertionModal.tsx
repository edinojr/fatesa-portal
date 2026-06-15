import React, { useState, useEffect } from 'react';
import { X, User, DollarSign, Calendar, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { financeService } from '../../../services/financeService';

interface PaymentInsertionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentInsertionModal: React.FC<PaymentInsertionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    valor: '',
    descricao: '',
    status: 'pago',
    data_vencimento: new Date().toISOString().split('T')[0],
  });
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUser(null);
      setUserSearch('');
      setSearchResults([]);
      setFormData({
        valor: '',
        descricao: '',
        status: 'pago',
        data_vencimento: new Date().toISOString().split('T')[0],
      });
      setConfirming(false);
    }
  }, [isOpen]);

  const handleUserSearch = async (term: string) => {
    setUserSearch(term);
    if (term.length < 3) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, nome, email')
        .ilike('nome', `%${term}%`)
        .limit(5);
      
      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = async () => {
    if (!selectedUser) return alert('Por favor, selecione um usuário.');
    if (!formData.valor) return alert('Por favor, insira o valor.');

    setLoading(true);
    try {
      await financeService.registerManualPayment({
        user_id: selectedUser.id,
        valor: parseFloat(formData.valor),
        descricao: formData.descricao,
        status: formData.status as 'pago' | 'aberto',
        data_vencimento: formData.data_vencimento,
      });
      
      setConfirming(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      alert('Erro ao inserir pagamento: ' + err.message);
    } finally {
      if (!confirming) setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 2000, padding: '1rem' }}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '500px', 
          width: '100%', 
          background: 'var(--bg-card)', 
          borderRadius: '24px', 
          padding: 0, 
          overflow: 'hidden',
          boxShadow: '0 30px 60px rgba(0,0,0,0.8)'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '1.5rem', 
          background: 'rgba(255,255,255,0.02)', 
          borderBottom: '1px solid var(--glass-border)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', padding: '8px', borderRadius: '10px', color: 'var(--primary)' }}>
              <DollarSign size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Registrar Pagamento Manual</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* User Selection */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.7 }}>
              <User size={14} /> Aluno
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Digite o nome do aluno..." 
                value={userSearch}
                onChange={(e) => handleUserSearch(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: selectedUser ? '2px solid var(--primary)' : '1px solid var(--glass-border)', 
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
              {loading && !selectedUser && (
                <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>
                  <Loader2 size={16} className="spinner" />
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && !selectedUser && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0, 
                background: 'var(--bg-card)', 
                border: '1px solid var(--glass-border)', 
                borderRadius: '12px', 
                zIndex: 10, 
                marginTop: '4px', 
                maxHeight: '200px', 
                overflowY: 'auto',
                boxShadow: '0 10px 20px rgba(0,0,0,0.4)'
              }}>
                {searchResults.map(u => (
                  <div 
                    key={u.id} 
                    onClick={() => {
                      setSelectedUser(u);
                      setUserSearch(u.nome);
                      setSearchResults([]);
                    }}
                    style={{ 
                      padding: '0.75rem 1rem', 
                      cursor: 'pointer', 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      transition: 'background 0.2s',
                      fontSize: '0.85rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontWeight: 600 }}>{u.nome}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{u.email}</div>
                  </div>
                ))}
              </div>
            )}
            {selectedUser && (
              <button 
                onClick={() => setSelectedUser(null)}
                style={{ 
                  position: 'absolute', 
                  right: '0.5rem', 
                  top: '2.2rem', 
                  background: 'rgba(244, 63, 94, 0.1)', 
                  color: 'var(--error)', 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '2px 6px', 
                  fontSize: '0.7rem', 
                  cursor: 'pointer' 
                }}
              >
                Limpar
              </button>
            )}
          </div>

          {/* Value and Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.7 }}>
                <DollarSign size={14} /> Valor (R$)
              </label>
              <input 
                type="number" 
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--glass-border)', 
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.7 }}>
                <Calendar size={14} /> Vencimento
              </label>
              <input 
                type="date" 
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--glass-border)', 
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.7 }}>
              <FileText size={14} /> Descrição / Observação
            </label>
            <textarea 
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
              style={{ 
                width: '100%', 
                padding: '0.75rem 1rem', 
                borderRadius: '12px', 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--glass-border)', 
                color: '#fff',
                fontSize: '0.9rem',
                resize: 'none'
              }}
            />
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.7 }}>
              Status Inicial
            </label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ 
                width: '100%', 
                padding: '0.75rem 1rem', 
                borderRadius: '12px', 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--glass-border)', 
                color: '#fff',
                fontSize: '0.9rem'
              }}
            >
              <option value="pago">Pago (Homologar)</option>
              <option value="aberto">Aberto (Pendente)</option>
            </select>
          </div>

          {/* Action Button */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button 
              onClick={onClose} 
              className="btn btn-outline" 
              style={{ flex: 1, padding: '0.8rem', borderRadius: '12px' }}
            >
              Cancelar
            </button>
            <button 
              onClick={handleInsert} 
              className="btn btn-primary" 
              disabled={loading}
              style={{ flex: 2, padding: '0.8rem', borderRadius: '12px', fontWeight: 700, gap: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {loading ? <Loader2 size={18} className="spinner" /> : 'Confirmar Registro'}
            </button>
          </div>
        </div>

        {/* Success Overlay */}
        {confirming && (
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'var(--bg-card)', 
            zIndex: 10, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            borderRadius: '24px',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'rgba(16, 185, 129, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--success)',
              marginBottom: '1.5rem'
            }}>
              <CheckCircle2 size={48} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Sucesso!</h3>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '0 2rem' }}>
              Pagamento registrado corretamente no sistema.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentInsertionModal;
