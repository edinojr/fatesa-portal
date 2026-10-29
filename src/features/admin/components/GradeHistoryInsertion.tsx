import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  ChevronRight,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { hasStudentScope } from '../../../lib/authUtils';

interface GradeHistoryInsertionProps {
  onRefresh?: () => void;
}

interface GradeRecord {
  id: string;
  aluno_id: string;
  curso_nome: string;
  modulo_nome: string;
  nota: number;
  data_conclusao: string;
  observacao?: string | null;
  inserido_por?: string | null;
  created_at: string;
  updated_at?: string;
}

const GradeHistoryInsertion: React.FC<GradeHistoryInsertionProps> = ({ onRefresh }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [historyData, setHistoryData] = useState<GradeRecord[]>([]);
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
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Carrega dados iniciais: cursos, polos e alunos
  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, nucleosRes, usersRes] = await Promise.all([
        supabase.from('cursos').select('id, nome, nivel, livros(id, titulo, ordem)').order('nome'),
        supabase.from('nucleos').select('id, nome').order('nome'),
        supabase.from('users').select('id, nome, email, cpf, curso_opcao, tipo, caminhos_acesso, nucleos(nome)').order('nome').limit(5000)
      ]);
      setCourses(coursesRes.data || []);
      setNucleos(nucleosRes.data || []);
      const students = (usersRes.data || []).filter((u: any) => 
        !['admin', 'suporte', 'professor', 'colaborador'].includes(u.tipo) || hasStudentScope(u)
      );
      setAllStudents(students);

      // Sincroniza com parâmetro studentId na URL se presente
      const urlStudentId = searchParams.get('studentId');
      if (urlStudentId && (!selectedStudent || selectedStudent.id !== urlStudentId)) {
        const found = students.find((s: any) => s.id === urlStudentId);
        if (found) {
          setSelectedStudent(found);
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados iniciais:', err);
      showToast('Erro ao carregar lista de alunos: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Sincroniza aluno selecionado com a URL (mantém se a página atualizar)
  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setShowForm(true);
    setEditingId(null);
    setFormData({
      curso_nome: student.curso_opcao || (courses.length > 0 ? courses[0].nome : ''),
      modulo_nome: '',
      nota: '',
      data_conclusao: new Date().toISOString().split('T')[0],
      observacao: ''
    });

    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('studentId', student.id);
      return p;
    });
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setHistoryData([]);
    setShowForm(false);
    setEditingId(null);

    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete('studentId');
      return p;
    });
  };

  // 3. Busca histórico de notas do aluno selecionado
  const fetchHistory = useCallback(async (studentId?: string) => {
    const targetId = studentId || selectedStudent?.id;
    if (!targetId) return;

    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('historico_notas')
        .select('*')
        .eq('aluno_id', targetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryData((data || []) as GradeRecord[]);
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
      showToast('Erro ao carregar notas lançadas: ' + err.message, 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedStudent?.id]);

  useEffect(() => {
    if (selectedStudent?.id) {
      fetchHistory(selectedStudent.id);
      if (!formData.curso_nome && selectedStudent.curso_opcao) {
        setFormData((prev) => ({ ...prev, curso_nome: selectedStudent.curso_opcao }));
      }
    } else {
      setHistoryData([]);
    }
  }, [selectedStudent?.id, fetchHistory, selectedStudent?.curso_opcao]);

  // Módulos disponíveis para o curso selecionado no form
  const availableModules = React.useMemo(() => {
    const selectedCourseObj = courses.find((c) => c.nome === formData.curso_nome);
    const list = [...(selectedCourseObj?.livros || [])];
    return list.sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0) || a.titulo.localeCompare(b.titulo));
  }, [courses, formData.curso_nome]);

  // 4. Salvar ou Atualizar Nota (sem sair da tela nem recarregar a página inteira)
  const handleSubmit = async () => {
    if (!selectedStudent) {
      showToast('Selecione um aluno para lançar a nota.', 'error');
      return;
    }
    if (!formData.curso_nome) {
      showToast('Informe o curso da disciplina.', 'error');
      return;
    }
    if (!formData.modulo_nome) {
      showToast('Informe o módulo ou matéria.', 'error');
      return;
    }
    if (!formData.nota || formData.nota.toString().trim() === '') {
      showToast('Informe a nota do aluno.', 'error');
      return;
    }

    const numNota = parseFloat(formData.nota.toString().replace(',', '.'));
    if (isNaN(numNota) || numNota < 0 || numNota > 10 || (Math.round(numNota * 2) !== numNota * 2)) {
      showToast('A nota deve ser entre 0 e 10, com decimais em meio ponto (ex: 7, 7.5, 8, 8.5).', 'error');
      return;
    }

    const cleanDate = (formData.data_conclusao && formData.data_conclusao.trim())
      ? formData.data_conclusao.trim()
      : new Date().toISOString().split('T')[0];

    setSaving(true);
    try {
      // Obter usuário logado para auditoria (se existir em public.users)
      let inseridoPor: string | null = null;
      try {
        const { data: userAuth } = await supabase.auth.getUser();
        if (userAuth?.user?.id) {
          const { data: userDb } = await supabase
            .from('users')
            .select('id')
            .eq('id', userAuth.user.id)
            .maybeSingle();
          if (userDb?.id) {
            inseridoPor = userDb.id;
          }
        }
      } catch {
        inseridoPor = null;
      }

      const payload: any = {
        aluno_id: selectedStudent.id,
        curso_nome: formData.curso_nome.trim(),
        modulo_nome: formData.modulo_nome.trim(),
        nota: numNota,
        data_conclusao: cleanDate,
        observacao: formData.observacao?.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('historico_notas')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId);

        if (error) throw error;
        showToast('Nota atualizada com sucesso!');
      } else {
        if (inseridoPor) {
          payload.inserido_por = inseridoPor;
        }

        let { error } = await supabase
          .from('historico_notas')
          .insert(payload);

        // Fallback caso inserido_por cause violação de chave estrangeira
        if (error && payload.inserido_por) {
          console.warn('Tentando inserir sem inserido_por devido a:', error);
          delete payload.inserido_por;
          const retry = await supabase.from('historico_notas').insert(payload);
          error = retry.error;
        }

        if (error) throw error;
        showToast('Nota lançada com sucesso!');
      }

      // Sincronização não-bloqueante de modulos_finalizados_manual (quando nota >= 7)
      if (numNota >= 7) {
        try {
          const modulo = availableModules.find((m: any) => m.titulo === formData.modulo_nome);
          if (modulo?.id) {
            const { data: userData } = await supabase
              .from('users')
              .select('modulos_finalizados_manual')
              .eq('id', selectedStudent.id)
              .maybeSingle();

            const currentManual = Array.isArray(userData?.modulos_finalizados_manual)
              ? userData.modulos_finalizados_manual
              : [];

            if (!currentManual.includes(modulo.id)) {
              const updatedManual = [...currentManual, modulo.id];
              await supabase
                .from('users')
                .update({ modulos_finalizados_manual: updatedManual })
                .eq('id', selectedStudent.id);
            }
          }
        } catch (errSync) {
          console.warn('Aviso: sincronização secundária de modulos_finalizados_manual:', errSync);
        }
      }

      // Limpa os campos da disciplina, mas mantém o curso selecionado para agilizar o próximo lançamento!
      setFormData((prev) => ({
        curso_nome: prev.curso_nome,
        modulo_nome: '',
        nota: '',
        data_conclusao: new Date().toISOString().split('T')[0],
        observacao: ''
      }));
      setEditingId(null);

      // Recarrega o histórico de notas deste aluno imediatamente
      await fetchHistory(selectedStudent.id);

      // Notifica o componente pai em segundo plano sem descarregar a página
      if (onRefresh) {
        try {
          onRefresh();
        } catch (errRef) {
          console.warn('Aviso ao executar onRefresh pai:', errRef);
        }
      }
    } catch (err: any) {
      console.error('Erro ao salvar nota:', err);
      showToast('Erro ao salvar nota: ' + (err.message || 'Verifique os dados preenchidos'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // 5. Iniciar Edição de uma nota existente
  const handleStartEdit = (record: GradeRecord) => {
    setFormData({
      curso_nome: record.curso_nome,
      modulo_nome: record.modulo_nome,
      nota: record.nota.toString(),
      data_conclusao: record.data_conclusao,
      observacao: record.observacao || '',
    });
    setEditingId(record.id);
    setShowForm(true);

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setFormData((prev) => ({
      curso_nome: prev.curso_nome,
      modulo_nome: '',
      nota: '',
      data_conclusao: new Date().toISOString().split('T')[0],
      observacao: ''
    }));
    setShowForm(false);
  };

  // 6. Excluir registro de nota
  const handleDelete = async (id: string, moduloNome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a nota de "${moduloNome}"?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('historico_notas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Nota excluída com sucesso!');
      if (editingId === id) {
        handleCancelForm();
      }
      await fetchHistory(selectedStudent?.id);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Erro ao excluir nota:', err);
      showToast('Erro ao excluir nota: ' + err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtragem de alunos na lista
  const filteredStudents = allStudents.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (s.nome && s.nome.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.cpf && s.cpf.includes(term))
    );
  });

  const groupedStudents = filteredStudents.reduce((acc, s) => {
    const nucName = s.nucleos?.nome || 'Sem Polo / Online';
    if (!acc[nucName]) acc[nucName] = [];
    acc[nucName].push(s);
    return acc;
  }, {} as Record<string, any[]>);

  const nucleoNames = Object.keys(groupedStudents).sort((a, b) => a.localeCompare(b));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem 1.75rem',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff', borderRadius: '14px', zIndex: 99999, display: 'flex', alignItems: 'center', gap: '0.75rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', fontWeight: 600, fontSize: '0.95rem'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {selectedStudent ? (
        /* ================= VISTA DO ALUNO SELECIONADO ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Barra de Ações Superior */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              onClick={handleClearStudent}
              className="btn btn-outline"
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '10px' }}
            >
              <ArrowLeft size={16} /> Voltar à lista de alunos
            </button>

            <button
              onClick={() => {
                if (showForm && !editingId) {
                  setShowForm(false);
                } else {
                  setEditingId(null);
                  setShowForm(true);
                  if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="btn btn-primary"
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '10px' }}
            >
              <Plus size={16} /> {showForm && !editingId ? 'Fechar Formulário' : 'Inserir Outra Nota'}
            </button>
          </div>
          
          {/* Card com Dados do Aluno */}
          <div style={{
            padding: '1.25rem 1.75rem',
            background: 'linear-gradient(135deg, rgba(0,86,179,0.08) 0%, rgba(0,86,179,0.02) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(0,86,179,0.25)',
            borderLeft: '5px solid var(--primary, #0056b3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(0,86,179,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={26} color="var(--primary, #0056b3)" />
              </div>
              <div>
                <h3 style={{ color: 'var(--primary, #0056b3)', margin: 0, fontWeight: 800, fontSize: '1.3rem' }}>
                  {selectedStudent.nome}
                </h3>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <span><MapPin size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> {selectedStudent.nucleos?.nome || 'Sem Polo / Online'}</span>
                  <span>•</span>
                  <span>{selectedStudent.email}</span>
                  {selectedStudent.cpf && (
                    <>
                      <span>•</span>
                      <span>CPF: {selectedStudent.cpf}</span>
                    </>
                  )}
                  {selectedStudent.curso_opcao && (
                    <>
                      <span>•</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Curso: {selectedStudent.curso_opcao}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{
                display: 'inline-block',
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                background: 'rgba(0,86,179,0.12)',
                color: 'var(--primary, #0056b3)',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}>
                {historyData.length} nota(s) lançada(s)
              </span>
            </div>
          </div>

          {/* FORMULÁRIO DE INSERÇÃO / EDIÇÃO */}
          {showForm && (
            <div
              ref={formRef}
              style={{
                padding: '1.75rem',
                background: 'var(--glass, rgba(30, 41, 59, 0.6))',
                borderRadius: '16px',
                border: editingId ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: editingId ? '#f59e0b' : 'var(--text-main)' }}>
                  {editingId ? <Edit size={18} /> : <Plus size={18} />}
                  {editingId ? 'Editar Nota do Aluno' : 'Inserir Nova Nota'}
                </h4>
                {editingId && (
                  <span style={{ fontSize: '0.8rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '0.2rem 0.6rem', borderRadius: '8px', fontWeight: 700 }}>
                    Modo Edição
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                {/* Curso */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                    <BookOpen size={14} color="var(--primary)" /> Curso
                  </label>
                  <select
                    value={formData.curso_nome}
                    onChange={(e) => setFormData({ ...formData, curso_nome: e.target.value, modulo_nome: '' })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: '#fff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.9rem', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="">Selecione o curso...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.nome}>
                        {c.nome} {c.nivel ? `(${c.nivel})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Módulo */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                    <FileText size={14} color="var(--primary)" /> Módulo / Disciplina
                  </label>
                  <select
                    value={formData.modulo_nome}
                    onChange={(e) => setFormData({ ...formData, modulo_nome: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: '#fff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.9rem', outline: 'none', fontWeight: 600 }}
                    disabled={!formData.curso_nome}
                  >
                    <option value="">Selecione a matéria...</option>
                    {formData.modulo_nome && !availableModules.some((m: any) => m.titulo === formData.modulo_nome) && (
                      <option value={formData.modulo_nome}>{formData.modulo_nome} (Personalizado)</option>
                    )}
                    {availableModules.map((m: any) => (
                      <option key={m.id} value={m.titulo}>{m.titulo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                {/* Nota */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                    <GraduationCap size={14} color="var(--primary)" /> Nota (0 a 10, com meio ponto: 7, 7.5, 8, etc.)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={formData.nota}
                    onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                    placeholder="Ex: 8.5"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: '#fff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.9rem', outline: 'none', fontWeight: 700 }}
                  />
                </div>

                {/* Data de Conclusão */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                    <Calendar size={14} color="var(--primary)" /> Data de Conclusão
                  </label>
                  <input
                    type="date"
                    value={formData.data_conclusao}
                    onChange={(e) => setFormData({ ...formData, data_conclusao: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: '#fff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.9rem', outline: 'none', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Observação */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                  Observação (Opcional)
                </label>
                <textarea
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  rows={2}
                  placeholder="Ex: Equivalência de estudos, módulo presencial no polo, etc."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: '#fff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.88rem', resize: 'none', outline: 'none' }}
                />
              </div>

              {/* Botões do Formulário */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn btn-primary"
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', fontWeight: 700 }}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="spinner" /> Salvando...
                    </>
                  ) : editingId ? (
                    'Atualizar Nota'
                  ) : (
                    'Salvar Nota'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* LISTA / HISTÓRICO DE NOTAS DO ALUNO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GraduationCap size={20} color="var(--primary)" /> Histórico de Notas Lançadas ({historyData.length})
              </h4>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Todas as notas registradas para {selectedStudent.nome}
              </span>
            </div>

            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                <Loader2 className="spinner" size={28} style={{ opacity: 0.6, margin: '0 auto 0.75rem' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Carregando notas do aluno...</div>
              </div>
            ) : historyData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--glass-border)' }}>
                <FileText size={36} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                <h5 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700 }}>Nenhuma nota lançada manualmente ainda</h5>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Utilize o botão &ldquo;Inserir Outra Nota&rdquo; acima para cadastrar a primeira disciplina deste aluno.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {historyData.map((record) => {
                  const isApproved = record.nota >= 7.0;
                  const isEditingThis = editingId === record.id;
                  const isDeletingThis = deletingId === record.id;

                  return (
                    <div
                      key={record.id}
                      style={{
                        padding: '1.1rem 1.4rem',
                        background: isEditingThis ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)',
                        border: isEditingThis ? '1px solid rgba(245,158,11,0.5)' : '1px solid var(--glass-border)',
                        borderRadius: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '240px', flex: 1 }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: isApproved ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <GraduationCap size={22} color={isApproved ? '#10b981' : '#f59e0b'} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                            {record.modulo_nome}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                            <span>{record.curso_nome}</span>
                            <span>•</span>
                            <span>
                              <Calendar size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Concluído em {new Date(record.data_conclusao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            </span>
                            {record.observacao && (
                              <>
                                <span>•</span>
                                <span style={{ fontStyle: 'italic', color: 'var(--text-main)' }}>&ldquo;{record.observacao}&rdquo;</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        {/* Tag de Nota */}
                        <div style={{
                          padding: '0.4rem 0.9rem',
                          borderRadius: '12px',
                          background: isApproved ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: isApproved ? '#10b981' : '#f59e0b',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                          {isApproved ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                          <span>Nota: {Number(record.nota).toFixed(1)}</span>
                        </div>

                        {/* Ações: Editar e Excluir */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleStartEdit(record)}
                            className="btn btn-outline"
                            title="Editar esta nota"
                            style={{
                              padding: '0.45rem 0.75rem',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.82rem',
                              width: 'auto'
                            }}
                          >
                            <Edit size={14} /> Editar
                          </button>

                          <button
                            onClick={() => handleDelete(record.id, record.modulo_nome)}
                            disabled={isDeletingThis}
                            className="btn btn-outline"
                            title="Excluir esta nota"
                            style={{
                              padding: '0.45rem 0.75rem',
                              borderRadius: '8px',
                              color: '#ef4444',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.82rem',
                              width: 'auto'
                            }}
                          >
                            {isDeletingThis ? <Loader2 size={14} className="spinner" /> : <Trash2 size={14} />} Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= LISTA INICIAL DE ALUNOS ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Buscar aluno por nome, e-mail ou CPF para lançar nota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem',
                borderRadius: '14px', background: 'var(--glass, rgba(30, 41, 59, 0.5))',
                border: '1px solid var(--glass-border)', color: 'var(--text-main)',
                fontSize: '0.95rem', outline: 'none'
              }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <Loader2 className="spinner" size={32} style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
              <div style={{ color: 'var(--text-muted)' }}>Carregando alunos...</div>
            </div>
          ) : nucleoNames.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
              Nenhum aluno encontrado para os critérios pesquisados.
            </div>
          ) : (
            nucleoNames.map((nuc) => (
              <div key={nuc} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                <div 
                  onClick={() => setExpandedNucleos((prev) => ({ ...prev, [nuc]: !prev[nuc] }))}
                  style={{ padding: '1rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}
                >
                  <div style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} color="var(--primary)" /> {nuc}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{groupedStudents[nuc].length} aluno(s)</span>
                    {expandedNucleos[nuc] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </div>

                {expandedNucleos[nuc] && (
                  <div style={{ padding: '1rem', display: 'grid', gap: '0.5rem' }}>
                    {groupedStudents[nuc].sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || '')).map((s: any) => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectStudent(s)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--glass-border)', borderRadius: '14px',
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary, #0056b3)'; e.currentTarget.style.background = 'rgba(0,86,179,0.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
                            <User size={20} color="var(--primary, #0056b3)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>{s.nome}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {s.email} {s.cpf ? `• CPF: ${s.cpf}` : ''} {s.curso_opcao ? `• ${s.curso_opcao}` : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary, #0056b3)', fontWeight: 600, fontSize: '0.85rem' }}>
                          <span>Lançar Notas</span>
                          <ChevronRight size={18} />
                        </div>
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
