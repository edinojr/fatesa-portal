import React, { useState, useEffect, useMemo } from 'react'
import { 
  GraduationCap, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  X, 
  FileText, 
  History as HistoryIcon, 
  Award, 
  Download,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import Logo from '../../../components/common/Logo'
import LevelCertificate from './LevelCertificate'
import TranscriptDocument from './TranscriptDocument'
import { generateCertificadoPDF, generateHistoricoPDF } from '../../../utils/pdfGenerator'
import { fetchStudentAcademicSummary } from '../../../services/academicService'

interface AlumniRecord {
  id: string
  nome: string
  email: string
  curso: string
  nucleo: string
  ano_formacao: string
  nivel_curso: string
  matricula?: string
  observacoes: string
  historico?: { modulo: string; nota: string; data: string }[]
  certificados?: { id: string; titulo: string; data_emissao: string }[]
  rg?: string
  telefone?: string
  cep?: string
  endereco?: string
  bairro?: string
  cidade?: string
  uf?: string
  codigo_verificacao?: string
  user_id?: string | null
  status_aprovacao?: string
  created_at: string
}

type AlumniTab = 'cadastrados_na_lista' | 'na_lista_sem_cadastro' | 'fora_da_lista_pendentes';

const AlumniManagement = () => {
  const [records, setRecords] = useState<AlumniRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentTab, setCurrentTab] = useState<AlumniTab>('cadastrados_na_lista')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const ITEMS_PER_PAGE = 50
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AlumniRecord | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDossie, setShowDossie] = useState(false)
  const [selectedAlumni, setSelectedAlumni] = useState<AlumniRecord | null>(null)
  const [showCertificate, setShowCertificate] = useState(false)
  const [activeHistoryItem, setActiveHistoryItem] = useState<any>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyCourseId, setHistoryCourseId] = useState('')
  const [historyDrafts, setHistoryDrafts] = useState<{ modulo: string; nota: string; data: string; manual?: boolean; registered?: boolean }[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  // Níveis de curso pré-definidos
  const niveis = ['Básico', 'Médio']

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    curso: '',
    nucleo: '',
    ano_formacao: '',
    matricula: '',
    nivel_curso: 'Básico',
    observacoes: '',
    rg: '',
    telefone: '',
    cep: '',
    endereco: '',
    bairro: '',
    cidade: '',
    uf: ''
  })
  
  const [showLevelCertificate, setShowLevelCertificate] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    fetchRecords()
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('cursos')
        .select('id, nome, nivel, livros(id, titulo, ordem)')
        .order('nome')
      if (error) throw error
      const sorted = (data || []).map((c: any) => ({
        ...c,
        livros: [...(c.livros || [])].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))
      }))
      setCourses(sorted)
    } catch (err) {
      console.error('Error fetching courses for history:', err)
    }
  }

  const fetchRecords = async () => {
    try {
      setLoading(true)
      setFetchError(null)
      const [alumniRes, usersRes] = await Promise.all([
        supabase
          .from('registros_alumni')
          .select('*')
          .order('nome', { ascending: true }),
        supabase
          .from('users')
          .select('id, nome, email, tipo, nucleo, created_at')
          .eq('tipo', 'ex_aluno')
      ])
      
      if (alumniRes.error) throw alumniRes.error

      const alumniData: AlumniRecord[] = [...(alumniRes.data || [])]

      // Detectar usuários cadastrados como ex_aluno que ainda não possuem linha em registros_alumni
      const linkedUserIds = new Set(alumniData.map(a => a.user_id).filter(Boolean))
      const registeredEmails = new Set(alumniData.map(a => (a.email || '').toLowerCase().trim()).filter(Boolean))

      if (usersRes.data) {
        usersRes.data.forEach((u: any) => {
          if (!linkedUserIds.has(u.id) && !registeredEmails.has((u.email || '').toLowerCase().trim())) {
            alumniData.push({
              id: `user-${u.id}`,
              user_id: u.id,
              nome: u.nome || 'Aluno Sem Nome',
              email: u.email || '',
              curso: 'Teologia',
              nivel_curso: 'Básico',
              nucleo: u.nucleo || 'Geral',
              ano_formacao: 'Pendente',
              observacoes: '[PENDENTE_APROVACAO] Cadastro realizado no portal - Aguardando aprovação administrativa.',
              status_aprovacao: 'pendente',
              created_at: u.created_at || new Date().toISOString()
            })
          }
        })
      }

      setRecords(alumniData)
    } catch (err: any) {
      console.error('Error fetching alumni records:', err)
      setFetchError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const toISODate = (s: string): string => {
    if (!s) return new Date().toISOString().split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    const d = new Date(s)
    return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0]
  }

  const toDisplayDate = (iso: string): string => {
    const d = new Date(iso + 'T12:00:00')
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString()
  }

  const buildHistoryDrafts = (courseId: string, alumni: AlumniRecord | null) => {
    const course = courses.find(c => c.id === courseId)
    const histMap = new Map(
      (alumni?.historico || []).map((h: any) => [String(h.modulo || '').toLowerCase().trim(), h])
    )
    const today = new Date().toISOString().split('T')[0]
    const drafts = (course?.livros || []).map((m: any) => {
      const existing = histMap.get(String(m.titulo || '').toLowerCase().trim())
      return {
        modulo: m.titulo as string,
        nota: existing?.nota != null ? String(existing.nota) : '',
        data: toISODate(existing?.data || today),
        registered: !!existing
      }
    })
    if (drafts.length === 0) drafts.push({ modulo: '', nota: '', data: today, manual: true })
    return drafts
  }

  const saveAllHistory = async () => {
    if (!selectedAlumni) return
    const filled = historyDrafts.filter(d => d.modulo.trim() !== '' && d.nota.trim() !== '')
    if (filled.length === 0) {
      alert('Preencha ao menos um módulo com nota.')
      return
    }
    for (const d of filled) {
      const n = parseFloat(d.nota.replace(',', '.'))
      if (isNaN(n) || n < 0 || n > 10) {
        alert(`Nota inválida em "${d.modulo}". Use um valor entre 0 e 10.`)
        return
      }
    }
    setActionLoading('history')
    try {
      // Entradas antigas de módulos que estão na lista são substituídas pelas
      // notas digitadas; nota esvaziada = registro removido. Entradas de
      // matérias fora da grade são preservadas.
      const draftTitles = new Set(
        historyDrafts.filter(d => d.modulo.trim() !== '').map(d => d.modulo.toLowerCase().trim())
      )
      const others = (selectedAlumni.historico || []).filter(
        (h: any) => !draftTitles.has(String(h.modulo || '').toLowerCase().trim())
      )
      const newHistory = [
        ...others,
        ...filled.map(d => ({
          modulo: d.modulo.trim(),
          nota: d.nota.replace(',', '.').trim(),
          data: toDisplayDate(d.data)
        }))
      ]
      const { error } = await supabase
        .from('registros_alumni')
        .update({ historico: newHistory })
        .eq('id', selectedAlumni.id)
      if (error) throw error
      const updated = { ...selectedAlumni, historico: newHistory }
      setSelectedAlumni(updated)
      setRecords(prev => prev.map(r => (r.id === updated.id ? updated : r)))
      setShowHistoryModal(false)
    } catch (err: any) {
      alert('Erro ao salvar o histórico: ' + (err?.message || err))
    } finally {
      setActionLoading(null)
    }
  }

  const removeHistoryEntry = async (idx: number) => {
    if (!selectedAlumni || !selectedAlumni.historico) return
    if (!window.confirm('Remover este registro do histórico?')) return
    setActionLoading('history')
    try {
      const newHistory = selectedAlumni.historico.filter((_: any, i: number) => i !== idx)
      const { error } = await supabase
        .from('registros_alumni')
        .update({ historico: newHistory })
        .eq('id', selectedAlumni.id)
      if (error) throw error
      const updated = { ...selectedAlumni, historico: newHistory }
      setSelectedAlumni(updated)
      setRecords(prev => prev.map(r => (r.id === updated.id ? updated : r)))
    } catch (err: any) {
      alert('Erro ao remover do histórico: ' + (err?.message || err))
    } finally {
      setActionLoading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading('saving')

    try {
      if (editingRecord) {
        const { error } = await supabase
          .from('registros_alumni')
          .update(formData)
          .eq('id', editingRecord.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('registros_alumni')
          .insert(formData)
        if (error) throw error
      }

      setShowModal(false)
      setEditingRecord(null)
      setFormData({ 
        nome: '', email: '', curso: '', nucleo: '', ano_formacao: '', 
        matricula: '', nivel_curso: 'Básico', observacoes: '',
        rg: '', telefone: '', cep: '', endereco: '', bairro: '', cidade: '', uf: ''
      })
      fetchRecords()
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro de Formado?')) return
    
    try {
      const { error } = await supabase
        .from('registros_alumni')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchRecords()
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  const handleEdit = (record: AlumniRecord) => {
    setEditingRecord(record)
    setFormData({
      nome: record.nome,
      email: record.email,
      curso: record.curso || '',
      nucleo: record.nucleo || '',
      ano_formacao: record.ano_formacao || '',
      matricula: record.matricula || '',
      nivel_curso: record.nivel_curso || 'Básico',
      observacoes: record.observacoes || '',
      rg: record.rg || '',
      telefone: record.telefone || '',
      cep: record.cep || '',
      endereco: record.endereco || '',
      bairro: record.bairro || '',
      cidade: record.cidade || '',
      uf: record.uf || ''
    })
    setShowModal(true)
  }

  // 1. Alunos formados com o nome na lista que fizeram o cadastro
  const cadastradosNaLista = useMemo(() => {
    return records
      .filter(r => !!r.user_id && r.status_aprovacao !== 'pendente' && !r.observacoes?.includes('[PENDENTE_APROVACAO]'))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }))
  }, [records]);

  // 2. Alunos que estão nessa lista que NÃO fizeram cadastro
  const naListaSemCadastro = useMemo(() => {
    return records
      .filter(r => !r.user_id && r.status_aprovacao !== 'pendente' && !r.observacoes?.includes('[PENDENTE_APROVACAO]'))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }))
  }, [records]);

  // 3. Alunos que NÃO estão nessa lista e fizeram cadastro (aguardando aprovação)
  const foraDaListaPendentes = useMemo(() => {
    return records
      .filter(r => r.status_aprovacao === 'pendente' || r.observacoes?.includes('[PENDENTE_APROVACAO]'))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }))
  }, [records]);

  // Lista da aba ativa filtrada por nome (ordem alfabética estrita)
  const activeList = useMemo(() => {
    let baseList: AlumniRecord[] = [];
    if (currentTab === 'cadastrados_na_lista') baseList = cadastradosNaLista;
    else if (currentTab === 'na_lista_sem_cadastro') baseList = naListaSemCadastro;
    else baseList = foraDaListaPendentes;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      baseList = baseList.filter(r => 
        (r.nome || '').toLowerCase().includes(term) ||
        (r.email || '').toLowerCase().includes(term) ||
        (r.nucleo || '').toLowerCase().includes(term) ||
        (r.matricula || '').toLowerCase().includes(term)
      );
    }

    return baseList.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [currentTab, cadastradosNaLista, naListaSemCadastro, foraDaListaPendentes, searchTerm]);

  // Paginação
  const totalPages = Math.ceil(activeList.length / ITEMS_PER_PAGE) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return activeList.slice(start, start + ITEMS_PER_PAGE);
  }, [activeList, currentPage]);

  const handleEmitirCertificado = async (record: AlumniRecord) => {
    let nivel: 'basico' | 'medio' = (record.nivel_curso || '').toLowerCase().includes('méd') ? 'medio' : 'basico';
    const defaultChoice = nivel === 'medio' ? 'M' : 'B';

    const choice = window.prompt(
      `Emitir Certificado Oficial Padrão (Histórico Consolidado)\nAluno: ${record.nome}\n\nQual certificado deseja emitir? Digite 'M' para MÉDIO ou 'B' para BÁSICO:`,
      defaultChoice
    );
    if (!choice) return;

    if (choice.trim().toUpperCase() === 'M') {
      nivel = 'medio';
    } else if (choice.trim().toUpperCase() === 'B') {
      nivel = 'basico';
    } else {
      alert("Opção inválida. Digite 'B' para BÁSICO ou 'M' para MÉDIO.");
      return;
    }

    const nomeImpresso = window.prompt(
      "Digite ou confirme o nome do aluno que sairá no certificado:",
      record.nome
    );
    if (!nomeImpresso || !nomeImpresso.trim()) return;

    try {
      const summary = await fetchStudentAcademicSummary(record);
      await generateCertificadoPDF(nomeImpresso.trim(), nivel, summary.dataConclusao);
    } catch (err: any) {
      console.warn('Erro ao obter data da última prova, emitindo com data do pedido:', err);
      try {
        await generateCertificadoPDF(nomeImpresso.trim(), nivel, new Date());
      } catch (e: any) {
        alert('Erro ao gerar certificado: ' + e.message);
      }
    }
  };

  const handleEmitirCertificadoAvulso = async () => {
    let nivel: 'basico' | 'medio' = 'basico';

    const choice = window.prompt(
      `Emitir Certificado Avulso (Padrão Histórico Consolidado)\n\nQual certificado deseja emitir? Digite 'M' para MÉDIO ou 'B' para BÁSICO:`,
      'B'
    );
    if (!choice) return;

    if (choice.trim().toUpperCase() === 'M') {
      nivel = 'medio';
    } else if (choice.trim().toUpperCase() === 'B') {
      nivel = 'basico';
    } else {
      alert("Opção inválida. Digite 'B' para BÁSICO ou 'M' para MÉDIO.");
      return;
    }

    const nomeImpresso = window.prompt("Digite o nome completo do aluno que sairá no certificado:");
    if (!nomeImpresso || !nomeImpresso.trim()) return;

    try {
      await generateCertificadoPDF(nomeImpresso.trim(), nivel, new Date());
    } catch (err: any) {
      alert('Erro ao gerar certificado: ' + err.message);
    }
  };

  const handleDownloadHistoricoAlumni = async (record: AlumniRecord) => {
    const alunoData = {
      nome: record.nome,
      nucleo: record.nucleo || 'Geral',
      matricula: record.matricula || 'N/A',
      dataMatricula: record.ano_formacao || 'N/A',
      status: 'Formado'
    };

    let materiasParaHistorico: { nome: string; media: string | number }[] = (record.historico || [])
      .filter(h => h.modulo && h.nota)
      .map(h => ({
        nome: h.modulo,
        media: h.nota
      }));

    if (materiasParaHistorico.length === 0 && (record.user_id || record.email)) {
      try {
        const summary = await fetchStudentAcademicSummary({
          id: record.user_id,
          email: record.email,
          nome: record.nome,
          nucleo: record.nucleo,
          tipo: 'ex_aluno'
        });
        materiasParaHistorico = summary.materias.map(m => ({ nome: m.nome, media: m.media }));
      } catch (e) {
        console.warn('Erro ao consolidar matérias para alumni:', e);
      }
    }

    if (materiasParaHistorico.length === 0) {
      alert("Nenhuma matéria com nota registrada para este aluno.");
      return;
    }

    try {
      await generateHistoricoPDF(alunoData, materiasParaHistorico, record.nivel_curso || 'Básico');
    } catch (err: any) {
      alert('Erro ao gerar histórico escolar: ' + err.message);
    }
  };

  const handleApproveAlumni = async (record: AlumniRecord) => {
    if (!window.confirm(`Deseja aprovar o cadastro de formado para "${record.nome}"?`)) return;

    setActionLoading(`approve-${record.id}`);
    try {
      if (record.id.startsWith('user-')) {
        const userId = record.user_id!;
        const { error: insErr } = await supabase.from('registros_alumni').insert({
          nome: record.nome.toUpperCase(),
          email: record.email.toLowerCase(),
          curso: record.curso || 'Teologia',
          nivel_curso: record.nivel_curso || 'Básico',
          nucleo: record.nucleo || 'Geral',
          ano_formacao: new Date().getFullYear().toString(),
          user_id: userId,
          status_aprovacao: 'aprovado',
          observacoes: `Aprovado pela administração em ${new Date().toLocaleDateString('pt-BR')}`
        });
        if (insErr) throw insErr;
        await supabase.from('users').update({ acesso_definitivo: true, tipo: 'ex_aluno' }).eq('id', userId);
      } else {
        const { error: rpcErr } = await supabase.rpc('aprovar_alumni', {
          p_alumni_id: record.id,
          p_observacao: `Aprovado pela administração em ${new Date().toLocaleDateString('pt-BR')}`
        });

        if (rpcErr) {
          const cleanObs = (record.observacoes || '').replace('[PENDENTE_APROVACAO]', '').trim();
          const { error: updErr } = await supabase
            .from('registros_alumni')
            .update({
              status_aprovacao: 'aprovado',
              observacoes: cleanObs ? `${cleanObs} (Aprovado em ${new Date().toLocaleDateString('pt-BR')})` : `Aprovado pela administração em ${new Date().toLocaleDateString('pt-BR')}`
            })
            .eq('id', record.id);
          if (updErr) throw updErr;

          if (record.user_id) {
            await supabase.from('users').update({ acesso_definitivo: true, tipo: 'ex_aluno' }).eq('id', record.user_id);
          }
        }
      }

      alert(`Aluno "${record.nome}" aprovado com sucesso! Agora consta na lista oficial com acesso liberado.`);
      await fetchRecords();
    } catch (err: any) {
      alert('Erro ao aprovar aluno: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Modal de histórico: lista única com todos os módulos do curso
  const historyFilledCount = historyDrafts.filter(d => d.modulo.trim() !== '' && d.nota.trim() !== '').length;

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="spinner" /> Carregando base de Formados...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Base de Formados</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Gestão completa de alunos formados, aprovação de cadastros e emissão de certificados oficiais.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-outline" 
            style={{ 
              width: 'auto',
              cursor: actionLoading === 'importing-file' ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }} 
            onClick={() => document.getElementById('import-alumni-file-input')?.click()}
            disabled={!!actionLoading}
            title="Importar lista de formados via Excel ou CSV"
          >
            {actionLoading === 'importing-file' ? (
              <Loader2 className="spinner" size={18} />
            ) : (
              <FileText size={18} />
            )}
            <span>Importar Planilha</span>
          </button>
          <input 
            id="import-alumni-file-input"
            type="file" 
            accept=".xlsx,.xls,.cvs,.csv" 
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }} 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setActionLoading('importing-file');
              try {
                const { importAlumniFile } = await import('../../../services/import_alumni_file');
                const result = await importAlumniFile(file);
                alert(`Importação concluída!\nLidas: ${result.total}\nSucessos (Formados): ${result.success}\nErros: ${result.errors}`);
                fetchRecords();
              } catch (err: any) {
                alert('Erro na importação: ' + err.message);
              } finally {
                setActionLoading(null);
                e.target.value = '';
              }
            }}
          />
          <button 
            className="btn btn-outline" 
            style={{ 
              width: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderColor: 'rgba(234, 179, 8, 0.5)',
              color: '#eab308',
              fontWeight: 700
            }} 
            onClick={handleEmitirCertificadoAvulso}
            title="Emitir Certificado Oficial Padrão (Histórico Consolidado)"
          >
            <GraduationCap size={18} />
            <span>Emitir Certificado</span>
          </button>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditingRecord(null); setFormData({ nome: '', email: '', curso: '', nucleo: '', ano_formacao: '', matricula: '', nivel_curso: 'Básico', observacoes: '', rg: '', telefone: '', cep: '', endereco: '', bairro: '', cidade: '', uf: '' }); setShowModal(true); }}>
            <Plus size={18} /> Adicionar Formado
          </button>
        </div>
      </header>

      {/* BANNER CERTIFICADO PADRÃO HISTÓRICO CONSOLIDADO */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(234, 179, 8, 0.06)',
        border: '1px solid rgba(234, 179, 8, 0.25)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
            <Award size={26} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Certificado Oficial Padrão (Histórico Consolidado)</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Emita o certificado oficial em PDF (Básico ou Médio) com o mesmo modelo de Histórico Consolidado.
            </p>
          </div>
        </div>
        <button 
          onClick={handleEmitirCertificadoAvulso} 
          className="btn" 
          style={{ background: '#eab308', color: '#000', fontWeight: 800, padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <GraduationCap size={18} /> Emitir Certificado
        </button>
      </div>

      {fetchError && (
        <div className="admin-card" style={{ border: '1px solid #dc2626', background: 'rgba(220,38,38,0.06)', padding: '1rem 1.5rem', color: '#dc2626' }}>
          <strong>Aviso:</strong> {fetchError}
        </div>
      )}

      {/* 3 CARDS DE ALUNOS FORMADOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* CARD 1: NA LISTA COM CADASTRO */}
        <div 
          onClick={() => { setCurrentTab('cadastrados_na_lista'); setCurrentPage(1); }}
          style={{
            background: currentTab === 'cadastrados_na_lista' ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)' : 'var(--glass)',
            border: currentTab === 'cadastrados_na_lista' ? '2px solid #22c55e' : '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '1.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: currentTab === 'cadastrados_na_lista' ? '0 8px 24px rgba(34, 197, 94, 0.2)' : '0 4px 12px rgba(0,0,0,0.05)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Na Lista com Cadastro</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Conta ativa no portal</span>
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#22c55e' }}>
              {cadastradosNaLista.length}
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Alunos formados da lista oficial que já ativaram sua conta e têm acesso completo aos certificados.
          </p>
        </div>

        {/* CARD 2: NA LISTA SEM CADASTRO */}
        <div 
          onClick={() => { setCurrentTab('na_lista_sem_cadastro'); setCurrentPage(1); }}
          style={{
            background: currentTab === 'na_lista_sem_cadastro' ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)' : 'var(--glass)',
            border: currentTab === 'na_lista_sem_cadastro' ? '2px solid #3b82f6' : '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '1.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: currentTab === 'na_lista_sem_cadastro' ? '0 8px 24px rgba(59, 130, 246, 0.2)' : '0 4px 12px rgba(0,0,0,0.05)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <GraduationCap size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Na Lista sem Cadastro</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aguardando ativação</span>
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#3b82f6' }}>
              {naListaSemCadastro.length}
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Registros históricos que ainda não criaram login. Você pode emitir certificados para eles a qualquer momento.
          </p>
        </div>

        {/* CARD 3: FORA DA LISTA (AGUARDANDO APROVAÇÃO) */}
        <div 
          onClick={() => { setCurrentTab('fora_da_lista_pendentes'); setCurrentPage(1); }}
          style={{
            background: currentTab === 'fora_da_lista_pendentes' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)' : 'var(--glass)',
            border: currentTab === 'fora_da_lista_pendentes' ? '2px solid #f59e0b' : foraDaListaPendentes.length > 0 ? '1px solid #f59e0b' : '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '1.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: currentTab === 'fora_da_lista_pendentes' ? '0 8px 24px rgba(245, 158, 11, 0.2)' : '0 4px 12px rgba(0,0,0,0.05)',
            position: 'relative'
          }}
        >
          {foraDaListaPendentes.length > 0 && (
            <div style={{ position: 'absolute', top: '-10px', right: '15px', background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 900, padding: '2px 10px', borderRadius: '50px', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)' }}>
              {foraDaListaPendentes.length} PENDENTE{foraDaListaPendentes.length > 1 ? 'S' : ''}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <Clock size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Cadastrados Fora da Lista</h3>
                <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>Aguardam Aprovação</span>
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b' }}>
              {foraDaListaPendentes.length}
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Fizeram cadastro no portal mas não estavam na lista. Aprove para liberar o acesso e emitir o certificado.
          </p>
        </div>
      </div>

      {/* SEÇÃO DA ABA SELECIONADA COM BARRA DE BUSCA EM TEMPO REAL */}
      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {currentTab === 'cadastrados_na_lista' && (
                <>
                  <CheckCircle2 size={22} color="#22c55e" />
                  Alunos na Lista com Cadastro
                </>
              )}
              {currentTab === 'na_lista_sem_cadastro' && (
                <>
                  <GraduationCap size={22} color="#3b82f6" />
                  Alunos na Lista sem Cadastro no Portal
                </>
              )}
              {currentTab === 'fora_da_lista_pendentes' && (
                <>
                  <Clock size={22} color="#f59e0b" />
                  Cadastrados Fora da Lista (Aguardando Aprovação)
                </>
              )}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Total: {activeList.length} aluno(s) listados em <strong>ordem alfabética (A-Z)</strong>
            </span>
          </div>

          {/* CAMPO DE BUSCA POR NOME */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '3rem' }} 
              placeholder="Buscar por nome do aluno..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* TABELA DE ALUNOS EM ORDEM ALFABÉTICA */}
        {activeList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            {searchTerm ? `Nenhum aluno encontrado com o termo "${searchTerm}".` : 'Nenhum registro encontrado nesta categoria.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Nome Completo</th>
                  <th>E-mail</th>
                  <th>Polo / Núcleo</th>
                  <th>Situação / Ano</th>
                  <th style={{ textAlign: 'center', minWidth: '220px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((record, index) => {
                  const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                  const isPending = record.status_aprovacao === 'pendente' || record.observacoes?.includes('[PENDENTE_APROVACAO]');

                  return (
                    <tr key={record.id} style={{ background: isPending ? 'rgba(245, 158, 11, 0.03)' : undefined }}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{globalIdx}</td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{record.nome}</div>
                        {record.matricula && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Matrícula: {record.matricula}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{record.email || '—'}</div>
                        {record.telefone && (
                          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{record.telefone}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{record.nucleo || 'Geral / Sem Polo'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{record.curso || 'Teologia'} ({record.nivel_curso || 'Básico'})</div>
                      </td>
                      <td>
                        {isPending ? (
                          <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> Aguarda Aprovação
                          </span>
                        ) : record.user_id ? (
                          <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Cadastrado no Portal
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700 }}>
                            Lista Oficial ({record.ano_formacao || 'Histórico'})
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {/* BOTÃO DE APROVAÇÃO RÁPIDA (PARA A CATEGORIA 3) */}
                          {isPending && (
                            <button 
                              className="btn btn-primary"
                              onClick={() => handleApproveAlumni(record)}
                              disabled={actionLoading === `approve-${record.id}`}
                              style={{ 
                                padding: '6px 14px', 
                                fontSize: '0.8rem', 
                                background: '#16a34a', 
                                borderColor: '#16a34a',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 700
                              }}
                              title="Aprovar aluno e liberar acesso aos certificados"
                            >
                              {actionLoading === `approve-${record.id}` ? <Loader2 size={14} className="spinner" /> : <Check size={14} />}
                              Aprovar Aluno
                            </button>
                          )}

                          {/* BOTÃO EMITIR CERTIFICADO OFICIAL */}
                          <button 
                            className="btn" 
                            onClick={() => handleEmitirCertificado(record)} 
                            title="Emitir Certificado PDF Oficial (Padrão Histórico Consolidado)" 
                            style={{ 
                              padding: '0.4rem 0.75rem', 
                              fontSize: '0.8rem', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.35rem', 
                              background: 'rgba(234, 179, 8, 0.15)', 
                              color: '#eab308', 
                              border: '1px solid rgba(234, 179, 8, 0.35)', 
                              borderRadius: '8px', 
                              fontWeight: 700,
                              cursor: 'pointer' 
                            }}
                          >
                            <Award size={15} />
                            <span>Emitir Certificado</span>
                          </button>

                          {/* BOTÃO BAIXAR HISTÓRICO OFICIAL */}
                          {record.historico && record.historico.length > 0 && (
                            <button 
                              className="btn" 
                              onClick={() => handleDownloadHistoricoAlumni(record)} 
                              title="Baixar Histórico Escolar Oficial em PDF (Padrão Consolidado)" 
                              style={{ 
                                padding: '0.4rem 0.75rem', 
                                fontSize: '0.8rem', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.35rem', 
                                background: 'rgba(59, 130, 246, 0.15)', 
                                color: '#60a5fa', 
                                border: '1px solid rgba(59, 130, 246, 0.35)', 
                                borderRadius: '8px', 
                                fontWeight: 700,
                                cursor: 'pointer' 
                              }}
                            >
                              <FileText size={15} />
                              <span>Histórico PDF</span>
                            </button>
                          )}

                          {/* VER DOSSIÊ / HISTÓRICO */}
                          <button 
                            className="btn btn-icon" 
                            onClick={() => { setSelectedAlumni(record); setShowDossie(true); }} 
                            title="Ver Dossiê / Histórico Completo"
                          >
                            <FileText size={16} color="var(--primary)" />
                          </button>

                          {/* EDITAR */}
                          <button 
                            className="btn btn-icon" 
                            onClick={() => handleEdit(record)} 
                            title="Editar Dados"
                          >
                            <Edit size={16} />
                          </button>

                          {/* EXCLUIR */}
                          <button 
                            className="btn btn-icon text-error" 
                            onClick={() => handleDelete(record.id)} 
                            title="Excluir Registro"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* CONTROLES DE PAGINAÇÃO */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({activeList.length} registros no total)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <button 
                className="btn btn-outline" 
                style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{editingRecord ? 'Editar Registro' : 'Novo Registro de Formado'}</h2>
                <button className="btn-icon" onClick={() => setShowModal(false)}><X /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label>Nome Completo</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>E-mail</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Especialidade do Curso</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: Teologia Sistemática"
                    value={formData.curso}
                    onChange={(e) => setFormData({...formData, curso: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Nível</label>
                  <select 
                    className="form-control"
                    value={formData.nivel_curso}
                    onChange={(e) => setFormData({...formData, nivel_curso: e.target.value})}
                  >
                    {niveis.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>RG</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.rg}
                    onChange={(e) => setFormData({...formData, rg: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Ano de Formação</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: 2023"
                    value={formData.ano_formacao}
                    onChange={(e) => setFormData({...formData, ano_formacao: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Polo / Núcleo</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.nucleo}
                    onChange={(e) => setFormData({...formData, nucleo: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Matrícula</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: 2023.1.001"
                    value={formData.matricula}
                    onChange={(e) => setFormData({...formData, matricula: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Observações Adicionais</label>
                <textarea 
                  className="form-control" 
                  rows={3}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  placeholder="Informações relevantes sobre o formado..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={!!actionLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={!!actionLoading}>
                  {actionLoading === 'saving' ? <Loader2 className="spinner" /> : (editingRecord ? 'Salvar Alterações' : 'Cadastrar Formado')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DOSSIÊ / HISTÓRICO */}
      {showDossie && selectedAlumni && (
        <div className="modal-overlay" onClick={() => setShowDossie(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary)', color: '#fff', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h2 style={{ margin: 0 }}>Dossiê do Formado</h2>
                  <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>{selectedAlumni.nome} • {selectedAlumni.curso}</p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowDossie(false)}><X /></button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: 'auto', gap: '0.75rem', padding: '0.75rem 1.5rem', background: '#eab308', color: '#000', borderColor: '#eab308', fontWeight: 800 }}
                  onClick={() => handleEmitirCertificado(selectedAlumni)}
                >
                  <Award size={20} /> EMITIR CERTIFICADO PADRÃO ({selectedAlumni.nivel_curso || 'BÁSICO'})
                </button>
                <button
                  className="btn btn-outline"
                  style={{ width: 'auto', gap: '0.75rem', padding: '0.75rem 1.5rem' }}
                  onClick={() => handleDownloadHistoricoAlumni(selectedAlumni)}
                  disabled={!selectedAlumni.historico || selectedAlumni.historico.length === 0}
                  title={(!selectedAlumni.historico || selectedAlumni.historico.length === 0) ? 'Insira as notas no histórico primeiro' : 'Gerar Histórico Consolidado em PDF'}
                >
                  <FileText size={20} /> EMITIR HISTÓRICO ESCOLAR (PDF)
                </button>
            </div>

            <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'rgba(var(--primary-rgb), 0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HistoryIcon size={18} /> Histórico Escolar (Módulos Concluídos)
                </h3>
                <button 
                  className="btn btn-outline" 
                  style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                  onClick={() => {
                    const nivelMap: Record<string, string> = { 'Básico': 'basico', 'Basico': 'basico', 'Médio': 'medio', 'Medio': 'medio' }
                    const matched = courses.find(c => c.nome === selectedAlumni.curso)
                      || courses.find(c => c.nivel === nivelMap[selectedAlumni.nivel_curso])
                      || courses[0]
                    const courseId = matched?.id || ''
                    setHistoryCourseId(courseId)
                    setHistoryDrafts(buildHistoryDrafts(courseId, selectedAlumni))
                    setShowHistoryModal(true)
                  }}
                  disabled={actionLoading === 'history'}
                >
                  <Plus size={14} /> Adicionar Registro
                </button>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Módulo / Bloco</th>
                    <th style={{ textAlign: 'center' }}>Nota</th>
                    <th style={{ textAlign: 'center' }}>Data</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedAlumni.historico || selectedAlumni.historico.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Nenhum registro no histórico.</td>
                    </tr>
                  ) : (
                    selectedAlumni.historico.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.modulo}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                            {item.nota}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{item.data}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-primary" 
                              style={{ width: 'auto', padding: '0.3rem 0.75rem', fontSize: '0.75rem', gap: '0.3rem' }}
                              onClick={() => {
                                setActiveHistoryItem(item);
                                setShowCertificate(true);
                              }}
                            >
                              <GraduationCap size={14} /> GERAR CERTIFICADO
                            </button>
                            <button 
                              className="btn btn-icon text-error"
                              onClick={() => removeHistoryEntry(idx)}
                              disabled={actionLoading === 'history'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INSERÇÃO DE HISTÓRICO (LISTA ÚNICA) */}
      {showHistoryModal && selectedAlumni && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '660px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>Inserir Notas do Histórico</h2>
                <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>{selectedAlumni.nome} • {selectedAlumni.nivel_curso} • lista única da grade</p>
              </div>
              <button className="btn-icon" onClick={() => setShowHistoryModal(false)}><X /></button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveAllHistory(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {courses.length > 0 && (
                <div className="form-group">
                  <label>Curso (matérias cadastradas)</label>
                  <select
                    className="form-control"
                    value={historyCourseId}
                    onChange={(e) => {
                      const id = e.target.value
                      setHistoryCourseId(id)
                      setHistoryDrafts(buildHistoryDrafts(id, selectedAlumni))
                    }}
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 90px 140px 40px', gap: '0.5rem', padding: '0.6rem 0.75rem', background: 'rgba(var(--primary-rgb), 0.06)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Matéria</span>
                  <span style={{ textAlign: 'center' }}>Nota</span>
                  <span style={{ textAlign: 'center' }}>Conclusão</span>
                  <span />
                </div>
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {historyDrafts.map((d, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 90px 140px 40px', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 0.75rem', borderTop: '1px solid var(--glass-border)', background: d.nota.trim() !== '' ? 'rgba(var(--primary-rgb), 0.03)' : 'transparent' }}>
                      {d.manual ? (
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                          placeholder="Nome da matéria (fora da grade)"
                          value={d.modulo}
                          onChange={(e) => setHistoryDrafts(prev => prev.map((p, i) => (i === idx ? { ...p, modulo: e.target.value } : p)))}
                        />
                      ) : (
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {d.modulo}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: d.registered ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {d.registered ? 'no histórico' : 'novo'}
                          </div>
                        </div>
                      )}
                      <input
                        type="number"
                        className="form-control"
                        style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem', textAlign: 'center' }}
                        placeholder="—"
                        min="0"
                        max="10"
                        step="0.1"
                        value={d.nota}
                        onChange={(e) => setHistoryDrafts(prev => prev.map((p, i) => (i === idx ? { ...p, nota: e.target.value } : p)))}
                      />
                      <input
                        type="date"
                        className="form-control"
                        style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                        value={d.data}
                        onChange={(e) => setHistoryDrafts(prev => prev.map((p, i) => (i === idx ? { ...p, data: e.target.value } : p)))}
                      />
                      <button
                        type="button"
                        className="btn btn-icon text-error"
                        title={d.manual ? 'Remover linha' : 'Limpar nota (remove do histórico ao salvar)'}
                        onClick={() => {
                          if (d.manual) {
                            setHistoryDrafts(prev => prev.filter((_, i) => i !== idx))
                          } else {
                            setHistoryDrafts(prev => prev.map((p, i) => (i === idx ? { ...p, nota: '', data: new Date().toISOString().split('T')[0] } : p)))
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline"
                style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                onClick={() => setHistoryDrafts(prev => [...prev, { modulo: '', nota: '', data: new Date().toISOString().split('T')[0], manual: true }])}
              >
                <Plus size={14} /> Adicionar matéria fora da grade
              </button>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowHistoryModal(false)} disabled={actionLoading === 'history'}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={actionLoading === 'history'}>
                  {actionLoading === 'history' ? <Loader2 className="spinner" /> : `Salvar Histórico (${historyFilledCount} nota${historyFilledCount === 1 ? '' : 's'})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OVERLAY DE CERTIFICADO (IMPRESSÃO) */}
      {showCertificate && selectedAlumni && activeHistoryItem && (
        <div 
          className="modal-overlay" 
          style={{ background: '#f0f0f0', zIndex: 9999, overflowY: 'auto', padding: '2rem' }}
          onClick={() => setShowCertificate(false)}
        >
          <div 
            className="certificate-paper"
            onClick={e => e.stopPropagation()}
            style={{ 
              background: '#fff', 
              width: '297mm', 
              height: '210mm', 
              margin: '0 auto', 
              padding: '2rem',
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              border: '20px solid var(--primary)',
              borderRadius: '2px'
            }}
          >
            <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}><Logo /></div>
            
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--primary)', margin: 0, letterSpacing: '2px' }}>CERTIFICADO</h1>
              <p style={{ fontSize: '1.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '4px' }}>De Conclusão de Módulo</p>
            </div>

            <div style={{ maxWidth: '80%', lineHeight: '1.6' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
                Certificamos para os devidos fins que o(a) aluno(a)
              </p>
              <h2 style={{ 
                fontSize: (selectedAlumni.nome || '').trim().length >= 24 ? '2.25rem' : '3rem', 
                fontWeight: 800, 
                margin: '1.5rem 0', 
                color: '#1a1a1a',
                textAlign: 'center',
                wordBreak: 'break-word',
                lineHeight: 1.2
              }}>
                {selectedAlumni.nome.toUpperCase()}
              </h2>
              <p style={{ fontSize: '1.4rem' }}>
                Concluiu com êxito o módulo/bloco de <br/>
                <strong style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>{activeHistoryItem.modulo}</strong> <br/>
                pelo curso de <strong>{selectedAlumni.curso}</strong>, obtendo a nota final de <strong>{activeHistoryItem.nota}</strong>.
              </p>
            </div>

            <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-between', width: '80%', alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: '1rem', width: '250px' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>COORDENAÇÃO PEDAGÓGICA</p>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>Fatesa - Casa do Saber</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ marginBottom: '1rem', fontWeight: 700 }}>Emitido em {activeHistoryItem.data}</p>
                <div style={{ background: '#eee', padding: '10px', fontSize: '0.7rem' }}>
                  Código de Autenticidade: {selectedAlumni.id.substring(0, 8)}-{Math.random().toString(36).substring(7).toUpperCase()}
                </div>
              </div>
            </div>

            <div className="no-print" style={{ position: 'fixed', bottom: '2rem', right: '2rem', display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary" onClick={() => { window.print() }} style={{ width: 'auto', background: '#333' }}>Imprimir / Salvar PDF</button>
              <button className="btn btn-outline" onClick={() => setShowCertificate(false)} style={{ width: 'auto' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICADO DE NÍVEL PREMIUM */}
      {showLevelCertificate && selectedAlumni && (
        <LevelCertificate 
          studentName={selectedAlumni.nome}
          courseName={selectedAlumni.curso}
          levelName={selectedAlumni.nivel_curso === 'Básico' ? 'Teologia Básico' : 'Teologia Médio'}
          date={selectedAlumni.ano_formacao}
          verificationCode={selectedAlumni.codigo_verificacao || selectedAlumni.id}
          onClose={() => setShowLevelCertificate(false)}
        />
      )}

      {/* HISTÓRICO ESCOLAR COMPLETO (A4 / PDF) */}
      {showTranscript && selectedAlumni && (
        <TranscriptDocument
          alumni={selectedAlumni}
          onClose={() => setShowTranscript(false)}
        />
      )}
    </div>
  )
}

export default AlumniManagement
