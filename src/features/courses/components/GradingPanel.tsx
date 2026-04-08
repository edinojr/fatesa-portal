import React from 'react'
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Loader2, Trash2, MapPin, Users } from 'lucide-react'
import { Submission } from '../../../types/professor'

interface GradingPanelProps {
  courses?: any[]
  submissions: Submission[]
  professorNucleos?: { id: string; nome: string }[]
  selectedSubmission: Submission | null
  setSelectedSubmission: (sub: Submission | null) => void
  handleSelectSubmission: (sub: Submission) => void
  deleting: string | null
  handleDeleteSubmission: (id: string) => void
  gradeInput: string
  setGradeInput: (val: string) => void
  avaliacaoComentario: string
  setAvaliacaoComentario: (val: string) => void
  questionEvaluations: Record<string, boolean>
  questionComments: Record<string, string>
  setQuestionComments: React.Dispatch<React.SetStateAction<Record<string, string>>>
  toggleEvaluation: (id: string, correct: boolean) => void
  savingGrade: boolean
  handleSaveGrade: () => void
}

const GradingPanel: React.FC<GradingPanelProps> = ({
  courses = [],
  submissions,
  professorNucleos = [],
  selectedSubmission,
  setSelectedSubmission,
  handleSelectSubmission,
  deleting,
  handleDeleteSubmission,
  gradeInput,
  setGradeInput,
  avaliacaoComentario,
  setAvaliacaoComentario,
  questionEvaluations,
  questionComments,
  setQuestionComments,
  toggleEvaluation,
  savingGrade,
  handleSaveGrade
}) => {
  const [showGabaritosModal, setShowGabaritosModal] = React.useState(false);
  const [selectedNucleoFilter, setSelectedNucleoFilter] = React.useState<string>('todos');

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      {!selectedSubmission ? (
        <div className="data-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><AlertCircle color="var(--primary)" /> Correção de Provas</h3>
            <button 
              className="btn btn-outline" 
              style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              onClick={() => setShowGabaritosModal(true)}
            >
              📖 Ver Gabaritos
            </button>
          </div>

          {/* NUCLEUS FILTER CHIPS — shown only when professor has multiple nucleos */}
          {professorNucleos.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
              <div style={{ width: '100%', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={13} /> Filtrar por Núcleo
              </div>
              <button
                onClick={() => setSelectedNucleoFilter('todos')}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '50px',
                  border: `1px solid ${selectedNucleoFilter === 'todos' ? 'var(--primary)' : 'var(--glass-border)'}`,
                  background: selectedNucleoFilter === 'todos' ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
                  color: selectedNucleoFilter === 'todos' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: selectedNucleoFilter === 'todos' ? 800 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Todos os Núcleos
              </button>
              {professorNucleos.map(n => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNucleoFilter(n.nome)}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: '50px',
                    border: `1px solid ${selectedNucleoFilter === n.nome ? 'var(--primary)' : 'var(--glass-border)'}`,
                    background: selectedNucleoFilter === n.nome ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
                    color: selectedNucleoFilter === n.nome ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: selectedNucleoFilter === n.nome ? 800 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {n.nome}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {(() => {
              // Filtrar apenas provas finais pendentes
              const allFinalExams = submissions.filter(s => 
                s.status === 'pendente' && 
                ((s as any).aulas?.tipo === 'prova' || (s as any).aulas?.is_bloco_final)
              );

              // Aplicar filtro de núcleo
              const finalExams = selectedNucleoFilter === 'todos'
                ? allFinalExams
                : allFinalExams.filter(s => (s.users as any)?.nucleos?.nome === selectedNucleoFilter);

              if (allFinalExams.length === 0) {
                return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Você não tem provas finais pendentes de correção no momento.</p>;
              }

              if (finalExams.length === 0) {
                return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhuma prova pendente para o núcleo <strong>{selectedNucleoFilter}</strong> no momento.</p>;
              }

              // Agrupar por Núcleo
              const grouped = finalExams.reduce((acc, sub) => {
                const nucName = (sub.users as any)?.nucleos?.nome || 'Sem Polo';
                if (!acc[nucName]) acc[nucName] = [];
                acc[nucName].push(sub);
                return acc;
              }, {} as Record<string, typeof finalExams>);

              // Função para gerar uma cor baseada no nome
              const getNucleoColor = (name: string) => {
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                  hash = name.charCodeAt(i) + ((hash << 5) - hash);
                }
                return colors[Math.abs(hash) % colors.length];
              };

              return Object.keys(grouped).sort().map(nuc => {
                const color = getNucleoColor(nuc);
                return (
                  <div key={nuc} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      padding: '0.75rem 1.25rem', 
                      background: `${color}15`, 
                      borderRadius: '12px', 
                      borderLeft: `4px solid ${color}`,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        background: color, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#fff'
                      }}>
                        <MapPin size={18} />
                      </div>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color }}>{nuc}</span>
                        <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '-2px' }}>{grouped[nuc].length} correções pendentes</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                      {grouped[nuc].map(sub => (
                        <div key={sub.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '1.25rem', 
                          background: 'rgba(255,255,255,0.02)', 
                          borderRadius: '16px', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          transition: 'transform 0.2s',
                          cursor: 'default'
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <div style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>MÓDULO</div>
                              <h4 style={{ margin: 0, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.aulas?.titulo || 'Prova Final'}</h4>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                              <Users size={14} color="var(--primary)" />
                              <strong style={{ color: 'var(--text)' }}>{sub.users?.nome}</strong>
                            </div>
                            <p style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <AlertCircle size={10} /> Submetido em: {new Date(sub.created_at).toLocaleString()}
                              {sub.status === 'pendente' && sub.nota > 0 && (
                                <span style={{ marginLeft: '1rem', color: 'var(--warning)', fontWeight: 800 }}>⚠️ RETORNADA PARA REVISÃO</span>
                              )}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                            <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => handleSelectSubmission(sub)}>Corrigir</button>
                            <button 
                              className="btn btn-icon" 
                              style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--error)', width: '38px', height: '38px' }}
                              onClick={() => handleDeleteSubmission(sub.id)}
                              disabled={deleting === sub.id}
                              title="Excluir submissão"
                            >
                              {deleting === sub.id ? <Loader2 className="spinner" size={16} /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <h3 style={{ marginTop: '3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CheckCircle color="var(--success)" /> Últimas Correções</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.7 }}>
            {submissions.filter(s => 
              s.status === 'corrigida' &&
              (selectedNucleoFilter === 'todos' || (s.users as any)?.nucleos?.nome === selectedNucleoFilter)
            ).slice(0, 10).map(sub => (
              <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '1rem' }}>{sub.aulas?.titulo}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Aluno: {sub.users?.nome} 
                    <span style={{ marginLeft: '1rem', color: sub.tentativas > 1 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        • {sub.tentativas || 1}ª tentativa
                    </span>
                    {!sub.comentario_professor && (
                      <span style={{ display: 'block', color: 'var(--error)', fontSize: '0.7rem', fontWeight: 800, marginTop: '4px' }}>
                        ⚠️ AUTO-CORRIGIDA PELO SISTEMA
                      </span>
                    )}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1.2rem', textAlign: 'right' }}>{sub.nota?.toFixed(1)} / 10</div>
                  <button 
                    className="btn btn-outline" 
                    style={{ width: 'auto', border: 'none', color: 'var(--error)', padding: '0.5rem' }}
                    onClick={() => handleDeleteSubmission(sub.id)}
                    disabled={deleting === sub.id}
                  >
                    {deleting === sub.id ? <Loader2 className="spinner" size={16} /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            ))}
            {submissions.filter(s => s.status === 'corrigida').length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Nenhuma correção recente.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="data-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button className="btn btn-outline" style={{ width: 'auto', marginBottom: '2rem', padding: '0.5rem 1rem' }} onClick={() => setSelectedSubmission(null)}>
            <ChevronLeft size={16} /> Voltar para Fila
          </button>

          <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{selectedSubmission.aulas?.titulo}</h2>
                <p style={{ color: 'var(--text-muted)' }}>Aluno: <strong style={{ color: '#fff' }}>{selectedSubmission.users?.nome}</strong></p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>E-mail: {selectedSubmission.users?.email}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="admin-badge status-pendente" style={{ background: selectedSubmission.tentativas > 1 ? 'var(--warning-dark)' : 'rgba(var(--primary-rgb), 0.1)' }}>
                  {selectedSubmission.tentativas || 1}ª Tentativa
                </div>
                {selectedSubmission.primeira_correcao_at && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Início da Recuperação: {new Date(selectedSubmission.primeira_correcao_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem' }}>
            {Array.isArray(selectedSubmission.aulas?.questionario) && selectedSubmission.aulas.questionario.map((q: any, idx: number) => {
              const studentAnswer = selectedSubmission.respostas?.[q.id || idx];
              let displayAnswer: React.ReactNode = <em style={{ color: 'var(--text-muted)' }}>Sem resposta</em>;

              if (studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '') {
                if (q.type === 'multiple_choice' || !q.type) {
                  displayAnswer = <span><strong>Opção {parseInt(studentAnswer) + 1} selecionada:</strong> {q.options?.[studentAnswer]}</span>;
                } else if (q.type === 'true_false') {
                  displayAnswer = <span>Marcou como: <strong style={{ color: studentAnswer ? 'var(--success)' : 'var(--error)' }}>{studentAnswer ? 'Verdadeiro' : 'Falso'}</strong></span>;
                } else if (q.type === 'matching') {
                  const answerMap = studentAnswer as Record<string, string>;
                  displayAnswer = (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Associações Efetuadas:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) auto minmax(120px, 1fr)', gap: '1rem', alignItems: 'center' }}>
                        {q.matchingPairs?.map((pair: any, pIdx: number) => {
                          const selectedRightIdx = answerMap[pIdx];
                          const idxNum = parseInt(selectedRightIdx);
                          const selectedRight = (!isNaN(idxNum) && q.matchingPairs?.[idxNum]) 
                            ? q.matchingPairs[idxNum].right 
                            : (selectedRightIdx && typeof selectedRightIdx === 'string' && selectedRightIdx !== '' ? selectedRightIdx : '---');
                          return (
                            <React.Fragment key={pIdx}>
                              <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.9rem', textAlign: 'right', fontWeight: 600, border: '1px solid rgba(255,255,255,0.05)' }}>
                                {pair.left}
                              </div>
                              <div style={{ color: 'var(--primary)', opacity: 0.8 }}><ChevronRight size={18} /></div>
                              <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', fontSize: '0.9rem', color: '#fff', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: 600 }}>
                                {selectedRight}
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  );
                } else if (q.type === 'discursive') {
                  displayAnswer = <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{studentAnswer}</div>;
                }
              }

              return (
                <div key={q.id || idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '20px' }}>
                  <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
                    <span style={{ opacity: 0.3, marginRight: '0.5rem' }}>{idx + 1}.</span> {q.text}
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Exibição do Gabarito para o Professor */}
                    <div style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderLeft: '4px solid var(--primary)', borderRadius: '12px', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Gabarito Correto
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.9)', lineHeight: '1.5' }}>
                        {q.type === 'multiple_choice' || !q.type ? (
                          q.options?.[q.correct] ? (
                            <span><strong style={{color: 'var(--primary)'}}>Opção {parseInt(q.correct) + 1}:</strong> {q.options[q.correct]}</span>
                          ) : <span style={{ opacity: 0.5 }}>Gabarito não definido</span>
                        ) : q.type === 'true_false' ? (
                          q.isTrue !== undefined ? (
                            <strong style={{color: q.isTrue ? 'var(--success)' : 'var(--error)'}}>{q.isTrue ? 'Verdadeiro' : 'Falso'}</strong>
                          ) : <span style={{ opacity: 0.5 }}>Gabarito não definido</span>
                        ) : q.type === 'matching' ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) auto minmax(120px, 1fr)', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                            {q.matchingPairs?.map((pair: any, pIdx: number) => (
                              <React.Fragment key={pIdx}>
                                <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.8rem', textAlign: 'right' }}>{pair.left}</div>
                                <div style={{ color: 'var(--primary)', opacity: 0.5 }}><ChevronRight size={14} /></div>
                                <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', fontSize: '0.8rem', color: '#fff' }}>{pair.right}</div>
                              </React.Fragment>
                            ))}
                          </div>
                        ) : q.type === 'discursive' ? (
                          q.expectedAnswer ? (
                            <p style={{ margin: 0 }}>{q.expectedAnswer}</p>
                          ) : <span style={{ opacity: 0.5 }}>Palavras-chave não definidas para esta questão. Avaliação manual necessária.</span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ padding: '1.25rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>Resposta do Aluno:</div>
                      <div style={{ fontSize: '1.05rem', color: '#fff' }}>{displayAnswer}</div>
                      
                      {/* Seção de Correção Manual e Justificativa */}
                      {((q.type === 'discursive') || (selectedSubmission?.aulas?.tipo === 'prova' || selectedSubmission?.aulas?.is_bloco_final)) && (
                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button 
                              className="btn" 
                              style={{ 
                                width: 'auto', 
                                padding: '0.4rem 1rem', 
                                fontSize: '0.75rem', 
                                background: questionEvaluations[q.id || idx] === true ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                                color: '#fff',
                                border: 'none',
                                opacity: questionEvaluations[q.id || idx] === true ? 1 : 0.6
                              }}
                              onClick={() => toggleEvaluation(q.id || idx, true)}
                            >
                              {questionEvaluations[q.id || idx] === true ? '✓ Correta' : 'Certa'}
                            </button>
                            <button 
                              className="btn" 
                              style={{ 
                                width: 'auto', 
                                padding: '0.4rem 1rem', 
                                fontSize: '0.75rem', 
                                background: questionEvaluations[q.id || idx] === false ? 'var(--error)' : 'rgba(255,255,255,0.05)',
                                color: '#fff',
                                border: 'none',
                                opacity: questionEvaluations[q.id || idx] === false ? 1 : 0.6
                              }}
                              onClick={() => toggleEvaluation(q.id || idx, false)}
                            >
                              {questionEvaluations[q.id || idx] === false ? '✗ Incorreta' : 'Errada'}
                            </button>
                          </div>

                          <div style={{ marginTop: '1rem' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block', fontWeight: 700 }}>Justificativa / Comentário (Opcional)</label>
                            <textarea 
                              className="form-control" 
                              rows={2} 
                              value={questionComments[q.id || idx] || ''} 
                              onChange={(e) => setQuestionComments(p => ({ ...p, [q.id || idx]: e.target.value }))}
                              placeholder="Justificativa para esta correção..."
                              style={{ background: 'rgba(255,255,255,0.03)', fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--success)', padding: '2rem', borderRadius: '16px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Resultado Final (0 a 10)</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <input 
                type="number" 
                min="0" 
                max="10" 
                step="0.1" 
                className="form-control" 
                style={{ fontSize: '2rem', width: '120px', textAlign: 'center', padding: '1rem', background: '#000' }} 
                value={gradeInput}
                onChange={e => setGradeInput(e.target.value)}
                placeholder="Ex: 8.5"
              />
            </div>
            
            <div style={{ marginTop: '2rem', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                Avaliação / Feedback (Obrigatório)
              </label>
              <textarea 
                className="form-control" 
                rows={4} 
                style={{ background: '#000', borderRadius: '12px', border: '1px solid var(--success)', resize: 'vertical' }}
                value={avaliacaoComentario}
                onChange={e => setAvaliacaoComentario(e.target.value)}
                placeholder="Escreva sua avaliação detalhada sobre a prova do aluno..."
                required
              ></textarea>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: 'auto', padding: '1rem 3rem' }} 
                disabled={savingGrade || gradeInput === '' || !avaliacaoComentario.trim()} 
                onClick={handleSaveGrade}
              >
                {savingGrade ? <Loader2 className="spinner" /> : 'Salvar Nota e Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BANCO DE GABARITOS */}
      {showGabaritosModal && (
        <div className="modal-overlay" onClick={() => setShowGabaritosModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📖 Banco de Gabaritos</h2>
              <button className="btn-icon" onClick={() => setShowGabaritosModal(false)}>
                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>&times;</span>
              </button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Consulte as respostas esperadas para as atividades e provas deste portal. Selecione um módulo abaixo:
            </p>

            {courses.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhum conteúdo carregado.</p>}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {courses.map(c => (
                <div key={c.id}>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                    {c.nome}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {c.livros?.map((l: any) => {
                      const avaliacoes = (l.aulas || []).filter((a: any) => (a.tipo === 'atividade' || a.tipo === 'prova') && a.questionario?.length > 0);
                      if (avaliacoes.length === 0) return null;
                      
                      return (
                        <div key={l.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <h4 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Módulo: {l.titulo}</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {avaliacoes.map((av: any) => (
                              <details key={av.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <CheckCircle size={16} color="var(--success)" /> {av.titulo} ({av.tipo === 'prova' ? 'Prova' : 'Atividade'})
                                </summary>
                                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                  {av.questionario.map((q: any, idx: number) => (
                                    <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>
                                        <span style={{ opacity: 0.5, marginRight: '0.5rem' }}>{idx + 1}.</span> {q.text}
                                      </div>
                                      
                                      <div style={{ padding: '0.75rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '6px', fontSize: '0.85rem' }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                                          Gabarito:
                                        </div>
                                        {q.type === 'multiple_choice' || !q.type ? (
                                          q.options?.[q.correct] ? (
                                            <span><strong style={{color: 'var(--primary)'}}>Opção {parseInt(q.correct) + 1}:</strong> {q.options[q.correct]}</span>
                                          ) : <span style={{ opacity: 0.5 }}>Não definido</span>
                                        ) : q.type === 'true_false' ? (
                                          q.isTrue !== undefined ? (
                                            <strong style={{color: q.isTrue ? 'var(--success)' : 'var(--error)'}}>{q.isTrue ? 'Verdadeiro' : 'Falso'}</strong>
                                          ) : <span style={{ opacity: 0.5 }}>Não definido</span>
                                        ) : q.type === 'matching' ? (
                                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) auto minmax(100px, 1fr)', gap: '0.5rem', alignItems: 'center' }}>
                                            {q.matchingPairs?.map((pair: any, pIdx: number) => (
                                              <React.Fragment key={pIdx}>
                                                <div style={{ textAlign: 'right', fontWeight: 600 }}>{pair.left}</div>
                                                <div style={{ color: 'var(--primary)', opacity: 0.5 }}>&rarr;</div>
                                                <div style={{ color: 'var(--success)' }}>{pair.right}</div>
                                              </React.Fragment>
                                            ))}
                                          </div>
                                        ) : q.type === 'discursive' ? (
                                          <p style={{ margin: 0 }}>{q.expectedAnswer || <span style={{ opacity: 0.5 }}>Sem gabarito sugerido. Avaliação manual.</span>}</p>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem 1.5rem' }} onClick={() => setShowGabaritosModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GradingPanel
