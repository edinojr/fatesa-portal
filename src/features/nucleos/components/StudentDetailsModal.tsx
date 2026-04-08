import React from 'react';
import { Award, Trash2, Loader2, Save, Plus } from 'lucide-react';

interface StudentDetailsModalProps {
  student: any;
  onClose: () => void;
  atividades: any[];
  notas: any[];
  courseSubmissions: any[];
  expandedSub: string | null;
  handleExpandSub: (sub: any) => void;
  questionEvaluations: Record<string, boolean>;
  toggleEvaluation: (sub: any, qId: string, correct: boolean) => void;
  handleLancarNota: (e: React.FormEvent<HTMLFormElement>) => void;
  handleDeleteSubmission: (id: string) => void;
  actionLoading: string | null;
  isProfessor: boolean;
  studentCourseLivros: any[];
  studentExceptions: string[];
  handleToggleException: (sId: string, lId: string, current: boolean) => void;
}

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  student,
  onClose,
  atividades,
  notas,
  courseSubmissions,
  expandedSub,
  handleExpandSub,
  questionEvaluations,
  toggleEvaluation,
  handleLancarNota,
  handleDeleteSubmission,
  actionLoading,
  isProfessor,
  studentCourseLivros,
  studentExceptions,
  handleToggleException
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Boletim: {student.nome}</h2>
          <button className="btn-icon" onClick={onClose}><Plus style={{ transform: 'rotate(45deg)' }} /></button>
        </div>

        {/* SEÇÃO DE AUTORIZAÇÃO DE MÓDULOS (EXCEÇÕES) */}
        {isProfessor && studentCourseLivros.length > 0 && (
          <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               Autorização de Acesso (Módulos Anteriores)
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Ative para permitir que este aluno acesse módulos que foram concluídos pelo núcleo antes do seu cadastro.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {studentCourseLivros.map(livro => {
                const isAuthorized = studentExceptions.includes(livro.id);
                return (
                  <div key={livro.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{livro.titulo}</span>
                    <button 
                      className="btn" 
                      style={{ 
                        width: 'auto', 
                        padding: '0.2rem 0.6rem', 
                        fontSize: '0.7rem', 
                        background: isAuthorized ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        border: 'none'
                      }}
                      onClick={() => handleToggleException(student.id, livro.id, isAuthorized)}
                      disabled={actionLoading === `toggle_exception_${livro.id}`}
                    >
                      {actionLoading === `toggle_exception_${livro.id}` ? <Loader2 className="spinner" size={12} /> : isAuthorized ? 'Autorizado' : 'Bloqueado'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Atividades Enviadas (Portal)</h4>
          {courseSubmissions.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>O aluno ainda não enviou atividades dos cursos no portal.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {courseSubmissions.map(sub => (
                <div key={sub.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleExpandSub(sub)}>
                      <strong style={{ fontSize: '0.95rem' }}>{sub.aulas?.titulo}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enviado em: {new Date(sub.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: sub.status === 'pendente' ? 'var(--warning)' : 'var(--success)' }}>
                        {sub.status === 'pendente' ? 'Pendente' : sub.nota?.toFixed(1)}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', width: 'auto', border: 'none', color: 'var(--error)' }}
                          onClick={() => handleDeleteSubmission(sub.id)}
                          disabled={actionLoading === `delete_sub_${sub.id}`}
                        >
                          {actionLoading === `delete_sub_${sub.id}` ? <Loader2 className="spinner" size={14} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {expandedSub === sub.id && (
                    <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <h5 style={{ marginBottom: '1.5rem', fontSize: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={18} /> Respostas do Aluno
                      </h5>
                      {Array.isArray(sub.aulas?.questionario) && sub.aulas.questionario.map((q: any, idx: number) => (
                        <div key={q.id} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', borderLeft: '4px solid rgba(255,255,255,0.1)' }}>
                          <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem' }}>{idx + 1}. {q.text}</p>
                          <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase' }}>Resposta: </span>
                            <span style={{ fontSize: '0.95rem' }}>{q.type === 'discursive' ? sub.respostas[q.id] : 'Questão Objetiva'}</span>
                          </div>
                          {q.type === 'discursive' && isProfessor && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.7rem', background: questionEvaluations[q.id] === true ? 'var(--success)' : 'rgba(255,255,255,0.05)' }} onClick={() => toggleEvaluation(sub, q.id, true)}>Certa</button>
                              <button className="btn" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.7rem', background: questionEvaluations[q.id] === false ? 'var(--error)' : 'rgba(255,255,255,0.05)' }} onClick={() => toggleEvaluation(sub, q.id, false)}>Errada</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
          <h4 style={{ marginBottom: '1rem', color: '#03A9F4' }}>Notas Manuais do Pólo</h4>
          {notas.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sem notas de atividades do pólo lançadas.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {notas.map(n => (
                <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                  <div>
                    <strong>{n.atividades?.titulo}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{n.feedback}</div>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: n.nota >= 7 ? 'var(--success)' : 'var(--error)' }}>
                    {n.nota.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isProfessor ? (
          <>
            <h4 style={{ marginBottom: '1rem' }}>Lançar/Atualizar Nota</h4>
            <form onSubmit={handleLancarNota}>
              <div className="form-group">
                <label>Selecione a Atividade</label>
                <select name="atividade_id" className="form-control" required>
                  <option value="">-- Escolha --</option>
                  <optgroup label="Atividades do Pólo (Manuais)">
                    {atividades.map(a => <option key={a.id} value={a.id}>{a.titulo}</option>)}
                  </optgroup>
                  <optgroup label="Fichário (Painel do Aluno)">
                    {courseSubmissions.map(s => (
                      <option key={s.id} value={`course:${s.aulas?.id}`}>
                        {s.aulas?.titulo} ({new Date(s.created_at).toLocaleDateString()})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Nota (0 a 10)</label>
                  <input type="number" name="nota" max="10" min="0" step="0.1" className="form-control" required />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Feedback Adicional</label>
                  <input type="text" name="feedback" className="form-control" placeholder="Muito bom!" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={onClose}>Fechar</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading === 'lancar_nota' || atividades.length === 0}>
                  <Save size={18} /> Salvar Avaliação
                </button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetailsModal;
