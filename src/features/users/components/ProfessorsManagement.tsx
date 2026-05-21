import React from 'react'
import { User, Mail, GraduationCap, MapPin, Users as UsersIcon, Trash2 } from 'lucide-react'

interface ProfessorsManagementProps {
  professors: any[]
  allNucleos: any[]
  searchTerm: string
  actionLoading: string | null
  handleUpdateProfessorNucleo: (professorId: string, nucleoId: string) => Promise<void>
}

const ProfessorsManagement: React.FC<ProfessorsManagementProps> = ({ professors, allNucleos, searchTerm, actionLoading, handleUpdateProfessorNucleo }) => {
  const filteredProfessors = professors.filter(p => 
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="professors-management">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        {filteredProfessors.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <UsersIcon size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>Nenhum professor encontrado com o termo "{searchTerm}".</p>
          </div>
        ) : (
          filteredProfessors.map(professor => (
            <div key={professor.id} className="data-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <User size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{professor.nome}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <Mail size={14} /> {professor.email}
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <GraduationCap size={16} /> Núcleo de Atuação
                </div>
                <select
                  className="form-control"
                  style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
                  value={professor.nucleo_id || ''}
                  onChange={(e) => {
                    const nucleoId = e.target.value;
                    if (window.confirm(`Deseja vincular este professor ao núcleo "${allNucleos.find(n => n.id === nucleoId)?.nome || 'Sem Núcleo'}"?`)) {
                      handleUpdateProfessorNucleo(professor.id, nucleoId);
                    }
                  }}
                  disabled={actionLoading === professor.id}
                >
                  <option value="">Sem Núcleo</option>
                  {allNucleos.map((n: any) => (
                    <option key={n.id} value={n.id}>{n.nome}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  className="btn"
                  style={{ 
                    width: 'auto', 
                    background: 'rgba(255, 77, 77, 0.1)', 
                    color: 'var(--error)', 
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  title="Excluir Professor"
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ProfessorsManagement
