import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Download,
  Calendar,
  BookOpen,
  MapPin,
  X
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'

interface AlumniRecord {
  id: string
  nome: string
  email: string
  curso: string
  nucleo: string
  ano_formacao: string
  nivel_curso: string
  observacoes: string
  created_at: string
}

const AlumniManagement = () => {
  const [records, setRecords] = useState<AlumniRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AlumniRecord | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Níveis de curso pré-definidos
  const niveis = ['Graduação', 'Pós-Graduação', 'Mestrado', 'Doutorado', 'Extensão', 'Curso Livre']

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    curso: '',
    nucleo: '',
    ano_formacao: '',
    nivel_curso: 'Graduação',
    observacoes: ''
  })

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
    setActionLoading(true)

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
      setFormData({ nome: '', email: '', curso: '', nucleo: '', ano_formacao: '', nivel_curso: 'Graduação', observacoes: '' })
      fetchRecords()
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro de ex-aluno?')) return
    
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
      nivel_curso: record.nivel_curso || 'Graduação',
      observacoes: record.observacoes || ''
    })
    setShowModal(true)
  }

  const filteredRecords = records.filter(r => 
    r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.curso?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agrupar registros por Ano e Nível
  const grouped = filteredRecords.reduce((acc, r) => {
    const year = r.ano_formacao || 'Sem Ano'
    const level = r.nivel_curso || 'Graduação'
    if (!acc[year]) acc[year] = {}
    if (!acc[year][level]) acc[year][level] = []
    acc[year][level].push(r)
    return acc
  }, {} as Record<string, Record<string, AlumniRecord[]>>)

  // Ordenar anos (descendente)
  const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="spinner" /> Carregando base de ex-alunos...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Base de Formados</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gestão de ex-alunos e históricos de conclusão.</p>
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
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditingRecord(null); setFormData({ nome: '', email: '', curso: '', nucleo: '', ano_formacao: '', nivel_curso: 'Graduação', observacoes: '' }); setShowModal(true); }}>
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
                      <th>Curso Especialidade</th>
                      <th>Polo / Núcleo</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[year][level].map(record => (
                      <tr key={record.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{record.nome}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{record.email}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <BookOpen size={14} className="text-primary" />
                            {record.curso || '---'}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MapPin size={14} color="var(--text-muted)" />
                            {record.nucleo || '---'}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
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
                  <label>Polo / Núcleo</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.nucleo}
                    onChange={(e) => setFormData({...formData, nucleo: e.target.value})}
                  />
                </div>
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
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="spinner" /> : (editingRecord ? 'Salvar Alterações' : 'Cadastrar Formado')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AlumniManagement
