import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  BookOpen,
  AlertCircle,
  Edit3,
  Save,
  Loader2
} from 'lucide-react';
import { QuizQuestion } from '../../../types/admin';
import { useProfile } from '../../../hooks/useProfile';
import { supabase } from '../../../lib/supabase';
import { convertQuizQuestionsToJsonLesson } from '../utils/exerciseParser';

type UserMode = 'admin' | 'professor' | 'student';

interface ExercicioFixacaoProps {
  lessonId: string;
  questions: QuizQuestion[];
  lessonTitle?: string;
  onSaved?: () => void;
}

const ExercicioFixacao: React.FC<ExercicioFixacaoProps> = ({
  lessonId,
  questions: initialQuestions,
  lessonTitle = '',
  onSaved
}) => {
  const { profile } = useProfile();

  // Determine user mode
  const mode: UserMode = useMemo(() => {
    const tipo = profile?.tipo;
    const roles = (profile?.caminhos_acesso as string[]) || [];
    if (tipo === 'admin' || roles.includes('admin') || roles.includes('suporte')) {
      return 'admin';
    }
    if (tipo === 'professor' || roles.includes('professor')) {
      return 'professor';
    }
    return 'student';
  }, [profile]);

  // State
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [respostasAluno, setRespostasAluno] = useState<Record<string, any>>({});
  const [exercicioFinalizado, setExercicioFinalizado] = useState(false);
  const [showGabarito, setShowGabarito] = useState(mode === 'professor' || mode === 'admin');
  const [editingGabarito, setEditingGabarito] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    trueFalse: true,
    shortAnswer: true,
    multipleChoice: true,
    matching: true
  });

  // Sync questions when prop changes
  useEffect(() => {
    setQuestions(initialQuestions);
    setExercicioFinalizado(false);
    setRespostasAluno({});
    setEditingGabarito(false);
    setShowGabarito(false);
  }, [lessonId, initialQuestions]);

  // Handlers
  const setResposta = (qKey: string, valor: any) => {
    if (exercicioFinalizado && mode === 'student') return;
    setRespostasAluno((prev) => ({ ...prev, [qKey]: valor }));
  };

  const handleFinalizar = async () => {
    if (!profile?.id) return alert('Usuário não autenticado.');
    
    setSaving(true);
    try {
      // 1. Salva as respostas (exercícios pedagógicos ficam como 'corrigida' mas sem nota)
      const { error: saveError } = await supabase.from('respostas_aulas').upsert({
        aluno_id: profile.id,
        aula_id: lessonId,
        respostas: respostasAluno,
        status: 'corrigida',
        nota: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'aluno_id,aula_id' });

      if (saveError) throw saveError;

      setExercicioFinalizado(true);
      setShowGabarito(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onSaved?.();
    } catch (err: any) {
      alert('Erro ao salvar progresso: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRefazer = () => {
    setExercicioFinalizado(false);
    setRespostasAluno({});
    setShowGabarito(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Save gabarito (admin only)
  const handleSalvarGabarito = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const { error } = await supabase
        .from('aulas')
        .update({ questionario: questions })
        .eq('id', lessonId);
      if (error) throw error;
      setEditingGabarito(false);
      setSaveMessage({ type: 'success', text: 'Gabarito salvo com sucesso!' });
      setTimeout(() => setSaveMessage(null), 3500);
      onSaved?.();
    } catch (err: any) {
      setSaveMessage({
        type: 'error',
        text: `Erro ao salvar: ${err?.message || 'tente novamente'}`
      });
    } finally {
      setSaving(false);
    }
  };

  // Update question (admin editing)
  const updateQuestion = (qId: string, patch: Partial<QuizQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, ...patch } : q));
  };

  // Check if answer is correct
  const isCorrect = (q: QuizQuestion, qKey: string): boolean => {
    const r = respostasAluno[qKey];
    if (r === undefined || r === null) return false;
    switch (q.type) {
      case 'true_false':
        return r === q.isTrue;
      case 'multiple_choice':
        return String(r) === String(q.correct);
      case 'matching':
        if (!q.matchingPairs) return false;
        return q.matchingPairs.every((pair, mIdx) => {
          const selectedIndex = Number(r?.[mIdx]);
          return !isNaN(selectedIndex) && selectedIndex === mIdx;
        });
      case 'discursive':
        return false; // Discursive is always manual review
      default:
        return false;
    }
  };

  // Get stats
  const stats = useMemo(() => {
    let total = 0;
    let answered = 0;
    let correct = 0;

    for (const q of questions) {
      if (q.type === 'discursive') continue; // Don't count discursive
      total++;
      const qKey = q.id;
      if (respostasAluno[qKey] !== undefined && respostasAluno[qKey] !== null) {
        answered++;
        if (isCorrect(q, qKey)) correct++;
      }
    }

    return { total, answered, correct };
  }, [questions, respostasAluno]);

  // Render True/False question
  const renderTrueFalse = (q: QuizQuestion, idx: number) => {
    const qKey = q.id;
    const studentAns = respostasAluno[qKey];
    const showResult = exercicioFinalizado && mode === 'student';
    const correct = showResult ? isCorrect(q, qKey) : null;

    return (
      <div
        key={qKey}
        style={{
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: showResult
            ? `2px solid ${correct ? 'var(--success)' : 'var(--error)'}`
            : '1px solid var(--glass-border)',
          marginBottom: '1rem'
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text)' }}>
          {idx + 1}. {q.text}
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: mode === 'student' && !exercicioFinalizado ? 'pointer' : 'default',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: studentAns === true
                ? '2px solid var(--primary)'
                : '1px solid var(--glass-border)',
              background: studentAns === true ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
              opacity: exercicioFinalizado && mode === 'student' ? 0.7 : 1
            }}
          >
            <input
              type="radio"
              name={`tf-${qKey}`}
              checked={studentAns === true}
              onChange={() => setResposta(qKey, true)}
              disabled={exercicioFinalizado && mode === 'student'}
              style={{ display: 'none' }}
            />
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: studentAns === true ? '2px solid var(--primary)' : '2px solid var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700
            }}>
              {studentAns === true && 'V'}
            </span>
            Verdadeiro
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: mode === 'student' && !exercicioFinalizado ? 'pointer' : 'default',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: studentAns === false
                ? '2px solid var(--primary)'
                : '1px solid var(--glass-border)',
              background: studentAns === false ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
              opacity: exercicioFinalizado && mode === 'student' ? 0.7 : 1
            }}
          >
            <input
              type="radio"
              name={`tf-${qKey}`}
              checked={studentAns === false}
              onChange={() => setResposta(qKey, false)}
              disabled={exercicioFinalizado && mode === 'student'}
              style={{ display: 'none' }}
            />
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: studentAns === false ? '2px solid var(--primary)' : '2px solid var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700
            }}>
              {studentAns === false && 'F'}
            </span>
            Falso
          </label>
        </div>
        {showResult && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '8px',
            background: correct ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: correct ? 'var(--success)' : 'var(--error)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {correct ? <CheckCircle size={18} /> : <XCircle size={18} />}
            Resposta correta: <strong>{q.isTrue ? 'Verdadeiro' : 'Falso'}</strong>
          </div>
        )}
      </div>
    );
  };

  // Render Short Answer (Discursive) question
  const renderShortAnswer = (q: QuizQuestion, idx: number) => {
    const qKey = q.id;
    const studentAns = respostasAluno[qKey] || '';

    return (
      <div
        key={qKey}
        style={{
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: '1px solid var(--glass-border)',
          marginBottom: '1rem'
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text)' }}>
          {idx + 1}. {q.text}
        </div>
        <textarea
          value={studentAns}
          onChange={(e) => setResposta(qKey, e.target.value)}
          disabled={exercicioFinalizado && mode === 'student'}
          placeholder="Digite sua resposta..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            color: 'var(--text)',
            fontSize: '1rem',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
        {showGabarito && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(var(--primary-rgb), 0.1)',
            border: '1px solid rgba(var(--primary-rgb), 0.3)'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>
              Gabarito:
            </div>
            <div style={{ color: 'var(--text)' }}>{q.expectedAnswer || '—'}</div>
          </div>
        )}
      </div>
    );
  };

  // Render Multiple Choice question
  const renderMultipleChoice = (q: QuizQuestion, idx: number) => {
    const qKey = q.id;
    const studentAns = respostasAluno[qKey];
    const showResult = exercicioFinalizado && mode === 'student';
    const correct = showResult ? isCorrect(q, qKey) : null;

    return (
      <div
        key={qKey}
        style={{
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: showResult
            ? `2px solid ${correct ? 'var(--success)' : 'var(--error)'}`
            : '1px solid var(--glass-border)',
          marginBottom: '1rem'
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text)' }}>
          {idx + 1}. {q.text}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {q.options?.map((option, optIdx) => {
            const isSelected = studentAns === optIdx;
            const isCorrectOption = showResult && q.correct === optIdx;

            return (
              <label
                key={optIdx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: mode === 'student' && !exercicioFinalizado ? 'pointer' : 'default',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: isSelected
                    ? '2px solid var(--primary)'
                    : isCorrectOption
                      ? '2px solid var(--success)'
                      : '1px solid var(--glass-border)',
                  background: isSelected
                    ? 'rgba(var(--primary-rgb), 0.1)'
                    : isCorrectOption
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'transparent',
                  opacity: exercicioFinalizado && mode === 'student' && !isSelected && !isCorrectOption ? 0.5 : 1
                }}
              >
                <input
                  type="radio"
                  name={`mc-${qKey}`}
                  checked={isSelected}
                  onChange={() => setResposta(qKey, optIdx)}
                  disabled={exercicioFinalizado && mode === 'student'}
                  style={{ display: 'none' }}
                />
                <span style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: isSelected
                    ? '2px solid var(--primary)'
                    : isCorrectOption
                      ? '2px solid var(--success)'
                      : '2px solid var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {isSelected && (showResult ? (correct ? '✓' : '✗') : '●')}
                  {isCorrectOption && !isSelected && '✓'}
                </span>
                <span>{option}</span>
              </label>
            );
          })}
        </div>
        {showResult && !correct && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--error)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <XCircle size={18} />
            Resposta correta: <strong>{q.options?.[q.correct ?? 0]}</strong>
          </div>
        )}
      </div>
    );
  };

  // Render Matching question
  const renderMatching = (q: QuizQuestion, idx: number) => {
    const qKey = q.id;
    const studentAns = respostasAluno[qKey] || {};
    const showResult = exercicioFinalizado && mode === 'student';

    if (!q.matchingPairs) return null;

    // Create shuffled options for column B
    const shuffledOptions = shuffledMatchingOptions[q.id] || [];

    return (
      <div
        key={qKey}
        style={{
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: '1px solid var(--glass-border)',
          marginBottom: '1rem'
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text)' }}>
          {idx + 1}. {q.text}
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Column A */}
          <div style={{ flex: 1, minWidth: '250px' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--primary)' }}>
              Coluna A
            </div>
            {q.matchingPairs.map((pair, pairIdx) => (
              <div
                key={pairIdx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'var(--glass-bg)'
                }}
              >
                <span style={{ fontWeight: 500, flexShrink: 0 }}>
                  ({pairIdx + 1})
                </span>
                <span>{pair.left}</span>
              </div>
            ))}
          </div>

          {/* Column B */}
          <div style={{ flex: 1, minWidth: '250px' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--primary)' }}>
              Coluna B
            </div>
            {q.matchingPairs.map((pair, pairIdx) => {
              const selectedValue = studentAns[pairIdx];
              const correctPair = q.matchingPairs![pairIdx];
              const isCorrectMatch = showResult && selectedValue !== undefined && 
                q.matchingPairs![Number(selectedValue)]?.right === correctPair.right;

              return (
                <div
                  key={pairIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    borderRadius: '8px',
                    border: showResult
                      ? `2px solid ${isCorrectMatch ? 'var(--success)' : 'var(--error)'}`
                      : '1px solid var(--glass-border)',
                    background: isCorrectMatch ? 'rgba(34, 197, 94, 0.1)' : 'var(--glass-bg)'
                  }}
                >
                  <span style={{ fontWeight: 500, flexShrink: 0 }}>
                    ({pairIdx + 1})
                  </span>
                  <select
                    value={selectedValue ?? ''}
                    onChange={(e) => {
                      const newAns = { ...studentAns, [pairIdx]: e.target.value };
                      setResposta(qKey, newAns);
                    }}
                    disabled={exercicioFinalizado && mode === 'student'}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid var(--glass-border)',
                      background: 'var(--glass-bg)',
                      color: 'var(--text)',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="">Selecione...</option>
                    {shuffledOptions.map((opt, optIdx) => (
                      <option key={optIdx} value={q.matchingPairs!.findIndex(p => p.right === opt)}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Admin: Edit question
  const renderEditQuestion = (q: QuizQuestion) => {
    return (
      <div
        key={q.id}
        style={{
          padding: '1rem',
          marginBottom: '0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--glass-border)',
          background: 'var(--glass-bg)'
        }}
      >
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          ID: {q.id} | Tipo: {q.type}
        </div>
        <input
          type="text"
          value={q.text}
          onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            color: 'var(--text)',
            marginBottom: '0.5rem'
          }}
        />
        {q.type === 'true_false' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => updateQuestion(q.id, { isTrue: true })}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: q.isTrue ? '2px solid var(--success)' : '1px solid var(--glass-border)',
                background: q.isTrue ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                color: 'var(--text)',
                cursor: 'pointer'
              }}
            >
              Verdadeiro
            </button>
            <button
              onClick={() => updateQuestion(q.id, { isTrue: false })}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: !q.isTrue ? '2px solid var(--error)' : '1px solid var(--glass-border)',
                background: !q.isTrue ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                color: 'var(--text)',
                cursor: 'pointer'
              }}
            >
              Falso
            </button>
          </div>
        )}
        {q.type === 'multiple_choice' && (
          <div>
            {q.options?.map((opt, optIdx) => (
              <div key={optIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOptions = [...(q.options || [])];
                    newOptions[optIdx] = e.target.value;
                    updateQuestion(q.id, { options: newOptions });
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-bg)',
                    color: 'var(--text)'
                  }}
                />
                <button
                  onClick={() => updateQuestion(q.id, { correct: optIdx })}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: q.correct === optIdx ? '2px solid var(--success)' : '1px solid var(--glass-border)',
                    background: q.correct === optIdx ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                    color: q.correct === optIdx ? 'var(--success)' : 'var(--text)',
                    cursor: 'pointer'
                  }}
                >
                  {q.correct === optIdx ? '✓' : '○'}
                </button>
              </div>
            ))}
          </div>
        )}
        {q.type === 'discursive' && (
          <textarea
            value={q.expectedAnswer || ''}
            onChange={(e) => updateQuestion(q.id, { expectedAnswer: e.target.value })}
            placeholder="Resposta esperada..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              color: 'var(--text)',
              resize: 'vertical'
            }}
          />
        )}
      </div>
    );
  };

  // Group questions by type
  const groupedQuestions = useMemo(() => {
    const groups = {
      trueFalse: questions.filter(q => q.type === 'true_false'),
      shortAnswer: questions.filter(q => q.type === 'discursive'),
      multipleChoice: questions.filter(q => q.type === 'multiple_choice'),
      matching: questions.filter(q => q.type === 'matching')
    };
    return groups;
  }, [questions]);
  
  const shuffledMatchingOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    questions.forEach(q => {
      if (q.type === 'matching' && q.matchingPairs) {
        map[q.id] = [...q.matchingPairs.map(p => p.right)].sort(() => Math.random() - 0.5);
      }
    });
    return map;
  }, [questions]);

  // Calculate global index for each question
  const getGlobalIndex = (q: QuizQuestion): number => {
    return questions.findIndex(qq => qq.id === q.id) + 1;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ClipboardList size={28} color="var(--primary)" />
          <h2 style={{ margin: 0, color: 'var(--text)' }}>
            Exercícios de Fixação
          </h2>
        </div>

        {/* Admin controls */}
        {mode === 'admin' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setEditingGabarito(!editingGabarito)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid var(--primary)',
                background: editingGabarito ? 'var(--primary)' : 'transparent',
                color: editingGabarito ? 'white' : 'var(--primary)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <Edit3 size={16} />
              {editingGabarito ? 'Cancelar' : 'Editar Gabarito'}
            </button>
            {editingGabarito && (
              <button
                onClick={handleSalvarGabarito}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--success)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar
              </button>
            )}
          </div>
        )}

        {/* Professor controls */}
        {mode === 'professor' && (
          <button
            onClick={() => setShowGabarito(!showGabarito)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid var(--primary)',
              background: showGabarito ? 'var(--primary)' : 'transparent',
              color: showGabarito ? 'white' : 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {showGabarito ? <EyeOff size={16} /> : <Eye size={16} />}
            {showGabarito ? 'Ocultar Gabarito' : 'Mostrar Gabarito'}
          </button>
        )}

        {/* Stats for students */}
        {mode === 'student' && exercicioFinalizado && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(var(--primary-rgb), 0.1)',
            border: '1px solid rgba(var(--primary-rgb), 0.3)'
          }}>
            <CheckCircle size={24} color="var(--success)" />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                {stats.correct} de {stats.total} corretas
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}% de acerto
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save message */}
      {saveMessage && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: '8px',
          background: saveMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: saveMessage.type === 'success' ? 'var(--success)' : 'var(--error)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {saveMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {saveMessage.text}
        </div>
      )}

      {/* Admin: Edit mode */}
      {mode === 'admin' && editingGabarito && (
        <div style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          borderRadius: '12px',
          background: 'rgba(var(--primary-rgb), 0.05)',
          border: '1px solid rgba(var(--primary-rgb), 0.2)'
        }}>
          <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>Editando Gabarito</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Edite as questões abaixo. As alterações serão salvas no banco de dados.
          </p>
          {questions.map(q => renderEditQuestion(q))}
        </div>
      )}

      {/* Professor: View mode with gabarito */}
      {mode === 'professor' && showGabarito && (
        <div style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          borderRadius: '12px',
          background: 'rgba(var(--primary-rgb), 0.05)',
          border: '1px solid rgba(var(--primary-rgb), 0.2)'
        }}>
          <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>Gabarito das Respostas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {questions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                  {idx + 1}. {q.text}
                </div>
                <div style={{ color: 'var(--primary)', fontWeight: 500 }}>
                  Resposta: {
                    q.type === 'true_false' ? (q.isTrue ? 'Verdadeiro' : 'Falso') :
                    q.type === 'multiple_choice' ? q.options?.[q.correct ?? 0] :
                    q.type === 'discursive' ? q.expectedAnswer :
                    q.type === 'matching' ? q.matchingPairs?.map(p => `${p.left} → ${p.right}`).join(' | ') :
                    '—'
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* True/False Section */}
      {groupedQuestions.trueFalse.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div
            onClick={() => toggleSection('trueFalse')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              borderRadius: '8px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            {expandedSections.trueFalse ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            <BookOpen size={20} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
              I - Verdadeiro ou Falso
            </span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {groupedQuestions.trueFalse.length} questões
            </span>
          </div>
          {expandedSections.trueFalse && (
            <div>
              {groupedQuestions.trueFalse.map((q, idx) => renderTrueFalse(q, getGlobalIndex(q) - 1))}
            </div>
          )}
        </div>
      )}

      {/* Short Answer Section */}
      {groupedQuestions.shortAnswer.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div
            onClick={() => toggleSection('shortAnswer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              borderRadius: '8px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            {expandedSections.shortAnswer ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            <BookOpen size={20} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
              II - Citar / Resposta Aberta
            </span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {groupedQuestions.shortAnswer.length} questões
            </span>
          </div>
          {expandedSections.shortAnswer && (
            <div>
              {groupedQuestions.shortAnswer.map((q, idx) => renderShortAnswer(q, getGlobalIndex(q) - 1))}
            </div>
          )}
        </div>
      )}

      {/* Multiple Choice Section */}
      {groupedQuestions.multipleChoice.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div
            onClick={() => toggleSection('multipleChoice')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              borderRadius: '8px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            {expandedSections.multipleChoice ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            <BookOpen size={20} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
              III - Múltipla Escolha
            </span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {groupedQuestions.multipleChoice.length} questões
            </span>
          </div>
          {expandedSections.multipleChoice && (
            <div>
              {groupedQuestions.multipleChoice.map((q, idx) => renderMultipleChoice(q, getGlobalIndex(q) - 1))}
            </div>
          )}
        </div>
      )}

      {/* Matching Section */}
      {groupedQuestions.matching.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div
            onClick={() => toggleSection('matching')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              borderRadius: '8px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            {expandedSections.matching ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            <BookOpen size={20} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
              IV - Relacione as Colunas
            </span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {groupedQuestions.matching.length} questão(ões)
            </span>
          </div>
          {expandedSections.matching && (
            <div>
              {groupedQuestions.matching.map((q, idx) => renderMatching(q, getGlobalIndex(q) - 1))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons for students */}
      {mode === 'student' && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginTop: '2rem',
          padding: '1.5rem',
          borderRadius: '12px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)'
        }}>
          {!exercicioFinalizado ? (
             <button
               onClick={handleFinalizar}
               disabled={stats.answered === 0 || saving}
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 gap: '0.75rem',
                 padding: '1rem 2rem',
                 borderRadius: '8px',
                 border: 'none',
                 background: (stats.answered === 0 || saving) ? 'var(--text-muted)' : 'var(--primary)',
                 color: 'white',
                 fontSize: '1rem',
                 fontWeight: 600,
                 cursor: (stats.answered === 0 || saving) ? 'not-allowed' : 'pointer'
               }}
             >
               {saving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
               {saving ? 'Salvando...' : 'Verificar Respostas'}
             </button>
          ) : (
            <button
              onClick={handleRefazer}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 2rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={20} />
              Refazer Exercício
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExercicioFixacao;
