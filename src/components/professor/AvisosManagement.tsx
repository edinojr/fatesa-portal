import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  AlertCircle, 
  Megaphone,
  Loader2,
  X,
  CheckCircle2
} from 'lucide-react';

const AvisosManagement = () => {
  const [avisos, setAvisos] = useState<any[]>([]);
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAviso, setEditingAviso] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    nucleo_id: '',
    prioridade: 'normal'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar núcleos do professor
      const { data: profNucs } = await supabase
        .from('professor_nucleo')
        .select('nucleos(id, nome)')
        .eq('professor_id', user.id);
      
      const myNucleos = profNucs?.map((n: any) => n.nucleos).filter(Boolean) || [];
      setNucleos(myNucleos);

      // Buscar avisos dos núcleos do professor
      const { data: avisosData } = await supabase
        .from('avisos')
        .select('*, nucleos(nome)')
        .in('nucleo_id', myNucleos.map((n: any) => n.id))
        .order('created_at', { ascending: false });
      
      setAvisos(avisosData || []);
    } catch (error) {
      console.error('Erro ao buscar avisos:', error);
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

      const payload = {
        ...formData,
        professor_id: user.id
      };

      if (editingAviso) {
        const { error } = await supabase
          .from('avisos')
          .update(payload)
          .eq('id', editingAviso.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('avisos')
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      setEditingAviso(null);
      setFormData({ titulo: '', conteudo: '', nucleo_id: '', prioridade: 'normal' });
      fetchData();
    } catch (error) {
      alert('Erro ao salvar aviso');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este aviso?')) return;
    try {
      const { error } = await supabase.from('avisos').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert('Erro ao excluir aviso');
    }
  };

  const openEdit = (aviso: any) => {
    setEditingAviso(aviso);
    setFormData({
      titulo: aviso.titulo,
      conteudo: aviso.conteudo,
      nucleo_id: aviso.nucleo_id,
      prioridade: aviso.prioridade
    });
    setShowModal(true);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="spinner" /></div>;

  return (
    <div className="admin-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Quadro de Avisos</h2>
          <p style={{ color: 'var(--text-muted)' }}>Comunique-se com seus alunos por núcleo.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingAviso(null); setShowModal(true); }}>
          <Plus size={20} /> Novo Aviso
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {avisos.length === 0 ? (
          <div className="admin-card" style={{ textAlign: 'center', padding: '4rem' }}>
            <Megaphone size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>Nenhum aviso publicado ainda.</p>
          </div>
        ) : (
          avisos.map(aviso => (
            <div key={aviso.id} className="admin-card" style={{ borderLeft: aviso.prioridade === 'urgente' ? '4px solid var(--error)' : '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {aviso.prioridade === 'urgente' && <AlertCircle size={16} color="var(--error)" />}
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--primary)', background: 'rgba(var(--primary-rgb), 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      {aviso.nucleos?.nome}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(aviso.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{aviso.titulo}</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>{aviso.conteudo}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-icon" onClick={() => openEdit(aviso)} title="Editar">
                    <Edit2 size={18} />
                  </button>
                  <button className="btn-icon" onClick={() => handleDelete(aviso.id)} style={{ color: 'var(--error)' }} title="Excluir">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingAviso ? 'Editar Aviso' : 'Novo Aviso'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="admin-form">
              <div className="form-group">
                <label>Título do Aviso</label>
                <input 
                  type="text" 
                  value={formData.titulo} 
                  onChange={e => setFormData({...formData, titulo: e.target.value})}
                  placeholder="Ex: Mudança de horário da aula"
                  required
                />
              </div>

              <div className="form-group">
                <label>Núcleo Destinatário</label>
                <select 
                  value={formData.nucleo_id} 
                  onChange={e => setFormData({...formData, nucleo_id: e.target.value})}
                  required
                >
                  <option value="">Selecione o núcleo...</option>
                  {nucleos.map(n => (
                    <option key={n.id} value={n.id}>{n.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Prioridade</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="prioridade" 
                      value="normal" 
                      checked={formData.prioridade === 'normal'}
                      onChange={e => setFormData({...formData, prioridade: e.target.value})}
                    /> Normal
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--error)' }}>
                    <input 
                      type="radio" 
                      name="prioridade" 
                      value="urgente" 
                      checked={formData.prioridade === 'urgente'}
                      onChange={e => setFormData({...formData, prioridade: e.target.value})}
                    /> Urgente
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Conteúdo da Mensagem</label>
                <textarea 
                  value={formData.conteudo} 
                  onChange={e => setFormData({...formData, conteudo: e.target.value})}
                  placeholder="Escreva aqui o comunicado para os alunos..."
                  rows={5}
                  required
                ></textarea>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="spinner" /> : (editingAviso ? 'Salvar Alterações' : 'Publicar Aviso')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvisosManagement;
