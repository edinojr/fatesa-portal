import React, { useState } from 'react'
import { Award, Loader2, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Info } from 'lucide-react'
import { UserProfile } from '../../../types/dashboard'
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
  const [reviewSub, setReviewSub] = useState<any>(null);

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
                        
                        // Check if any previous attempt was approved by the teacher
                        const approved = submissions.find(s => s.status === 'corrigida' && s.nota && s.nota >= 7);
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
                        const isWaitingCorrection = lastSub && lastSub.status === 'pendente';

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Previous failing attempts (History) */}
                            {submissions.map((sub, idx) => (
                              <div key={sub.id} style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: sub.status === 'pendente' ? 1 : 0.6 }}>
                                <div style={{ fontSize: '0.8rem' }}>Tentativa {idx + 1} ({sub.aulas?.titulo})</div>
                                <div style={{ fontWeight: 700, color: sub.status === 'pendente' ? 'var(--warning)' : (sub.nota && sub.nota >= 7 ? 'var(--success)' : 'var(--error)'), display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  {sub.status === 'pendente' ? 'Em Correção' : sub.nota?.toFixed(1)}
                                  <button 
                                    className="btn btn-outline" 
                                    style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}
                                    onClick={(e) => { e.stopPropagation(); setReviewSub(sub); }}
                                  >
                                    Ver Correção
                                  </button>
                                </div>
                              </div>
                            ))}

                            {/* Current Actionable Exam - Hide if waiting for correction or already approved */}
                            {isWaitingCorrection ? (
                              <div style={{ padding: '1.5rem', background: 'rgba(234, 179, 8, 0.05)', borderRadius: '16px', border: '1px solid var(--warning)', textAlign: 'center' }}>
                                <Clock size={32} color="var(--warning)" style={{marginBottom:'0.5rem', display:'inline-block'}}/>
                                <h4 style={{margin:0, color:'var(--warning)'}}>Correção em Andamento</h4>
                                <p style={{fontSize:'0.85rem', color:'var(--text-muted)', marginTop:'0.5rem'}}>O professor está avaliando sua última tentativa. Aguarde o feedback para liberar a próxima versão, caso necessário.</p>
                              </div>
                            ) : (
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
                            )}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontWeight: 700, color: f.status === 'pendente' ? 'var(--warning)' : 'var(--success)' }}>
                              {f.status === 'pendente' ? 'Em Correção' : 'Concluída'}
                            </span>
                            <button 
                              className="btn btn-outline" 
                              style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}
                              onClick={() => setReviewSub(f)}
                            >
                              Ver Gabarito
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}

      </div>

      {/* Modal de Revisão de Gabarito */}
      {reviewSub && (
        <div className="modal-overlay" style={{ zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setReviewSub(null)}>
          <div className="modal-content" style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#111', borderRadius: '24px', padding: '2.5rem', border: '1px solid var(--glass-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 800 }}>Correção Detalhada</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                  {reviewSub.aulas?.titulo || 'Atividade'} • {reviewSub.aulas?.tipo === 'prova' ? 
                    <>Nota Final: <strong style={{color: 'var(--primary)'}}>{reviewSub.status === 'pendente' ? 'Aguardando Correção' : (reviewSub.nota?.toFixed(1) || '---')}</strong></> : 
                    <strong style={{color: 'var(--success)'}}>{reviewSub.status === 'pendente' ? 'Em Correção' : 'Status: Concluída'}</strong>
                  }
                </p>
              </div>
              <button 
                className="btn btn-outline" 
                style={{ width: 'auto', padding: '0.6rem 1.2rem', borderRadius: '12px' }} 
                onClick={() => setReviewSub(null)}
              >
                Fechar
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {Array.isArray(reviewSub.aulas?.questionario) ? reviewSub.aulas.questionario.map((q: any, idx: number) => {
                const qKey = q.id || idx;
                const studentAns = reviewSub.respostas?.[qKey];
                const comment = reviewSub.respostas?.[`${qKey}_comentario`];
                
                let isCorrect = q.type === 'multiple_choice' || !q.type ? String(studentAns) === String(q.correct) :
                                q.type === 'true_false' ? studentAns === q.isTrue :
                                q.type === 'matching' ? q.matchingPairs?.every((_: any, mIdx: number) => String(studentAns?.[mIdx]) === String(mIdx)) : true;
                
                const isManualCorrect = reviewSub.respostas?.[`${qKey}_avaliacao`];
                if (isManualCorrect !== undefined) isCorrect = isManualCorrect === true;

                const showOfficialGabarito = reviewSub.status === 'corrigida' || reviewSub.aulas?.tipo === 'atividade';

                return (
                  <div key={qKey} style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: showOfficialGabarito ? `1px solid ${isCorrect ? 'var(--success)' : 'var(--error)'}` : '1px solid var(--glass-border)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.2rem', flex: 1, fontWeight: 700 }}>
                        <span style={{ opacity: 0.3, marginRight: '0.6rem' }}>{idx + 1}.</span> {q.text}
                      </h4>
                      {showOfficialGabarito ? (
                        <div style={{ color: isCorrect ? 'var(--success)' : 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, fontSize: '0.9rem', background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '0.4rem 1rem', borderRadius: '10px', height: 'fit-content' }}>
                          {isCorrect ? <CheckCircle size={20}/> : <XCircle size={20}/>}
                          {isCorrect ? 'CORRETO' : 'INCORRETO'}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                          <Clock size={16}/> Em correção pelo professor
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem', fontWeight: 800, letterSpacing: '1px' }}>Sua Resposta:</div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.2rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '1.05rem' }}>
                        {q.type === 'multiple_choice' ? (
                          <span style={{fontWeight: 600}}>{q.options?.[studentAns] || <span style={{opacity: 0.5}}>Sem resposta</span>}</span>
                        ) : q.type === 'true_false' ? (
                          <span style={{fontWeight: 600}}>{studentAns === true ? 'Verdadeiro' : studentAns === false ? 'Falso' : <span style={{opacity: 0.5}}>Sem resposta</span>}</span>
                        ) : q.type === 'discursive' ? (
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{studentAns || <span style={{opacity: 0.5}}>Sem resposta</span>}</div>
                        ) : q.type === 'matching' ? (
                          <div style={{fontSize: '0.9rem', opacity: 0.8}}>Associações realizadas através do sistema de colunas.</div>
                        ) : studentAns}
                      </div>
                    </div>

                    {showOfficialGabarito && (
                      <div style={{ marginTop: '1rem', padding: '1.2rem', background: isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', borderRadius: '14px', borderLeft: `5px solid ${isCorrect ? 'var(--success)' : 'var(--error)'}` }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isCorrect ? 'var(--success)' : 'var(--error)', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>Gabarito Oficial:</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                           {q.type === 'multiple_choice' ? q.options?.[q.correct] : 
                            q.type === 'true_false' ? (q.isTrue ? 'Verdadeiro' : 'Falso') :
                            q.type === 'discursive' ? (q.expectedAnswer || 'Esta questão exige avaliação qualitativa do professor.') :
                            'Consulte o material de estudo.'}
                        </div>
                      </div>
                    )}

                    {comment && (
                      <div style={{ marginTop: '1.5rem', padding: '1.2rem', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '16px', border: '1px solid var(--primary)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '-10px', left: '20px', background: 'var(--primary)', color: '#fff', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 900, letterSpacing: '1px' }}>FEEDBACK DO PROFESSOR</div>
                        <div style={{ fontStyle: 'italic', color: '#fff', fontSize: '1rem', lineHeight: 1.6, marginTop: '0.3rem' }}>
                          "{comment}"
                        </div>
                      </div>
                    )}
                  </div>
                )
              }) : (
                <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                  <Info size={48} style={{ marginBottom: '1rem' }} />
                  <p>Detalhes do questionário vinculados a uma versão anterior.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradesPanel
