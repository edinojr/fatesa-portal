import React from 'react'
import { Users, Trash2, Loader2, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { Student } from '../../../types/professor'

interface StudentsManagementProps {
  allStudents: Student[]
  searchTerm: string
  setSearchTerm: (val: string) => void
  actionLoading: string | null
  handleApproveAccess: (userId: string) => Promise<void>
  handleRejectAccess: (userId: string) => Promise<void>
  handleDeleteUser: (userId: string) => Promise<void>
  handleResetActivities: (userId: string) => Promise<void>
  handleUpdateUserNucleo: (userId: string, nucleoId: string, nucleoNome: string) => Promise<void>
  userRole?: string | null
  allNucleos?: any[]
}

export default function StudentsManagement({ 
  allStudents, searchTerm, setSearchTerm, actionLoading,
  handleApproveAccess, handleRejectAccess, handleDeleteUser,
  handleResetActivities, handleUpdateUserNucleo, userRole, allNucleos = []
}: StudentsManagementProps) {
  const filteredStudents = allStudents.filter(s => {
    // Excluir professores da gestão de alunos, exceto o Edino Junior
    const isProfessor = s.tipo === 'professor';
    const isEdino = s.nome?.toLowerCase().includes('edino junior');
    if (isProfessor && !isEdino) return false;

    return s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
           s.email.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const groupedStudents = filteredStudents.reduce((acc: any, student: any) => {
    const nucName = student.nucleos?.nome || 'Sem Núcleo Definido';
    if (!acc[nucName]) acc[nucName] = [];
    acc[nucName].push(student);
    return acc;
  }, {})

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <div className="mobile-wrap-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Gestão Unificada de Alunos</h2>
          <p style={{ color: 'var(--text-muted)' }}>Lista consolidada de todos os alunos vinculados aos seus pólos.</p>
        </div>
        <div className="input-group" style={{ width: '100%', maxWidth: '300px', marginBottom: 0 }}>
          <input 
            type="text" 
            placeholder="Pesquisar aluno..." 
            className="form-control" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {Object.entries(groupedStudents)
          .sort(([nA], [nB]) => nA.localeCompare(nB))
          .map(([nucleoName, nucleoStudents]: [string, any]) => (
            <div key={nucleoName}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                marginBottom: '1rem',
                padding: '1rem 1.5rem',
                background: 'rgba(168, 85, 247, 0.1)',
                borderRadius: '12px',
                borderLeft: '4px solid var(--primary)'
              }}>
                <Users size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{nucleoName} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({nucleoStudents.length} alunos)</span></h3>
              </div>

              <div className="admin-table-scrollbar" style={{ width: '100%', overflowX: 'auto', marginBottom: '1rem', paddingBottom: '0.5rem' }}>
                <table className="admin-table" style={{ minWidth: '900px' }}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nucleoStudents
                      .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
                      .map((student: any) => (
                        <tr key={student.id}>
                          <td style={{ fontWeight: 600 }}>{student.nome}</td>
                          <td>{student.email}</td>
                          <td>
                            <span className={`admin-badge status-${student.status_nucleo || 'pendente'}`}>
                              {student.status_nucleo || 'pendente'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              {student.status_nucleo !== 'aprovado' && (
                                <button 
                                  className="btn btn-primary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', width: 'auto' }}
                                  onClick={() => handleApproveAccess(student.id)}
                                  disabled={actionLoading === student.id}
                                  title="Aprovar Aluno"
                                >
                                  {actionLoading === student.id ? <Loader2 className="spinner" size={14} /> : <CheckCircle size={14} />}
                                  <span style={{ marginLeft: '4px' }}>Aprovar</span>
                                </button>
                              )}
                              {student.status_nucleo !== 'recusado' && (
                                <button 
                                  className="btn"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', width: 'auto', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
                                  onClick={() => handleRejectAccess(student.id)}
                                  disabled={actionLoading === student.id}
                                  title="Recusar Acesso"
                                >
                                  <XCircle size={14} />
                                  <span style={{ marginLeft: '4px' }}>Recusar</span>
                                </button>
                              )}
                              {(userRole === 'admin' || userRole === 'suporte') && (
                                <button 
                                  className="btn"
                                  style={{ padding: '0.4rem', fontSize: '0.75rem', width: 'auto', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                                  onClick={() => handleResetActivities(student.id)}
                                  disabled={actionLoading === student.id}
                                  title="Resetar Atividades e Progresso"
                                >
                                  {actionLoading === student.id ? <Loader2 className="spinner" size={16} /> : <RotateCcw size={16} />}
                                </button>
                              )}
                              <button 
                                className="btn"
                                style={{ padding: '0.4rem', fontSize: '0.75rem', width: 'auto', background: 'rgba(255, 77, 77, 0.1)', color: 'var(--error)', border: '1px solid rgba(255, 77, 77, 0.2)' }}
                                onClick={() => handleDeleteUser(student.id)}
                                disabled={actionLoading === student.id}
                                title="Excluir Aluno Permanentemente"
                              >
                                {actionLoading === student.id ? <Loader2 className="spinner" size={16} /> : <Trash2 size={16} />}
                              </button>
                              
                              <select 
                                className="form-control"
                                style={{ width: '130px', fontSize: '0.75rem', padding: '0.2rem', height: 'auto', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
                                value={student.nucleo_id || ''}
                                onChange={(e) => {
                                  const nId = e.target.value;
                                  const nName = allNucleos.find(n => n.id === nId)?.nome || 'Sem Núcleo';
                                  handleUpdateUserNucleo(student.id, nId, nName);
                                }}
                                disabled={actionLoading === student.id}
                              >
                                <option value="" disabled>Trocar Pólo...</option>
                                {allNucleos.map((n: any) => (
                                  <option key={n.id} value={n.id}>{n.nome}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        {allStudents.length === 0 && (
          <div className="data-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
            Nenhum aluno encontrado nos seus núcleos.
          </div>
        )}
      </div>
    </div>
  )
}
