import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  MapPin
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface GradeHistoryInsertionProps {
  onRefresh?: () => void;
}

const GradeHistoryInsertion: React.FC<GradeHistoryInsertionProps> = ({ onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [selectedNucleo, setSelectedNucleo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    curso_nome: '',
    modulo_nome: '',
    nota: '',
    data_conclusao: new Date().toISOString().split('T')[0],
    observacao: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const updateDropdownPos = useCallback(() => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
  }, [])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('cursos')
        .select('id, nome, nivel, livros(id, titulo, ordem)')
        .order('nome');
      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchNucleos = async () => {
    try {
      const { data, error } = await supabase
        .from('nucleos')
        .select('id, nome')
        .order('nome');
      if (error) throw error;
      setNucleos(data || []);
    } catch (err) {
      console.error('Error fetching nuclei:', err);
    }
  };

  const searchStudents = useCallback(async (term: string) => {
    if (term.length < 2 && !selectedNucleo) {
      setStudents([]);
      return;
    }
    try {
      let query = supabase
        .from('users')
        .select('id, nome, email, cpf, curso_opcao, nucleos(nome)')
        .limit(20);

      if (term.length >= 2) {
        query = query.ilike('nome', `%${term}%`);
      }

      if (selectedNucleo) {
        query = query.eq('nucleo_id', selectedNucleo);
      }

      const { data, error } = await query;
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Error searching students:', err);
    }
  }, [selectedNucleo]);

  const fetchHistory = async () => {
    if (!selectedStudent) return;
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowStudentDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetchCourses();
    fetchNucleos();
  }, []);

  useEffect(() => {
    if (selectedNucleo) {
      searchStudents('');
      setShowStudentDropdown(true);
      updateDropdownPos();
    }
  }, [selectedNucleo, searchStudents, updateDropdownPos]);

  const handleSubmit = async () => {
    if (!selectedStudent) return alert('Selecione um aluno.');
    if (!formData.curso_nome) return alert('Informe o nome do curso.');
    if (!formData.modulo_nome) return alert('Informe o nome do módulo.');
    if (!formData.nota) return alert('Informe a nota.');

    setSaving(true);
    try {
      const payload = {
        aluno_id: selectedStudent.id,
        curso_nome: formData.curso_nome,
        modulo_nome: formData.modulo_nome,
        nota: parseFloat(formData.nota),
        data_conclusao: formData.data_conclusao,
        observacao: formData.observacao || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('historico_notas')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
        showToast('Nota atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('historico_notas')
          .insert({ ...payload, inserido_por: (await supabase.auth.getUser()).data.user?.id });
        if (error) throw error;
        showToast('Nota inserida com sucesso!');
      }

      setFormData({ curso_nome: '', modulo_nome: '', nota: '', data_conclusao: new Date().toISOString().split('T')[0], observacao: '' });
      setEditingId(null);
      setShowForm(false);
      fetchHistory();
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

  const availableModules = courses.find(c => c.nome === formData.curso_nome)?.livros || [];

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

      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', background: 'rgba(168,85,247,0.08)', borderRadius: '14px', borderLeft: '4px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <GraduationCap size={20} color="var(--primary)" />
          <div>
            <h3 style={{ color: 'var(--primary)', margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>Histórico de Notas</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Insira notas de módulos concluídos e histórico acadêmico
            </span>
          </div>
        </div>
      </div>

      {/* Selection Flow */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Nucleus Selection */}
        <div style={{ position: 'relative' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.7 }}>
            <MapPin size={14} /> Filtrar por Núcleo
          </label>
          <select
            value={selectedNucleo}
            onChange={(e) => {
              setSelectedNucleo(e.target.value);
              setSearchTerm('');
              setStudents([]);
              setSelectedStudent(null);
            }}
            style={{ 
              width: '100%', padding: '0.75rem', borderRadius: '12px', 
              background: '#fff', border: '1px solid var(--glass-border)', 
              color: '#000', fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s' 
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--glass-border)'; }}
          >
            <option value="">Todos os Núcleos</option>
            {nucleos.map(n => (
              <option key={n.id} value={n.id}>{n.nome}</option>
            ))}
          </select>
        </div>

        {/* Student Search */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.7 }}>
            <User size={14} /> Buscar Aluno
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
             <input
               ref={searchInputRef}
               type="text"
               placeholder={selectedNucleo ? "Buscar aluno neste núcleo..." : "Digite o nome do aluno..."}
               value={searchTerm}
               onChange={(e) => {
                 const val = e.target.value
                 setSearchTerm(val);
                 searchStudents(val);
                 setShowStudentDropdown(true);
                 updateDropdownPos()
               }}
               onFocus={(e) => { 
                 setShowStudentDropdown(true); 
                 updateDropdownPos();
                 e.target.style.borderColor = 'var(--primary)';
                 e.target.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb), 0.2)';
               }}
               style={{
                 width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                 borderRadius: '12px', background: '#fff',
                 border: selectedStudent ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                 color: '#000', fontSize: '0.9rem',
                 transition: 'all 0.2s ease',
                 outline: 'none'
               }}
               onBlur={(e) => {
                 if (!selectedStudent) {
                   e.target.style.borderColor = 'var(--glass-border)';
                   e.target.style.boxShadow = 'none';
                 }
               }}
             />

          </div>
        </div>


        {!selectedStudent && showStudentDropdown && dropdownPos && (
          <div style={{
            position: 'fixed', zIndex: 9999,
            top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width,
            background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            maxHeight: '250px', overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            {students.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {searchTerm.length < 2 ? 'Digite ao menos 2 caracteres' : 'Nenhum aluno encontrado'}
              </div>
            ) : (
              students.map(s => (
                <div
                  key={s.id}
                  onMouseDown={() => {
                    setSelectedStudent(s);
                    setSearchTerm(s.nome);
                    setShowStudentDropdown(false);
                    setStudents([]);
                  }}
                  style={{
                    padding: '0.75rem 1rem', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.nome}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{s.email}{s.cpf ? ` • ${s.cpf}` : ''}</div>
                </div>
              ))
            )}
          </div>
        )}

        {selectedStudent && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(var(--primary-rgb), 0.08)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedStudent.nome}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>{selectedStudent.email}</span>
            </div>
            <button
              onClick={() => { setSelectedStudent(null); setSearchTerm(''); setHistoryData([]); setShowForm(false); setEditingId(null); }}
              style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--error)', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Add Button */}
      {selectedStudent && (
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ curso_nome: '', modulo_nome: '', nota: '', data_conclusao: new Date().toISOString().split('T')[0], observacao: '' }); }}
          className="btn btn-primary"
          style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> {showForm ? 'Fechar Formulário' : 'Inserir Nota'}
        </button>
      )}

      {/* Form */}
      {showForm && selectedStudent && (
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
                 style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', background: '#fff', border: '1px solid var(--glass-border)', color: '#000', fontSize: '0.85rem', outline: 'none', transition: 'all 0.2s' }}
                 onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(var(--primary-rgb), 0.2)'; }}
                 onBlur={(e) => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
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
                 style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', background: '#fff', border: '1px solid var(--glass-border)', color: '#000', fontSize: '0.85rem', outline: 'none', transition: 'all 0.2s' }}
                 onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(var(--primary-rgb), 0.2)'; }}
                 onBlur={(e) => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
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
                <GraduationCap size={12} /> Nota
              </label>
               <input
                 type="number"
                 step="0.01"
                 min="0"
                 max="10"
                 value={formData.nota}
                 onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                 placeholder="0.00"
                 style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', background: '#fff', border: '1px solid var(--glass-border)', color: '#000', fontSize: '0.85rem', outline: 'none', transition: 'all 0.2s' }}
                 onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(var(--primary-rgb), 0.2)'; }}
                 onBlur={(e) => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
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
                 style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', background: '#fff', border: '1px solid var(--glass-border)', color: '#000', fontSize: '0.85rem', outline: 'none', transition: 'all 0.2s' }}
                 onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(var(--primary-rgb), 0.2)'; }}
                 onBlur={(e) => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
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
                 style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', background: '#fff', border: '1px solid var(--glass-border)', color: '#000', fontSize: '0.85rem', resize: 'none', outline: 'none', transition: 'all 0.2s' }}
                 onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(var(--primary-rgb), 0.2)'; }}
                 onBlur={(e) => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
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

      {/* History List */}
      {selectedStudent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, opacity: 0.7 }}>
            Registros ({historyData.length})
          </h4>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Loader2 className="spinner" size={24} />
            </div>
          ) : historyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--glass)', borderRadius: '12px', border: '1px dashed var(--glass-border)' }}>
              <p style={{ color: 'var(--text-muted)' }}>Nenhum registro encontrado.</p>
            </div>
          ) : (
            historyData.map(record => (
              <div key={record.id} style={{
                padding: '1rem', background: 'var(--glass)', borderRadius: '12px',
                border: '1px solid var(--glass-border)', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GraduationCap size={16} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{record.modulo_nome}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {record.curso_nome} • Nota: <strong style={{ color: record.nota >= 7 ? 'var(--success)' : 'var(--error)' }}>{record.nota}</strong> • {new Date(record.data_conclusao).toLocaleDateString('pt-BR')}
                    </div>
                    {record.observacao && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{record.observacao}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => handleEdit(record)} className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem 0.5rem' }} title="Editar">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(record.id)} className="btn btn-outline" style={{ width: 'auto', padding: '0.3rem 0.5rem', color: 'var(--error)' }} title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default GradeHistoryInsertion;
