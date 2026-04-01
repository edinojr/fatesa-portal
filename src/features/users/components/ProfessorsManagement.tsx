import React from 'react'
import { User, Mail, GraduationCap, MapPin, Users as UsersIcon } from 'lucide-react'

interface ProfessorsManagementProps {
  professors: any[]
  searchTerm: string
}

const ProfessorsManagement: React.FC<ProfessorsManagementProps> = ({ professors, searchTerm }) => {
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
                  <GraduationCap size={16} /> Núcleos de Atuação
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {professor.professor_nucleo && professor.professor_nucleo.length > 0 ? (
                    professor.professor_nucleo.map((pn: any, idx: number) => (
                      <span key={idx} style={{ 
                        background: 'rgba(var(--primary-rgb), 0.1)', 
                        color: 'var(--primary)', 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        border: '1px solid rgba(var(--primary-rgb), 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}>
                        <MapPin size={12} /> {pn.nucleos?.nome}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Nenhum núcleo vinculado.</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ProfessorsManagement
