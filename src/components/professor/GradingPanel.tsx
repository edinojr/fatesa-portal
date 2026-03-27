import React from 'react'
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react'
import { Submission } from '../../types/professor'

interface GradingPanelProps {
  submissions: Submission[]
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
  toggleEvaluation: (id: string, correct: boolean) => void
  savingGrade: boolean
  handleSaveGrade: () => void
}

const GradingPanel: React.FC<GradingPanelProps> = ({
  submissions,
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
  toggleEvaluation,
  savingGrade,
  handleSaveGrade
}) => {
  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      {!selectedSubmission ? (
        <div className="data-card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><AlertCircle color="var(--primary)" /> Submissões Pendentes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {submissions.filter(s => s.status === 'pendente').map(sub => (
              <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h4 style={{ marginBottom: '0.25rem' }}>{sub.aulas?.titulo || 'Atividade Desconhecida'}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aluno: {sub.users?.nome} ({sub.users?.email})</p>
                  <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.25rem' }}>Data: {new Date(sub.created_at).toLocaleString()}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => handleSelectSubmission(sub)}>Corrigir Teste</button>
                  <button 
                    className="btn btn-outline" 
                    style={{ width: 'auto', border: 'none', color: 'var(--error)', padding: '0.5rem' }}
                    onClick={() => handleDeleteSubmission(sub.id)}
                    disabled={deleting === sub.id}
                  >
                    {deleting === sub.id ? <Loader2 className="spinner" size={20} /> : <Trash2 size={20} />}
                  </button>
                </div>
              </div>
            ))}
            {submissions.filter(s => s.status === 'pendente').length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Você não tem avaliações pendentes de correção no momento.</p>
            )}
          </div>

          <h3 style={{ marginTop: '3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CheckCircle color="var(--success)" /> Últimas Correções</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.7 }}>
            {submissions.filter(s => s.status === 'corrigida').slice(0, 10).map(sub => (
              <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '1rem' }}>{sub.aulas?.titulo}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Aluno: {sub.users?.nome} 
                    <span style={{ marginLeft: '1rem', color: sub.tentativas > 1 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        • {sub.tentativas || 1}ª tentativa
                    </span>
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
              const studentAnswer = selectedSubmission.respostas?.[q.id];
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
                          const selectedRight = selectedRightIdx !== undefined && selectedRightIdx !== '' ? q.matchingPairs[parseInt(selectedRightIdx)].right : '---';
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
                <div key={q.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '20px' }}>
                  <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
                    <span style={{ opacity: 0.3, marginRight: '0.5rem' }}>{idx + 1}.</span> {q.text}
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {q.type === 'discursive' && q.expectedAnswer && (
                      <div style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderLeft: '4px solid var(--primary)', borderRadius: '12px', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '1px' }}>Gabarito Sugerido / Palavras-chave:</div>
                        <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>{q.expectedAnswer}</p>
                      </div>
                    )}

                    <div style={{ padding: '1.25rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>Resposta do Aluno:</div>
                      <div style={{ fontSize: '1.05rem', color: '#fff' }}>{displayAnswer}</div>
                      {q.type === 'discursive' && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                          <button 
                            className="btn" 
                            style={{ 
                              width: 'auto', 
                              padding: '0.4rem 1rem', 
                              fontSize: '0.75rem', 
                              background: questionEvaluations[q.id] === true ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                              color: '#fff',
                              border: 'none',
                              opacity: questionEvaluations[q.id] === true ? 1 : 0.6
                            }}
                            onClick={() => toggleEvaluation(q.id, true)}
                          >
                            {questionEvaluations[q.id] === true ? '✓ Correta' : 'Certa'}
                          </button>
                          <button 
                            className="btn" 
                            style={{ 
                              width: 'auto', 
                              padding: '0.4rem 1rem', 
                              fontSize: '0.75rem', 
                              background: questionEvaluations[q.id] === false ? 'var(--error)' : 'rgba(255,255,255,0.05)',
                              color: '#fff',
                              border: 'none',
                              opacity: questionEvaluations[q.id] === false ? 1 : 0.6
                            }}
                            onClick={() => toggleEvaluation(q.id, false)}
                          >
                            {questionEvaluations[q.id] === false ? '✗ Incorreta' : 'Errada'}
                          </button>
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
    </div>
  )
}

export default GradingPanel
