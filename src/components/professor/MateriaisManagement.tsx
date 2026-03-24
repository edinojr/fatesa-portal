import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  FileText, 
  Link as LinkIcon,
  Loader2,
  X,
  FileBox,
  Paperclip
} from 'lucide-react';

const MateriaisManagement = () => {
  const [materiais, setMateriais] = useState<any[]>([]);
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    nucleo_id: '',
    arquivos: [{ name: '', url: '' }]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profNucs } = await supabase
        .from('professor_nucleo')
        .select('nucleos(id, nome)')
        .eq('professor_id', user.id);
      
      const myNucleos = profNucs?.map((n: any) => n.nucleos).filter(Boolean) || [];
      setNucleos(myNucleos);

      // Buscar materiais dos núcleos do professor
      const { data: materiaisData } = await supabase
        .from('materiais_adicionais')
        .select('*, nucleos(nome)')
        .in('nucleo_id', myNucleos.map((n: any) => n.id))
        .order('created_at', { ascending: false });
      
      setMateriais(materiaisData || []);
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setFormData({
      ...formData,
      arquivos: [...formData.arquivos, { name: '', url: '' }]
    });
  };

  const handleRemoveField = (index: number) => {
    const newFiles = [...formData.arquivos];
    newFiles.splice(index, 1);
    setFormData({ ...formData, arquivos: newFiles });
  };

  const handleFileChange = (index: number, field: 'name' | 'url', value: string) => {
    const newFiles = [...formData.arquivos];
    newFiles[index][field] = value;
    setFormData({ ...formData, arquivos: newFiles });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const validFiles = formData.arquivos.filter(f => f.name && f.url);
      const payload = {
        ...formData,
        arquivos: validFiles,
        professor_id: user.id
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from('materiais_adicionais')
          .update(payload)
          .eq('id', editingMaterial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('materiais_adicionais')
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      setEditingMaterial(null);
      setFormData({ titulo: '', descricao: '', nucleo_id: '', arquivos: [{ name: '', url: '' }] });
      fetchData();
    } catch (error) {
      alert('Erro ao salvar material');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este material?')) return;
    try {
      const { error } = await supabase.from('materiais_adicionais').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert('Erro ao excluir material');
    }
  };

  const openEdit = (mat: any) => {
    setEditingMaterial(mat);
    setFormData({
      titulo: mat.titulo,
      descricao: mat.descricao || '',
      nucleo_id: mat.nucleo_id,
      arquivos: mat.arquivos.length > 0 ? mat.arquivos : [{ name: '', url: '' }]
    });
    setShowModal(true);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="spinner" /></div>;

  return (
    <div className="admin-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Materiais Adicionais</h2>
          <p style={{ color: 'var(--text-muted)' }}>Compartilhe PDFs, arquivos e links extras com seus alunos.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingMaterial(null); setShowModal(true); }}>
          <Plus size={20} /> Novo Material
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {materiais.length === 0 ? (
          <div className="admin-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
            <FileBox size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>Nenhum material publicado ainda.</p>
          </div>
        ) : (
          materiais.map(mat => (
            <div key={mat.id} className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'rgba(var(--primary-rgb), 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                  {mat.nucleos?.nome}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-icon" onClick={() => openEdit(mat)}><Edit2 size={16} /></button>
                  <button className="btn-icon" onClick={() => handleDelete(mat.id)} style={{ color: 'var(--error)' }}><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{mat.titulo}</h3>
              <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1 }}>{mat.descricao}</p>
              
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Paperclip size={14} /> Arquivos ({mat.arquivos?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {mat.arquivos?.map((file: any, i: number) => (
                    <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="file-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', color: '#fff', textDecoration: 'none' }}>
                      <FileText size={12} /> {file.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>{editingMaterial ? 'Editar Material' : 'Novo Material'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="admin-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Título do Material</label>
                  <input 
                    type="text" 
                    value={formData.titulo} 
                    onChange={e => setFormData({...formData, titulo: e.target.value})}
                    placeholder="Ex: Apostila de Grego II"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Núcleo</label>
                  <select 
                    value={formData.nucleo_id} 
                    onChange={e => setFormData({...formData, nucleo_id: e.target.value})}
                    required
                  >
                    <option value="">Selecione...</option>
                    {nucleos.map(n => (
                      <option key={n.id} value={n.id}>{n.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea 
                  value={formData.descricao} 
                  onChange={e => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Instruções ou resumo sobre este material..."
                  rows={3}
                ></textarea>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Arquivos/Links
                  <button type="button" className="btn btn-outline" style={{ padding: '2px 10px', fontSize: '0.75rem' }} onClick={handleAddField}>
                    <Plus size={14} /> Adicionar Arquivo
                  </button>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {formData.arquivos.map((file, index) => (
                    <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        value={file.name} 
                        onChange={e => handleFileChange(index, 'name', e.target.value)}
                        placeholder="Nome do arquivo"
                        style={{ flex: 1 }}
                        required={index === 0}
                      />
                      <input 
                        type="text" 
                        value={file.url} 
                        onChange={e => handleFileChange(index, 'url', e.target.value)}
                        placeholder="Link/URL do arquivo"
                        style={{ flex: 2 }}
                        required={index === 0}
                      />
                      {formData.arquivos.length > 1 && (
                        <button type="button" className="btn-icon" onClick={() => handleRemoveField(index)} style={{ color: 'var(--error)' }}>
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="spinner" /> : (editingMaterial ? 'Salvar Alterações' : 'Publicar Material')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MateriaisManagement;
