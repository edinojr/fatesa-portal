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

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    curso: '',
    nucleo: '',
    ano_formacao: '',
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
        .order('nome', { ascending: true }) // Alphabetical order as requested
      
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
      setFormData({ nome: '', email: '', curso: '', nucleo: '', ano_formacao: '', observacoes: '' })
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
      observacoes: record.observacoes || ''
    })
    setShowModal(true)
  }

  const filteredRecords = records.filter(r => 
    r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.curso?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="spinner" /> Carregando base de ex-alunos...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input 
            type="text" 
            className="form-control" 
            style={{ paddingLeft: '3rem' }} 
            placeholder="Pesquisar por nome, e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditingRecord(null); setShowModal(true); }}>
          <Plus size={18} /> Adicionar Ex-Aluno
        </button>
      </header>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome / E-mail</th>
              <th>Curso</th>
              <th>Polo</th>
              <th>Ano Formação</th>
              <th style={{ textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Nenhum registro encontrado na base de formados.
                </td>
              </tr>
            ) : (
              filteredRecords.map(record => (
                <tr key={record.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{record.nome}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{record.email}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <BookOpen size={14} className="text-primary" />
                      {record.curso || 'Não inf.'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={14} color="var(--text-muted)" />
                      {record.nucleo || 'Não inf.'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={14} color="#EAB308" />
                      {record.ano_formacao || '---'}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>{editingRecord ? 'Editar Registro' : 'Novo Registro de Ex-Aluno'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Curso Concluído</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.curso}
                    onChange={(e) => setFormData({...formData, curso: e.target.value})}
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
                  />
                </div>
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
                <label>Observações</label>
                <textarea 
                  className="form-control" 
                  rows={3}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="spinner" /> : 'Salvar Registro'}
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
