import React from 'react'
import { Users } from 'lucide-react'
import { Student } from '../../types/professor'

interface StudentsManagementProps {
  allStudents: Student[]
  searchTerm: string
  setSearchTerm: (val: string) => void
}

const StudentsManagement: React.FC<StudentsManagementProps> = ({ allStudents, searchTerm, setSearchTerm }) => {
  const filteredStudents = allStudents.filter(s => 
    s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{nucleoName} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>({nucleoStudents.length} alunos)</span></h3>
              </div>

              <div className="data-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nucleoStudents
                      .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
                      .map((student: any) => (
                        <tr key={student.id}>
                          <td style={{ fontWeight: 600 }}>{student.nome}</td>
                          <td>{student.email}</td>
                          <td><span className={`admin-badge status-${student.status_nucleo || 'pendente'}`}>{student.status_nucleo || 'pendente'}</span></td>
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

export default StudentsManagement
