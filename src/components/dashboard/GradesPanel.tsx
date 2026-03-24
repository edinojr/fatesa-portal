import React from 'react'
import { Award, Loader2 } from 'lucide-react'
import { UserProfile } from '../../types/dashboard'

interface GradesPanelProps {
  profile: UserProfile | null
  availableNucleos: any[]
  handleChangeNucleo: (id: string) => void
  atividades: any[]
}

const GradesPanel: React.FC<GradesPanelProps> = ({ profile, availableNucleos, handleChangeNucleo, atividades }) => {
  return (
    <div className="data-card">
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Award color="var(--primary)" /> Notas e Atividades</h3>
      
      {!profile?.nucleo_id && (
        <div style={{ padding: '1.5rem', background: 'rgba(234, 179, 8, 0.05)', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.2)', marginBottom: '2rem' }}>
          <p style={{ color: '#EAB308', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>Você ainda não vinculou seu acesso a um Polo Educacional (Núcleo). Por favor, escolha um abaixo:</p>
          <select className="form-control" onChange={(e) => handleChangeNucleo(e.target.value)}>
            <option value="">Escolha seu núcleo...</option>
            {availableNucleos.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
          </select>
        </div>
      )}

      {profile?.nucleo_id && (
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Seu Polo Vinculado: <strong style={{ color: '#fff' }}>{profile.nucleos?.nome}</strong></p>
      )}

      <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>Metodologia de Avaliação</h4>
        <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li><strong>Atividades:</strong> Caráter formativo. Cálculo: <code style={{ color: 'var(--primary)' }}>(Acertos / Total) × 10</code>. Nota mínima para conclusão: 0.0.</li>
          <li><strong>Provas Finais:</strong> Caráter somativo. Cálculo: <code style={{ color: 'var(--primary)' }}>(Acertos / Total) × 10</code>. Nota mínima para aprovação: 7.0.</li>
          <li><strong>Tentativas:</strong> Você possui até 3 tentativas para realizar as provas finais.</li>
        </ul>
      </div>
          
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {atividades.map((a: any) => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{a.aulas?.titulo || 'Atividade Excluída'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {a.aulas?.tipo === 'prova' ? 'Prova' : 'Atividade'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {a.status === 'pendente' ? (
                <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={16} className="spinner" /> Em Correção
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: a.nota >= 7 ? 'var(--success)' : a.nota !== null ? 'var(--error)' : '#fff' }}>
                    {a.nota !== null ? a.nota.toFixed(1) : 'Concluída'}
                  </div>
                  {a.aulas?.tipo === 'prova' && a.nota !== null && a.nota < 7 && a.tentativas < 3 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '0.25rem' }}>
                      {3 - a.tentativas} tentativas restantes
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {atividades.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Você ainda não concluiu nenhuma atividade ou prova.</p>
        )}
      </div>
    </div>
  )
}

export default GradesPanel
