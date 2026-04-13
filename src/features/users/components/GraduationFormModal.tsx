import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, Save, CheckCircle } from 'lucide-react';

interface GraduationFormModalProps {
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseName: string;
  levelName: string;
  onComplete: (data: any) => Promise<void>;
  onClose: () => void;
}

const GraduationFormModal: React.FC<GraduationFormModalProps> = ({
  studentName,
  studentEmail,
  courseId,
  courseName,
  levelName,
  onComplete,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: studentName,
    rg: '',
    telefone: '',
    cep: '',
    endereco: '',
    bairro: '',
    cidade: '',
    uf: ''
  });

  const handleCepBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        alert('CEP não encontrado.');
      } else {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          uf: data.uf
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onComplete(formData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      alert('Erro ao salvar cadastro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay" style={{ zIndex: 10000 }}>
        <div className="modal-content" style={{ textAlign: 'center', maxWidth: '450px', padding: '3rem' }}>
          <CheckCircle size={64} color="var(--success)" style={{ marginBottom: '1.5rem' }} />
          <h2>Cadastro Concluído!</h2>
          <p>Seus dados foram salvos com sucesso. Agora você é oficialmente um Formado da Fatesa!</p>
          <p style={{ marginTop: '1rem', opacity: 0.7 }}>Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ maxWidth: '650px', width: '95%' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--primary)', color: '#fff', padding: '10px', borderRadius: '12px' }}>
              <MapPin size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0 }}>Cadastro de Formado</h2>
              <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>Finalize seus dados para emissão do certificado</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label>Nome Completo (Conforme sairá no Certificado)</label>
            <input 
              type="text" 
              className="form-control" 
              value={formData.nome}
              onChange={e => setFormData({...formData, nome: e.target.value})}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label>RG (Documento de Identidade)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="00.000.000-0"
                value={formData.rg}
                onChange={e => setFormData({...formData, rg: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>WhatsApp / Telefone</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="(00) 00000-0000"
                value={formData.telefone}
                onChange={e => setFormData({...formData, telefone: e.target.value})}
                required
              />
            </div>
          </div>

          <div style={{ padding: '1.5rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '15px', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--primary)' }}>Endereço Completo</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label>CEP</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={e => setFormData({...formData, cep: e.target.value})}
                    onBlur={handleCepBlur}
                    required
                  />
                  {cepLoading && <Loader2 className="spinner" size={14} style={{ position: 'absolute', right: '10px', top: '12px' }} />}
                </div>
              </div>
              <div className="form-group">
                <label>Rua / Logradouro</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.endereco}
                  onChange={e => setFormData({...formData, endereco: e.target.value})}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 80px', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Bairro</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.bairro}
                  onChange={e => setFormData({...formData, bairro: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Cidade</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.cidade}
                  onChange={e => setFormData({...formData, cidade: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>UF</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.uf}
                  onChange={e => setFormData({...formData, uf: e.target.value})}
                  required
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 2, gap: '0.5rem' }} 
              disabled={loading}
            >
              {loading ? <Loader2 className="spinner" /> : <Save size={18} />}
              Finalizar e Obter Certificado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GraduationFormModal;
