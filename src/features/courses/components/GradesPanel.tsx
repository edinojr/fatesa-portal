import React, { useState } from 'react'
import { Award, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Info } from 'lucide-react'
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
    const libroId = a.book_id || a.aulas?.livros?.id || 'outros';
    const libroTitle = a.book_title || a.aulas?.livros?.titulo || 'Complementares';
    
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
          const formative = m.items.filter(i => (i.lesson_type || i.aulas?.tipo) === 'atividade');

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
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '1rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <CheckCircle size={16} /> Provas do Módulo
                    </h5>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                      {(() => {
                        const libro = (courses || []).flatMap(c => c.livros || []).find(l => l.id === m.id);
                        if (!libro) return <p style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Módulo não encontrado.</p>;
                        
                        const allExams = (libro.aulas || []).filter((a: any) => a.tipo === 'prova' || !!a.is_bloco_final).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
                        if (allExams.length === 0) return <p style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Sem provas configuradas.</p>;

                        const submissions = m.items.filter(i => (i.lesson_type || i.aulas?.tipo) === 'prova' || !!i.is_bloco_final).sort((a,b) => (a.tentativas || 1) - (b.tentativas || 1));
                        const approved = submissions.find(s => s.status === 'corrigida' && s.nota && s.nota >= 7);
                        
                        if (approved) {
                          return (
                            <div style={{ gridColumn: '1 / -1', padding: '2rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '24px', border: '1px solid var(--success)', textAlign: 'center', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.05)' }}>
                              <Award size={48} color="var(--success)" style={{marginBottom:'1rem', display: 'inline-block'}}/>
                              <h4 style={{margin:0, color:'var(--success)', fontSize: '1.5rem', fontWeight: 900}}>Módulo Concluído com Sucesso!</h4>
                              <p style={{fontSize:'1rem', color:'var(--text-muted)', marginTop:'0.5rem', marginBottom: '1.5rem'}}>Sua nota final neste módulo foi <strong>{approved.nota.toFixed(1)}</strong>.</p>
                              <button 
                                className="btn btn-primary" 
                                style={{ width: 'auto', padding: '0.75rem 2rem', borderRadius: '14px' }}
                                onClick={() => setReviewSub(approved)}
                              >
                                Ver Minha Avaliação
                              </button>
                            </div>
                          );
                        }

                        const currentStage = submissions.length + 1;
                        const activeExam = allExams.find((ex: any) => (ex.versao || 1) === currentStage) || allExams[allExams.length - 1];
                        const lastSub = submissions[submissions.length - 1];
                        const isWaitingCorrection = lastSub && lastSub.status === 'pendente';

                        return (
                          <>
                            {submissions.map((sub, idx) => {
                              const subAula = Array.isArray(sub.aulas) ? (sub.aulas as any)[0] : sub.aulas;
                              const isApproved = sub.nota && sub.nota >= 7;
                              return (
                                <div key={sub.id} style={{ 
                                  padding: '1.25rem', 
                                  background: isApproved ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)', 
                                  borderRadius: '18px', 
                                  border: `1px solid ${isApproved ? 'var(--success)' : 'var(--glass-border)'}`,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '1rem',
                                  opacity: sub.status === 'pendente' ? 1 : 0.9
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>Tentativa {idx + 1}</div>
                                    <div style={{ 
                                      padding: '4px 10px', 
                                      borderRadius: '8px', 
                                      fontSize: '0.9rem', 
                                      fontWeight: 900,
                                      background: sub.status === 'pendente' ? 'rgba(234, 179, 8, 0.1)' : (isApproved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                                      color: sub.status === 'pendente' ? '#eab308' : (isApproved ? 'var(--success)' : 'var(--error)')
                                    }}>
                                      {sub.status === 'pendente' ? 'EM CORREÇÃO' : (isApproved ? sub.nota.toFixed(1) : 'NÃO APROVADO')}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{subAula?.titulo}</div>
                                  {isApproved && (
                                    <button 
                                      className="btn btn-outline" 
                                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.75rem', borderRadius: '10px' }}
                                      onClick={(e) => { e.stopPropagation(); setReviewSub(sub); }}
                                    >
                                      Ver Gabarito e Correção
                                    </button>
                                  )}
                                </div>
                              );
                            })}

                            {isWaitingCorrection ? (
                              <div style={{ gridColumn: '1 / -1', padding: '1.5rem', background: 'rgba(234, 179, 8, 0.05)', borderRadius: '20px', border: '1px solid var(--warning)', textAlign: 'center' }}>
                                <Clock size={32} color="var(--warning)" style={{marginBottom:'0.5rem', display:'inline-block'}}/>
                                <h4 style={{margin:0, color:'var(--warning)', fontWeight: 800}}>Aguardando Correção</h4>
                                <p style={{fontSize:'0.85rem', color:'var(--text-muted)', marginTop:'0.5rem'}}>Sua última tentativa está sendo avaliada. Fique atento às notificações!</p>
                              </div>
                            ) : submissions.length >= 3 ? (
                              <div style={{ gridColumn: '1 / -1', padding: '2rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '20px', border: '1px solid var(--error)', textAlign: 'center' }}>
                                <XCircle size={40} color="var(--error)" style={{marginBottom:'1rem', display:'inline-block'}}/>
                                <h4 style={{margin:0, color:'var(--error)', fontSize: '1.3rem', fontWeight: 900}}>Módulo Encerrado</h4>
                                <p style={{fontSize:'0.9rem', color:'var(--text-muted)', marginTop:'0.5rem'}}>Limite de tentativas atingido. Entre em contato com a secretaria pedagógica.</p>
                              </div>
                            ) : (
                              <div style={{ gridColumn: '1 / -1', padding: '1.5rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '20px', border: '2px dashed var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>{activeExam?.titulo}</h4>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>Disponível para realização: <strong>Versão V{currentStage}</strong></p>
                                </div>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ width: 'auto', padding: '0.75rem 2rem', fontWeight: 800, borderRadius: '12px' }}
                                  onClick={() => navigate(`/lesson/${activeExam?.id}`)}
                                >
                                  {submissions.length > 0 ? 'Iniciar Recuperação' : 'Fazer Prova Agora'}
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Formative Activities Section */}
                  <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '1.25rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Clock size={16} /> Exercícios de Fixação ({formative.length})
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {formative.map((f) => (
                        <div key={f.id} style={{ 
                          padding: '1.25rem', 
                          background: 'rgba(59, 130, 246, 0.04)', 
                          borderRadius: '16px', 
                          border: '1px solid rgba(59, 130, 246, 0.1)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>{f.aulas?.titulo || 'Atividade'}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>REALIZADO</span>
                            <button 
                              className="btn btn-outline" 
                              style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.7rem', borderRadius: '8px' }}
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
                  {(reviewSub.lesson_title || reviewSub.aulas?.titulo) || 'Atividade'} • {(reviewSub.lesson_type || reviewSub.aulas?.tipo) === 'prova' || reviewSub.is_bloco_final ? 
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
               {(() => {
                 const aula = Array.isArray(reviewSub.aulas) ? (reviewSub.aulas as any)[0] : reviewSub.aulas;
                 const questionnaire = aula?.questionario;
                 
                 return Array.isArray(questionnaire) ? questionnaire.map((q: any, idx: number) => {
                 const qKey = q.id || idx;
                 const studentAns = reviewSub.respostas?.[qKey];
                 const comment = reviewSub.respostas?.[`${qKey}_comentario`];
                 
                 let isCorrect = q.type === 'multiple_choice' || !q.type ? String(studentAns) === String(q.correct) :
                                 q.type === 'true_false' ? studentAns === q.isTrue :
                                 q.type === 'matching' ? q.matchingPairs?.every((_: any, mIdx: number) => String(studentAns?.[mIdx]) === String(mIdx)) : true;
                 
                 const isManualCorrect = reviewSub.respostas?.[`${qKey}_avaliacao`];
                 if (isManualCorrect !== undefined) isCorrect = isManualCorrect === true;
 
                 const isAtividade = (reviewSub.lesson_type || aula?.tipo) === 'atividade';
                 const isApprovedExam = ((reviewSub.lesson_type || aula?.tipo) === 'prova' || !!reviewSub.is_bloco_final) && reviewSub.nota >= 7;
                 const showOfficialGabarito = isAtividade || isApprovedExam;

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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {q.matchingPairs?.map((pair: any, mIdx: number) => {
                              const stdR = studentAns?.[mIdx];
                              const rTxt = stdR !== undefined && q.matchingPairs[stdR] ? q.matchingPairs[stdR].right : 'Sem resposta';
                              const isMatchCorrect = String(stdR) === String(mIdx);
                              return (
                                <div key={mIdx} style={{ fontSize: '0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 600 }}>{pair.left}</span>
                                  <span style={{ opacity: 0.5 }}>→</span>
                                  <span style={{ color: isMatchCorrect ? 'var(--success)' : 'var(--error)' }}>{rTxt}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : studentAns}
                      </div>
                    </div>

                    {showOfficialGabarito && (
                      <div style={{ marginTop: '1rem', padding: '1.2rem', background: isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', borderRadius: '14px', borderLeft: `5px solid ${isCorrect ? 'var(--success)' : 'var(--error)'}` }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isCorrect ? 'var(--success)' : 'var(--error)', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>Gabarito Oficial:</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                           {q.type === 'multiple_choice' ? (
                               <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                 <span>{q.options?.[q.correct]}</span>
                                 <div style={{fontSize:'0.65rem', background:'var(--success)', color:'#fff', padding:'0.2rem 0.5rem', borderRadius:'4px'}}>GABARITO</div>
                               </div>
                             ) : 
                            q.type === 'true_false' ? (
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span>{q.isTrue ? 'Verdadeiro' : 'Falso'}</span>
                                <div style={{fontSize:'0.65rem', background:'var(--success)', color:'#fff', padding:'0.2rem 0.5rem', borderRadius:'4px'}}>GABARITO</div>
                              </div>
                            ) :
                            q.type === 'discursive' ? (q.expectedAnswer || 'Esta questão exige avaliação qualitativa do professor.') :
                            q.type === 'matching' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {q.matchingPairs?.map((pair: any, mIdx: number) => (
                                  <div key={mIdx} style={{ fontSize: '0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600 }}>{pair.left}</span>
                                    <span style={{ opacity: 0.5 }}>→</span>
                                    <span style={{ color: 'var(--success)' }}>{pair.right}</span>
                                  </div>
                                ))}
                              </div>
                            ) :
                            'Consulte o material de estudo.'}
                        </div>
                        {q.explanation && (
                          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            <strong style={{ color: 'var(--primary)', fontStyle: 'normal', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Explicação do Gabarito:</strong>
                            {q.explanation}
                          </div>
                        )}
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
               );
             })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradesPanel

