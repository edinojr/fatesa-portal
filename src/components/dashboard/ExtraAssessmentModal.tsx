import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Award, Clock, Save, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface ExtraAssessmentModalProps {
  atividade: any;
  onClose: () => void;
  onSuccess: () => void;
}

const ExtraAssessmentModal: React.FC<ExtraAssessmentModalProps> = ({ atividade, onClose, onSuccess }) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const questions = atividade.questionario || [];

  const handleSubmit = async () => {
    if (!confirm('Deseja enviar suas respostas agora?')) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      // Simple auto-grading for multiple choice/true-false
      let correctCount = 0;
      let totalGradable = 0;

      questions.forEach((q: any) => {
        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          totalGradable++;
          const studentAns = answers[q.id || q.text];
          const correct = q.correctOption !== undefined ? q.correctOption : q.correctAnswer;
          if (String(studentAns) === String(correct)) correctCount++;
        }
      });

      const finalGrade = totalGradable > 0 ? (correctCount / totalGradable) * 10 : null;

      const { error } = await supabase
        .from('respostas_atividades_extra')
        .upsert({
          aluno_id: session.user.id,
          atividade_id: atividade.id,
          respostas: answers,
          nota: finalGrade,
          status: 'pendente'
        }, { onConflict: 'aluno_id, atividade_id' });

      if (error) throw error;
      
      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (err: any) {
      alert('Erro ao enviar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="modal-overlay">
        <div className="modal-content text-center" style={{ maxWidth: '450px', textAlign: 'center', padding: '3rem' }}>
          <CheckCircle2 size={80} color="var(--success)" style={{ margin: '0 auto 1.5rem' }} />
          <h2>Avaliação Enviada!</h2>
          <p style={{ color: 'var(--text-muted)' }}>Sua participação foi registrada com sucesso e o professor será notificado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{atividade.titulo}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Award size={14} /> Material Adicional</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> {questions.length} Questões</span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
          {questions.map((q: any, idx: number) => (
            <div key={q.id || idx} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                <span style={{ opacity: 0.5, marginRight: '0.5rem' }}>Questão {idx + 1}:</span>
                {q.text}
              </h4>

              {q.type === 'discursive' && (
                <textarea 
                  className="form-control" 
                  rows={4} 
                  placeholder="Escreva sua resposta aqui..."
                  value={answers[q.id || q.text] || ''}
                  onChange={e => setAnswers({ ...answers, [q.id || q.text]: e.target.value })}
                ></textarea>
              )}

              {q.type === 'multiple_choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(q.options || []).map((opt: string, oIdx: number) => (
                    <label 
                      key={oIdx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem', 
                        padding: '1rem', 
                        background: 'rgba(255,255,255,0.03)', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        border: answers[q.id || q.text] === oIdx ? '1px solid var(--primary)' : '1px solid transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input 
                        type="radio" 
                        name={`q_${idx}`} 
                        checked={answers[q.id || q.text] === oIdx}
                        onChange={() => setAnswers({ ...answers, [q.id || q.text]: oIdx })}
                      />
                      <span style={{ fontSize: '0.95rem' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'true_false' && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {[true, false].map(val => (
                    <button
                      key={val.toString()}
                      className={`btn ${answers[q.id || q.text] === val ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => setAnswers({ ...answers, [q.id || q.text]: val })}
                    >
                      {val ? 'Verdadeiro' : 'Falso'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end', position: 'sticky', bottom: 0, padding: '1rem', background: 'var(--bg-card)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button className="btn btn-outline" style={{ width: 'auto' }} onClick={onClose}>Cancelar</button>
          <button 
            className="btn btn-primary" 
            style={{ width: 'auto', padding: '0.8rem 2.5rem' }}
            onClick={handleSubmit}
            disabled={loading || Object.keys(answers).length === 0}
          >
            {loading ? <Loader2 className="spinner" /> : 'Finalizar Avaliação'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExtraAssessmentModal;
