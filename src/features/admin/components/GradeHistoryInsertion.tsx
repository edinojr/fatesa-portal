import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  User, 
  BookOpen, 
  GraduationCap, 
  Loader2, 
  CheckCircle2, 
  Edit,
  X,
  Calendar,
  FileText,
  MapPin,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface GradeHistoryInsertionProps {
  onRefresh?: () => void;
}

const GradeHistoryInsertion: React.FC<GradeHistoryInsertionProps> = ({ onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expandedNucleos, setExpandedNucleos] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    curso_nome: '',
    modulo_nome: '',
    nota: '',
    data_conclusao: new Date().toISOString().split('T')[0],
    observacao: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, nucleosRes, usersRes] = await Promise.all([
        supabase.from('cursos').select('id, nome, nivel, livros(id, titulo, ordem)').order('nome'),
        supabase.from('nucleos').select('id, nome').order('nome'),
        supabase.from('users').select('id, nome, email, cpf, curso_opcao, nucleos(nome)').not('tipo', 'in', '("admin","suporte","professor","colaborador")').order('nome').limit(5000)
      ]);
      setCourses(coursesRes.data || []);
      setNucleos(nucleosRes.data || []);
      setAllStudents(usersRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchHistory = async () => {
    if (!selectedStudent) return;
    try {
      const { data, error } = await supabase
        .from('historico_notas')
        .select('*')
        .eq('aluno_id', selectedStudent.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHistoryData(data || []);
    } catch (err: any) {
      showToast('Erro ao carregar histórico: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      fetchHistory();
    } else {
      setHistoryData([]);
      setShowForm(false);
    }
  }, [selectedStudent]);

  const handleSubmit = async () => {
    if (!selectedStudent) return alert('Selecione um aluno.');
    if (!formData.curso_nome) return alert('Informe o nome do curso.');
    if (!formData.modulo_nome) return alert('Informe o nome do módulo.');
    if (!formData.nota) return alert('Informe a nota.');

    const numNota = parseFloat(formData.nota.replace(',', '.'));
    if (isNaN(numNota) || numNota < 0 || numNota > 10 || (numNota % 0.5 !== 0)) {
      alert('A nota deve ser entre 0 e 10, com decimais somente em meio ponto (ex: 0, 0.5, 1, 1.5, ..., 10).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        aluno_id: selectedStudent.id,
        curso_nome: formData.curso_nome,
        modulo_nome: formData.modulo_nome,
        nota: numNota,
        data_conclusao: formData.data_conclusao,
        observacao: formData.observacao || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('historico_notas')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { data: userRes } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('historico_notas')
          .insert({ ...payload, inserido_por: userRes?.user?.id });
        if (error) throw error;
      }

      if (numNota >= 7) {
        const modulo = availableModules.find((m: any) => m.titulo === formData.modulo_nome);
        if (modulo?.id) {
          const { data: userData } = await supabase
            .from('users')
            .select('modulos_finalizados_manual')
            .eq('id', selectedStudent.id)
            .maybeSingle();

          const currentManual = userData?.modulos_finalizados_manual || [];
          if (!currentManual.includes(modulo.id)) {
            const updatedManual = [...currentManual, modulo.id];
            await supabase
              .from('users')
              .update({ modulos_finalizados_manual: updatedManual })
              .eq('id', selectedStudent.id);
          }
        }
      }

      showToast('Nota salva com sucesso!');
      setFormData({ curso_nome: '', modulo_nome: '', nota: '', data_conclusao: new Date().toISOString().split('T')[0], observacao: '' });
      setEditingId(null);
      setShowForm(false);
      fetchHistory();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast('Erro ao salvar: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      const { error } = await supabase.from('historico_notas').delete().eq('id', id);
      if (error) throw error;
      showToast('Registro excluído!');
      fetchHistory();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast('Erro ao excluir: ' + err.message, 'error');
    }
  };

  const handleEdit = (record: any) => {
    setFormData({
      curso_nome: record.curso_nome,
      modulo_nome: record.modulo_nome,
      nota: record.nota.toString(),
      data_conclusao: record.data_conclusao,
      observacao: record.observacao || '',
    });
    setEditingId(record.id);
    setShowForm(true);
  };

  const availableModules = [...(courses.find(c => c.nome === formData.curso_nome)?.livros || [])].sort((a: any, b: any) => a.titulo.localeCompare(b.titulo));

  const filteredStudents = allStudents.filter(s => {
    if (!searchTerm) return true;
    return s.nome?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const groupedStudents = filteredStudents.reduce((acc, s) => {
    const nucName = s.nucleos?.nome || 'Sem Núcleo / Online';
    if (!acc[nucName]) acc[nucName] = [];
    acc[nucName].push(s);
    return acc;
  }, {} as Record<string, any[]>);

  const nucleoNames = Object.keys(groupedStudents).sort((a, b) => a.localeCompare(b));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

      {selectedStudent ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <button onClick={() => setSelectedStudent(null)} className="btn btn-outline" style={{ width: 'auto', alignSelf: 'flex-start', padding: '0.5rem 1rem' }}>
            Voltar à lista de alunos
          </button>
          
          <div style={{ padding: '1rem 1.5rem', background: 'rgba(245,158,11,0.08)', borderRadius: '14px', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} color="#f59e0b" />
              </div>
              <div>
                <h3 style={{ color: '#f59e0b', margin: 0, fontWeight: 800, fontSize: '1.2rem' }}>{selectedStudent.nome}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {selectedStudent.nucleos?.nome || 'Sem Núcleo / Online'} • {selectedStudent.email}
                </span>
              </div>
            </div>
            <button
              onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ curso_nome: '', modulo_nome: '', nota: '', data_conclusao: new Date().toISOString().split('T')[0], observacao: '' }); }}
              className="btn btn-primary"
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> {showForm ? 'Fechar Formulário' : 'Inserir Nota'}
            </button>
          </div>

          {showForm && (
            <div style={{ padding: '1.5rem', background: 'var(--glass)', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                {editingId ? 'Editar Nota' : 'Inserir Nova Nota'}
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', opacity: 0.7 }}>
                    <BookOpen size={12} /> Curso
                  </label>
                  <select
                    value={formData.curso_nome}
                    onChange={(e) => setFormData({ ...formData, curso_nome: e.target.value, modulo_nome: '' })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', background: '#fff', border: '1px solid var(--glass-border)', color: '#000', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value="">Selecione...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome} ({c.nivel})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', opacity: 0.7 }}>
                    <FileText size={12} /> Módulo
                  </label>
                  <select
                    value={formData.modulo_nome}
                    onChange={(e) => setFormData({ ...formData, modulo_nome: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', background: '#fff', border: '1px solid var(--glass-border)', color: '#000', fontSize: '0.85rem', outline: 'none' }}
                    disabled={!formData.curso_nome}
                  >
                    <option value="">Selecione...</option>
                    {availableModules.map((m: any) => (
                      <option key={m.id} value={m.titulo}>{m.titulo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', opacity: 0.7 }}>
                    <GraduationCap size={12} /> Nota (0 a 10, décimos em ,0 ou ,5)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={formData.nota}
                    onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                    placeholder="0.0 ou 0.5"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', background: '#fff', border: '1px solid var(--glass-border)', color: '#000', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', opacity: 0.7 }}>
                    <Calendar size={12} /> Data de Conclusão
                  </label>
                  <input
                    type="date"
                    value={formData.data_conclusao}
                    onChange={(e) => setFormData({ ...formData, data_conclusao: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', background: '#fff', border: '1px solid var(--glass-border)', color: '#000', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', opacity: 0.7 }}>
                  Observação
                </label>
                <textarea
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  rows={2}
                  placeholder="Observação opcional..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', background: '#fff', border: '1px solid var(--glass-border)', color: '#000', fontSize: '0.85rem', resize: 'none', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn btn-outline" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button onClick={handleSubmit} className="btn btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={saving}>
                  {saving ? <Loader2 size={16} className="spinner" /> : editingId ? 'Atualizar' : 'Salvar Nota'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Buscar aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                borderRadius: '12px', background: 'var(--glass)',
                border: '1px solid var(--glass-border)', color: 'var(--text-main)',
                fontSize: '0.95rem', outline: 'none'
              }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader2 className="spinner" size={32} style={{ opacity: 0.5 }} />
            </div>
          ) : nucleoNames.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Nenhum aluno encontrado.</div>
          ) : (
            nucleoNames.map(nuc => (
              <div key={nuc} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                <div 
                  onClick={() => setExpandedNucleos(prev => ({ ...prev, [nuc]: !prev[nuc] }))}
                  style={{ padding: '1rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}
                >
                  <div style={{ fontWeight: 800 }}>{nuc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{groupedStudents[nuc].length} aluno(s)</span>
                    {expandedNucleos[nuc] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </div>
                {expandedNucleos[nuc] && (
                  <div style={{ padding: '1rem', display: 'grid', gap: '0.5rem' }}>
                    {groupedStudents[nuc].sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || '')).map((s: any) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStudent(s)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--glass-border)', borderRadius: '16px',
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.background = 'rgba(245,158,11, 0.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
                            <User size={20} color="#f59e0b" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{s.nome}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.email}</div>
                          </div>
                        </div>
                        <ChevronRight size={18} opacity={0.5} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default GradeHistoryInsertion;
