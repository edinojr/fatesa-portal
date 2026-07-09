import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, GraduationCap, User, MapPin, BookOpen, Calendar,
  Trash2, Edit, X, Loader2, CheckCircle2, FileText
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ManualHistoryPanelProps {
  onRefresh?: () => void;
}

interface ManualRecord {
  id: string;
  aluno_id: string;
  curso_nome: string;
  modulo_nome: string;
  nota: number;
  data_conclusao: string;
  observacao: string | null;
  inserido_por: string | null;
  created_at: string;
  updated_at: string;
  users?: any;
  inserted_by?: any;
}

const ManualHistoryPanel: React.FC<ManualHistoryPanelProps> = ({ onRefresh }) => {
  const [records, setRecords] = useState<ManualRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNucleo, setSelectedNucleo] = useState<string>('');
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editing, setEditing] = useState<ManualRecord | null>(null);
  const [editForm, setEditForm] = useState({ curso_nome: '', modulo_nome: '', nota: '', data_conclusao: '', observacao: '' });
  const [saving, setSaving] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchNucleos = async () => {
    const { data } = await supabase.from('nucleos').select('id, nome').order('nome');
    setNucleos(data || []);
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('historico_notas')
        .select(`
          id, aluno_id, curso_nome, modulo_nome, nota, data_conclusao, observacao, inserido_por, created_at, updated_at,
          users:aluno_id(id, nome, email, nucleos:nucleo_id(nome)),
          inserted_by:inserido_por(nome)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const normalized = (data || []).map((r: any) => ({
        ...r,
        users: Array.isArray(r.users) ? r.users[0] : r.users,
        inserted_by: Array.isArray(r.inserted_by) ? r.inserted_by[0] : r.inserted_by,
      })) as ManualRecord[];
      setRecords(normalized);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast('Erro ao carregar históricos: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    fetchNucleos();
    fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro manual?')) return;
    try {
      const { error } = await supabase.from('historico_notas').delete().eq('id', id);
      if (error) throw error;
      showToast('Registro excluído!');
      fetchRecords();
    } catch (err: any) {
      showToast('Erro ao excluir: ' + err.message, 'error');
    }
  };

  const startEdit = (r: ManualRecord) => {
    setEditing(r);
    setEditForm({
      curso_nome: r.curso_nome,
      modulo_nome: r.modulo_nome,
      nota: String(r.nota),
      data_conclusao: r.data_conclusao,
      observacao: r.observacao || '',
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editForm.modulo_nome) return showToast('Informe o módulo.', 'error');
    if (!editForm.nota) return showToast('Informe a nota.', 'error');
    setSaving(true);
    try {
      const { error } = await supabase
        .from('historico_notas')
        .update({
          curso_nome: editForm.curso_nome,
          modulo_nome: editForm.modulo_nome,
          nota: parseFloat(editForm.nota),
          data_conclusao: editForm.data_conclusao,
          observacao: editForm.observacao || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);
      if (error) throw error;
      showToast('Registro atualizado!');
      setEditing(null);
      fetchRecords();
    } catch (err: any) {
      showToast('Erro ao salvar: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar
  const term = searchTerm.toLowerCase();
  const filtered = records.filter(r => {
    const okSearch =
      !term ||
      (r.users?.nome || '').toLowerCase().includes(term) ||
      (r.users?.email || '').toLowerCase().includes(term) ||
      (r.curso_nome || '').toLowerCase().includes(term) ||
      (r.modulo_nome || '').toLowerCase().includes(term);
    const okNucleo = !selectedNucleo || (r.users?.nucleos?.nome || '') === selectedNucleo;
    return okSearch && okNucleo;
  });

  // Agrupar por aluno
  const groupedByStudent = filtered.reduce((acc: Record<string, { student: any; items: ManualRecord[] }>, r) => {
    const key = r.aluno_id;
    if (!acc[key]) acc[key] = { student: r.users || { id: r.aluno_id, nome: 'Aluno removido', email: '' }, items: [] };
    acc[key].items.push(r);
    return acc;
  }, {});

  const studentEntries = Object.entries(groupedByStudent).sort((a, b) =>
    (a[1].student.nome || '').localeCompare(b[1].student.nome || '')
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem 2rem',
          background: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: '#fff', borderRadius: '12px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <X size={20} />}
          <span style={{ fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
            <Search size={12} style={{ display: 'inline', marginRight: '4px' }} /> Buscar
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="Nome do aluno, curso, módulo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ minWidth: '220px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
            <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} /> Núcleo
          </label>
          <select
            className="form-control"
            value={selectedNucleo}
            onChange={e => setSelectedNucleo(e.target.value)}
          >
            <option value="">Todos os núcleos</option>
            {nucleos.map(n => <option key={n.id} value={n.nome}>{n.nome}</option>)}
          </select>
        </div>
        <button onClick={fetchRecords} className="btn btn-outline" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Loader2 size={16} className={loading ? 'spinner' : ''} /> Atualizar
        </button>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Total de registros manuais: <strong style={{ color: 'var(--primary)' }}>{filtered.length}</strong> em <strong>{studentEntries.length}</strong> aluno(s).
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><Loader2 className="spinner" size={28} /></div>
      ) : studentEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px dashed var(--glass-border)' }}>
          <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <h3 style={{ opacity: 0.6 }}>Nenhum registro manual encontrado</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0.5rem auto' }}>
            Insira notas manuais na seção acima para vê-las consolidadas aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {studentEntries.map(([studentId, group]) => (
            <div key={studentId} style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '18px',
              border: '1px solid var(--glass-border)',
              overflow: 'hidden'
            }}>
              {/* Student header */}
              <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(var(--primary-rgb), 0.04)', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={18} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{group.student.nome}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {group.student.email}{group.student.nucleos?.nome ? ` • ${group.student.nucleos.nome}` : ''}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', fontWeight: 800 }}>
                  {group.items.length} registro(s)
                </span>
              </div>

              {/* Records */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {group.items.map(r => (
                  <div key={r.id} style={{
                    padding: '0.9rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <GraduationCap size={18} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <BookOpen size={13} style={{ opacity: 0.6 }} />
                        {r.modulo_nome}
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff', background: '#a855f7', padding: '1px 6px', borderRadius: '6px', letterSpacing: '0.5px' }}>MANUAL</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {r.curso_nome} • <Calendar size={11} style={{ display: 'inline' }} /> {new Date(r.data_conclusao).toLocaleDateString('pt-BR')}
                        {r.inserted_by?.nome ? ` • por ${r.inserted_by.nome}` : ''}
                      </div>
                      {r.observacao && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                          “{r.observacao}”
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: '1.1rem', fontWeight: 900,
                      color: (r.nota ?? 0) >= 7 ? 'var(--success)' : 'var(--error)',
                      background: (r.nota ?? 0) >= 7 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      padding: '4px 12px', borderRadius: '10px', minWidth: '60px', textAlign: 'center'
                    }}>
                      {Number(r.nota ?? 0).toFixed(2)}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => startEdit(r)} className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem 0.5rem' }} title="Editar">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem 0.5rem', color: 'var(--error)' }} title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal editar */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Editar Registro Manual</h2>
              <button className="btn-icon" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Curso</label>
                  <input className="form-control" value={editForm.curso_nome} onChange={e => setEditForm({ ...editForm, curso_nome: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Módulo</label>
                  <input className="form-control" value={editForm.modulo_nome} onChange={e => setEditForm({ ...editForm, modulo_nome: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Nota</label>
                  <input type="number" min="0" max="10" step="0.1" className="form-control" value={editForm.nota} onChange={e => setEditForm({ ...editForm, nota: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Data de Conclusão</label>
                  <input type="date" className="form-control" value={editForm.data_conclusao} onChange={e => setEditForm({ ...editForm, data_conclusao: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Observação</label>
                <textarea className="form-control" rows={2} value={editForm.observacao} onChange={e => setEditForm({ ...editForm, observacao: e.target.value })} placeholder="Opcional..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setEditing(null)} className="btn btn-outline" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={handleSave} className="btn btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={saving}>
                  {saving ? <Loader2 size={16} className="spinner" /> : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualHistoryPanel;