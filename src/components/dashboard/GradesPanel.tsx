import React, { useState } from 'react'
import { Award, Loader2, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Info } from 'lucide-react'
import { UserProfile } from '../../types/dashboard'
import { useNavigate } from 'react-router-dom'

interface GradesPanelProps {
  profile: UserProfile | null
  availableNucleos: any[]
  handleChangeNucleo: (id: string) => void
  atividades: any[]
  courses: any[]
}

const GradesPanel: React.FC<GradesPanelProps> = ({ profile, availableNucleos, handleChangeNucleo, atividades, courses }) => {
  const navigate = useNavigate();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  // Group activities by Module (Livro)
  const modulesMap: Record<string, { title: string, id: string, items: any[] }> = {};
  
  atividades.forEach(a => {
    const libroId = a.aulas?.livro?.id || 'outros';
    const libroTitle = a.aulas?.livro?.titulo || 'Complementares';
    
    if (!modulesMap[libroId]) {
      modulesMap[libroId] = { title: libroTitle, id: libroId, items: [] };
    }
    modulesMap[libroId].items.push(a);
  });

  const modules = Object.values(modulesMap);

  return (
    <div className="data-card">
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.8rem', fontWeight: 800 }}>
          <Award color="var(--primary)" size={32} /> Central de Avaliações
        </h3>
        <p style={{ color: 'var(--text-muted)' }}>Acompanhe suas notas e realize suas provas finais por módulo.</p>
      </div>
      
      {!profile?.nucleo_id && (
        <div style={{ padding: '1.5rem', background: 'rgba(234, 179, 8, 0.05)', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.2)', marginBottom: '2rem' }}>
          <p style={{ color: '#EAB308', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>Polo Educacional não vinculado. Escolha seu núcleo para liberar as avaliações:</p>
          <select className="form-control" onChange={(e) => handleChangeNucleo(e.target.value)}>
            <option value="">Escolha seu núcleo...</option>
            {availableNucleos.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {modules.map((m) => {
          const isExpanded = expandedModule === m.id;
          
          // Logic for Final Exams Versioning (V1, V2, V3)
          const exams = m.items.filter(i => i.aulas?.tipo === 'prova');
          const formative = m.items.filter(i => i.aulas?.tipo === 'atividade');

          // We need to determine which version the student should see.
          // In a real scenario, the lessons list would contain all 3 versions as separate aula entries or one entry with stages.
          // Based on user request: "prova 1, se reprovar prova 2...". 
          // If we have separate versions in 'atividades' (respostas_aulas), we check them.
          
          return (
            <div key={m.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
              <div 
                onClick={() => setExpandedModule(isExpanded ? null : m.id)}
                style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isExpanded ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Award size={20} color="var(--primary)" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{m.title}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.items.length} atividades registradas</span>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {isExpanded && (
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Final Exams Section */}
                  <div>
                    <h5 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={16} /> Provas do Módulo
                    </h5>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {(() => {
                        // Find the book in courses to get ALL possible exams (V1, V2, V3)
                        const libro = (courses || []).flatMap(c => c.livros || []).find(l => l.id === m.id);
                        if (!libro) return <p style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Módulo não encontrado no currículo.</p>;
                        
                        const allExams = (libro.aulas || []).filter((a: any) => a.tipo === 'prova').sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
                        
                        if (allExams.length === 0) return <p style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Nenhuma prova final configurada para este módulo.</p>;

                        // Identify current version to show
                        let currentVersionIndex = 0;
                        const submissions = m.items.filter(i => i.aulas?.tipo === 'prova').sort((a,b) => (a.tentativas || 1) - (b.tentativas || 1));
                        
                        // Check if any previous was approved
                        const approved = submissions.find(s => s.nota >= 7);
                        if (approved) {
                          return (
                            <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '16px', border: '1px solid var(--success)', textAlign: 'center' }}>
                              <CheckCircle size={40} color="var(--success)" style={{marginBottom:'0.5rem'}}/>
                              <h4 style={{margin:0, color:'var(--success)'}}>Módulo Concluído</h4>
                              <p style={{fontSize:'0.85rem', color:'var(--text-muted)', marginTop:'0.5rem'}}>Você foi aprovado com nota **{approved.nota.toFixed(1)}**.</p>
                            </div>
                          );
                        }

                        // Determine version based on failed submissions
                        currentVersionIndex = submissions.length; // 0 submissions -> V1 (index 0), 1 failed -> V2 (index 1), etc.
                        if (currentVersionIndex >= allExams.length) currentVersionIndex = allExams.length - 1;

                        const activeExam = allExams[currentVersionIndex];
                        const lastSub = submissions[submissions.length - 1];

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Previous failing attempts (History) */}
                            {submissions.map((sub, idx) => (
                              <div key={sub.id} style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
                                <div style={{ fontSize: '0.8rem' }}>Tentativa {idx + 1} ({sub.aulas?.titulo})</div>
                                <div style={{ fontWeight: 700, color: 'var(--error)' }}>{sub.nota?.toFixed(1)}</div>
                              </div>
                            ))}

                            {/* Current Actionable Exam */}
                            <div style={{ padding: '1.5rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '16px', border: '1px solid var(--primary)', position: 'relative' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div>
                                  <h4 style={{ margin: 0, color: '#fff' }}>{activeExam.titulo}</h4>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>Disponível para realização imediata.</p>
                                </div>
                                <div style={{ background: 'var(--primary)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700 }}>
                                  V{currentVersionIndex + 1}
                                </div>
                              </div>
                              <button 
                                className="btn btn-primary" 
                                style={{ width: '100%', fontWeight: 700 }}
                                onClick={() => navigate(`/lesson/${activeExam.id}`)}
                              >
                                {submissions.length > 0 ? 'Tentar Novamente' : 'Iniciar Avaliação Final'}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Formative Activities Section */}
                  <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                    <h5 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={16} /> Atividades de Fixação (Histórico)
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {formative.map((f) => (
                        <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '10px' }}>
                          <span style={{ fontSize: '0.85rem' }}>{f.aulas?.titulo || 'Atividade'}</span>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{f.nota?.toFixed(1) || '10.0'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}

        {modules.length === 0 && (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--glass)', borderRadius: '24px' }}>
            <Award size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p style={{ color: 'var(--text-muted)' }}>Você ainda não iniciou nenhuma avaliação.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GradesPanel
