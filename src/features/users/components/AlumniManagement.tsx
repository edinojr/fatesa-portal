import React, { useState, useEffect } from 'react'
import { GraduationCap, Search, Plus, Edit, Trash2, Loader2, X, FileText, History as HistoryIcon, Award } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import Logo from '../../../components/common/Logo'
import LevelCertificate from './LevelCertificate'

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
  created_at: string
}

const AlumniManagement = () => {
  const [records, setRecords] = useState<AlumniRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AlumniRecord | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDossie, setShowDossie] = useState(false)
  const [selectedAlumni, setSelectedAlumni] = useState<AlumniRecord | null>(null)
  const [showCertificate, setShowCertificate] = useState(false)
  const [activeHistoryItem, setActiveHistoryItem] = useState<any>(null)
  
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

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('registros_alumni')
        .select('*')
        .order('ano_formacao', { ascending: false })
        .order('nome', { ascending: true })
      
      if (error) throw error
      setRecords(data || [])
    } catch (err) {
      console.error('Error fetching alumni records:', err)
    } finally {
      setLoading(false)
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

  const filteredRecords = records.filter((r: AlumniRecord) => 
    r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.curso?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agrupar registros por Ano e Nível
  const grouped = filteredRecords.reduce((acc: any, r: AlumniRecord) => {
    const year = r.ano_formacao || 'Sem Ano'
    const level = r.nivel_curso || 'Graduação'
    if (!acc[year]) acc[year] = {}
    if (!acc[year][level]) acc[year][level] = []
    acc[year][level].push(r)
    return acc
  }, {} as Record<string, Record<string, AlumniRecord[]>>)

  // Ordenar anos (descendente)
  const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="spinner" /> Carregando base de Formados...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Base de Formados</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gestão de Formados e históricos de conclusão.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '3rem' }} 
              placeholder="Pesquisar por nome ou curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
            title="Clique para selecionar uma planilha Excel ou CSV"
          >
            {actionLoading === 'importing-file' ? (
              <Loader2 className="spinner" />
            ) : (
              <FileText size={18} />
            )}
            <span>Importar Planilha de Identificação</span>
          </button>
          <input 
            id="import-alumni-file-input"
            type="file" 
            accept=".xlsx,.xls,.cvs,.csv" 
            style={{ 
              position: 'absolute',
              width: 0,
              height: 0,
              opacity: 0,
              overflow: 'hidden'
            }} 
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
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditingRecord(null); setFormData({ nome: '', email: '', curso: '', nucleo: '', ano_formacao: '', matricula: '', nivel_curso: 'Básico', observacoes: '', rg: '', telefone: '', cep: '', endereco: '', bairro: '', cidade: '', uf: '' }); setShowModal(true); }}>
            <Plus size={18} /> Adicionar Registro
          </button>
        </div>
      </header>

      {years.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Nenhum registro de formado encontrado.
        </div>
      ) : (
        years.map(year => (
          <div key={year} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'var(--primary)', color: '#fff', padding: '0.4rem 1rem', borderRadius: '8px', fontWeight: 800 }}>{year}</div>
              <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
            </div>

            {Object.keys(grouped[year]).map(level => (
              <div key={level} className="admin-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>
                <div style={{ padding: '1rem 1.5rem', background: 'rgba(var(--primary-rgb), 0.05)', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <GraduationCap size={18} className="text-primary" />
                  <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8rem' }}>{level}</span>
                  <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.7rem' }}>{grouped[year][level].length} Formados</span>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nome / E-mail</th>
                      <th>RG / Contato</th>
                      <th>Matrícula / Código</th>
                      <th>Curso Especialidade</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[year][level].map((record: AlumniRecord) => (
                      <tr key={record.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{record.nome}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{record.email}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{record.rg || 'RG NI'}</div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{record.telefone || 'Sem Tel'}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <code style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.05)', padding: '2px 5px', borderRadius: '4px' }}>M: {record.matricula || '---'}</code>
                            <code style={{ fontSize: '0.7rem', color: 'var(--primary)', opacity: 0.8 }}>V: {record.codigo_verificacao?.substring(0, 8)}...</code>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{record.curso || '---'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{record.nucleo || 'Sem Polo'}</div>
                        </td>
                        <td>
                           <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                            <button className="btn btn-icon" onClick={() => { setSelectedAlumni(record); setShowDossie(true); }} title="Ver Dossiê / Histórico">
                              <FileText size={16} color="var(--primary)" />
                            </button>
                            <button className="btn btn-icon" onClick={() => handleEdit(record)} title="Editar">
                              <Edit size={16} />
                            </button>
                            <button className="btn btn-icon text-error" onClick={() => handleDelete(record.id)} title="Excluir">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))
      )}

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

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: 'auto', gap: '0.75rem', padding: '0.75rem 1.5rem' }}
                  onClick={() => setShowLevelCertificate(true)}
                >
                  <Award size={20} /> EMITIR CERTIFICADO DE NÍVEL ({selectedAlumni.nivel_curso})
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
                    const modulo = prompt('Nome do Módulo/Disciplina:');
                    const nota = prompt('Nota Final:');
                    const data = new Date().toLocaleDateString();
                    if (modulo && nota) {
                      const newHistory = [...(selectedAlumni.historico || []), { modulo, nota, data }];
                      const updatedAlumni = { ...selectedAlumni, historico: newHistory };
                      setSelectedAlumni(updatedAlumni);
                      // Update in DB
                      supabase.from('registros_alumni').update({ historico: newHistory }).eq('id', selectedAlumni.id).then(fetchRecords);
                    }
                  }}
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
                              onClick={() => {
                                const newHistory = selectedAlumni.historico!.filter((_: any, i: number) => i !== idx);
                                setSelectedAlumni({ ...selectedAlumni, historico: newHistory });
                                supabase.from('registros_alumni').update({ historico: newHistory }).eq('id', selectedAlumni.id).then(fetchRecords);
                              }}
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
              <h2 style={{ fontSize: '3rem', fontWeight: 800, margin: '2rem 0', color: '#1a1a1a' }}>{selectedAlumni.nome.toUpperCase()}</h2>
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
    </div>
  )
}

export default AlumniManagement
