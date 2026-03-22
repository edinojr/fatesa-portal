import React from 'react'
import { Award, Trash2, X, Plus, CheckCircle2, XCircle, ChevronRight, Loader2 } from 'lucide-react'
import { QuizQuestion, QuestionType } from '../../../types/admin'

interface QuizEditorModalProps {
  editingQuiz: any
  setEditingQuiz: (val: any) => void
  quizQuestions: QuizQuestion[]
  setQuizQuestions: (questions: QuizQuestion[]) => void
  actionLoading: string | null
  setActionLoading: (val: string | null) => void
  supabase: any
  showToast: (msg: string, type?: 'success' | 'error') => void
  fetchLessons: (bookId: string) => Promise<void>
  selectedBook: any
}

const QuizEditorModal: React.FC<QuizEditorModalProps> = ({
  editingQuiz,
  setEditingQuiz,
  quizQuestions,
  setQuizQuestions,
  actionLoading,
  setActionLoading,
  supabase,
  showToast,
  fetchLessons,
  selectedBook
}) => {
  if (!editingQuiz) return null;

  return (
    <div className="modal-overlay" onClick={() => setEditingQuiz(null)}>
      <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Award color="var(--primary)" /> Atividades: {editingQuiz.titulo}
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {quizQuestions.map((q, qIdx) => (
            <div key={q.id || qIdx} style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--primary)', display: 'block' }}>Questão {qIdx + 1}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {q.type === 'multiple_choice' ? 'Múltipla Escolha' : q.type === 'true_false' ? 'Verdadeiro ou Falso' : q.type === 'matching' ? 'Associação de Colunas (Ancoragem)' : q.type === 'discursive' ? 'Dissertativa' : 'Múltipla Escolha (Legado)'}
                  </span>
                </div>
                <button onClick={() => setQuizQuestions(quizQuestions.filter((_, i) => i !== qIdx))} style={{ color: 'var(--error)', background: 'rgba(244, 63, 94, 0.1)', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }} title="Excluir Questão">
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="form-group">
                <label>Enunciado / Pergunta</label>
                <textarea 
                  className="form-control" 
                  placeholder="Digite o texto principal da pergunta..." 
                  rows={3}
                  value={q.text} 
                  onChange={(e) => {
                    const newQ = [...quizQuestions];
                    newQ[qIdx].text = e.target.value;
                    setQuizQuestions(newQ);
                  }}
                />
              </div>

              {(!q.type || q.type === 'multiple_choice') && (
                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Alternativas (Marque a correta)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(q.options || []).map((opt: string, oIdx: number) => (
                      <div key={oIdx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <input 
                          type="radio" 
                          name={`correct-${qIdx}`} 
                          checked={q.correct === oIdx} 
                          onChange={() => {
                            const newQ = [...quizQuestions];
                            newQ[qIdx].correct = oIdx;
                            setQuizQuestions(newQ);
                          }} 
                          style={{ width: '20px', height: '20px', accentColor: 'var(--success)' }} 
                        />
                        <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 800 }}>{String.fromCharCode(65 + oIdx)}.</span>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ paddingLeft: '2.5rem' }} 
                            placeholder="Texto da alternativa..."
                            value={opt} 
                            onChange={(e) => {
                              const newQ = [...quizQuestions];
                              if(!newQ[qIdx].options) newQ[qIdx].options = [];
                              newQ[qIdx].options![oIdx] = e.target.value;
                              setQuizQuestions(newQ);
                            }}
                          />
                        </div>
                        <button className="btn btn-outline" style={{ width: 'auto', padding: '0.8rem', color: 'var(--error)', borderColor: 'rgba(255,255,255,0.05)' }} onClick={() => {
                          const newQ = [...quizQuestions];
                          newQ[qIdx].options?.splice(oIdx, 1);
                          if (newQ[qIdx].correct === oIdx) newQ[qIdx].correct = 0;
                          setQuizQuestions(newQ);
                        }}>
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-outline" style={{ marginTop: '1rem', width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => {
                    const newQ = [...quizQuestions];
                    if(!newQ[qIdx].options) newQ[qIdx].options = [];
                    newQ[qIdx].options!.push('');
                    setQuizQuestions(newQ);
                  }}>
                    <Plus size={14} /> Adicionar Alternativa
                  </button>
                </div>
              )}

              {q.type === 'true_false' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Gabarito</label>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: q.isTrue ? 'rgba(16, 185, 129, 0.1)' : 'var(--glass)', border: `1px solid ${q.isTrue ? 'var(--success)' : 'var(--glass-border)'}`, padding: '1rem', borderRadius: '12px', flex: 1 }}>
                      <input type="radio" name={`tf-${qIdx}`} checked={q.isTrue === true} onChange={() => {
                        const newQ = [...quizQuestions];
                        newQ[qIdx].isTrue = true;
                        setQuizQuestions(newQ);
                      }} style={{ accentColor: 'var(--success)', width: '20px', height: '20px' }} /> <CheckCircle2 color="var(--success)" size={18} /> Verdadeiro
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: q.isTrue === false ? 'rgba(244, 63, 94, 0.1)' : 'var(--glass)', border: `1px solid ${q.isTrue === false ? 'var(--error)' : 'var(--glass-border)'}`, padding: '1rem', borderRadius: '12px', flex: 1 }}>
                      <input type="radio" name={`tf-${qIdx}`} checked={q.isTrue === false} onChange={() => {
                        const newQ = [...quizQuestions];
                        newQ[qIdx].isTrue = false;
                        setQuizQuestions(newQ);
                      }} style={{ accentColor: 'var(--error)', width: '20px', height: '20px' }} /> <XCircle color="var(--error)" size={18} /> Falso
                    </label>
                  </div>
                </div>
              )}

              {q.type === 'matching' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Pares (Coluna 1 ➔ Coluna 2)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(q.matchingPairs || []).map((pair, pIdx) => (
                      <div key={pIdx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Item {pIdx + 1} (Esquerda)</span>
                          <input type="text" className="form-control" placeholder="Ex: Frase A" value={pair.left} onChange={(e) => {
                            const newQ = [...quizQuestions];
                            newQ[qIdx].matchingPairs![pIdx].left = e.target.value;
                            setQuizQuestions(newQ);
                          }} />
                        </div>
                        <ChevronRight color="var(--text-muted)" />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Correspondente (Direita)</span>
                          <input type="text" className="form-control" placeholder="Ex: Correspondente A" value={pair.right} onChange={(e) => {
                            const newQ = [...quizQuestions];
                            newQ[qIdx].matchingPairs![pIdx].right = e.target.value;
                            setQuizQuestions(newQ);
                          }} />
                        </div>
                        <button className="btn btn-outline" style={{ padding: '0.8rem', color: 'var(--error)', alignSelf: 'flex-end', width: 'auto' }} onClick={() => {
                          const newQ = [...quizQuestions];
                          newQ[qIdx].matchingPairs?.splice(pIdx, 1);
                          setQuizQuestions(newQ);
                        }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-outline" style={{ marginTop: '1rem', width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => {
                    const newQ = [...quizQuestions];
                    if(!newQ[qIdx].matchingPairs) newQ[qIdx].matchingPairs = [];
                    newQ[qIdx].matchingPairs!.push({ left: '', right: '' });
                    setQuizQuestions(newQ);
                  }}>
                    <Plus size={14} /> Adicionar Par
                  </button>
                </div>
              )}

              {q.type === 'discursive' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Expectativa de Resposta / Palavras-chave (Opcional, apenas para correção futura)</label>
                  <textarea 
                    className="form-control" 
                    rows={4} 
                    placeholder="Digite aqui o que se espera que o aluno responda..."
                    value={q.expectedAnswer || ''}
                    onChange={(e) => {
                      const newQ = [...quizQuestions];
                      newQ[qIdx].expectedAnswer = e.target.value;
                      setQuizQuestions(newQ);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
      
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--glass)', padding: '1.5rem', borderRadius: '16px', border: '1px dashed var(--glass-border)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Adicionar Nova Questão</label>
              <select id="new-q-type" className="form-control" defaultValue="multiple_choice">
                <option value="multiple_choice">Múltipla Escolha</option>
                <option value="true_false">Verdadeiro ou Falso</option>
                <option value="matching">Ancoragem (Associação de Colunas)</option>
                <option value="discursive">Dissertativa (Texto Livre)</option>
              </select>
            </div>
            <button className="btn btn-outline" style={{ width: 'auto', alignSelf: 'flex-end', display: 'flex', gap: '0.5rem' }} onClick={() => {
              const sel = document.getElementById('new-q-type') as HTMLSelectElement;
              const type = sel.value as QuestionType;
              const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
              
              const newQuestion: QuizQuestion = {
                id: newId,
                type,
                text: ''
              };
              
              if(type === 'multiple_choice') {
                newQuestion.options = ['', '', '', ''];
                newQuestion.correct = 0;
              } else if (type === 'true_false') {
                newQuestion.isTrue = true;
              } else if (type === 'matching') {
                newQuestion.matchingPairs = [{left: '', right: ''}, {left: '', right: ''}];
              }
              
              setQuizQuestions([...quizQuestions, newQuestion]);
            }}>
              <Plus size={18} /> Inserir
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setEditingQuiz(null)}>Cancelar e Voltar</button>
            <button className="btn btn-primary" onClick={async () => {
              setActionLoading('save-quiz');
              const { error } = await supabase.from('aulas').update({ questionario: quizQuestions }).eq('id', editingQuiz.id);
              if (error) showToast(error.message, 'error');
              else {
                showToast('Atividade salva com sucesso!');
                setEditingQuiz(null);
                fetchLessons(selectedBook.id);
              }
              setActionLoading(null);
            }} disabled={actionLoading === 'save-quiz'}>
              {actionLoading === 'save-quiz' ? <Loader2 className="spinner" /> : 'Salvar Todas as Atividades'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizEditorModal;
