import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  BookOpen,
  AlertCircle,
  Edit3,
  Save,
  Loader2,
  Award,
  Clock
} from 'lucide-react';
import { QuizQuestion } from '../../../types/admin';
import { useProfile } from '../../../hooks/useProfile';
import { supabase } from '../../../lib/supabase';
import {
  computeScore,
  matchingPairCorrect,
  regradeSubmissionsForAula,
  finalizeModuleOnApproval,
  unfinalizeModule,
  ensureRecoveryExam
} from '../../../services/examCorrection';

type UserMode = 'admin' | 'professor' | 'student';

interface AvaliacaoFixacaoProps {
  lessonId: string;
  questions: QuizQuestion[];
  lessonTitle?: string;
  minGrade?: number;
  isModuleFinished?: boolean;
  onSaved?: () => void;
}

const AvaliacaoFixacao: React.FC<AvaliacaoFixacaoProps> = ({
  lessonId,
  questions: initialQuestions,
  minGrade = 7.0,
  isModuleFinished = false,
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
    multipleChoice: true,
    matching: true
  });

  // Sync questions when prop changes + carrega submissão anterior (1 tentativa por versão)
  useEffect(() => {
    setQuestions(initialQuestions);
    setExercicioFinalizado(false);
    setRespostasAluno({});
    setEditingGabarito(false);
    setShowGabarito(mode === 'professor' || mode === 'admin');

    if (mode === 'student' && profile?.id) {
      supabase.from('respostas_aulas')
        .select('respostas, status, nota, tentativas')
        .eq('aula_id', lessonId)
        .eq('aluno_id', profile.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            if (data.respostas) setRespostasAluno(data.respostas);
            const hasFinishedAttempt = data.status === 'corrigida' || data.nota !== null || (data.tentativas || 0) >= 1;
            if (hasFinishedAttempt) {
              setExercicioFinalizado(true);
              const computedNota = data.nota !== null && data.nota !== undefined
                ? Number(data.nota)
                : computeScore(initialQuestions, data.respostas || {});
              // Regra oficial: O aluno só terá acesso ao gabarito da avaliação em que ele for aprovado
              setShowGabarito(computedNota >= minGrade);
            }
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, initialQuestions, isModuleFinished, mode, profile?.id, minGrade]);

  // Handlers
  const setResposta = (qKey: string, valor: any) => {
    if (exercicioFinalizado && mode === 'student') return;
    setRespostasAluno((prev) => ({ ...prev, [qKey]: valor }));
  };

  const handleFinalizar = async () => {
    if (!profile?.id) {
      toast.error('Usuário não autenticado.');
      return;
    }

    if (exercicioFinalizado && mode === 'student') {
      toast('Você já utilizou a sua 1 oportunidade para esta versão da avaliação.', { icon: '🔒' });
      return;
    }

    setSaving(true);
    try {
      // Verifica no banco se o aluno já enviou esta versão (1 oportunidade por versão)
      const { data: existingSub } = await supabase
        .from('respostas_aulas')
        .select('id, status, nota, tentativas, respostas')
        .eq('aula_id', lessonId)
        .eq('aluno_id', profile.id)
        .maybeSingle();

      if (existingSub && (existingSub.status === 'corrigida' || existingSub.nota !== null || (existingSub.tentativas || 0) >= 1) && mode === 'student') {
        if (existingSub.respostas) setRespostasAluno(existingSub.respostas);
        setExercicioFinalizado(true);
        const existingNota = existingSub.nota !== null && existingSub.nota !== undefined
          ? Number(existingSub.nota)
          : computeScore(questions, existingSub.respostas || {});
        setShowGabarito(existingNota >= minGrade);
        toast('Você já realizou esta versão da avaliação. É permitida apenas 1 oportunidade por versão.', { icon: '🔒' });
        return;
      }

      const finalGrade = computeScore(questions, respostasAluno);
      const isApproved = finalGrade >= minGrade;
      const nowIso = new Date().toISOString();

      const upsertData: any = {
        aluno_id: profile.id,
        aula_id: lessonId,
        respostas: respostasAluno,
        nota: finalGrade,
        status: 'corrigida',
        tentativas: 1,
        primeira_correcao_at: nowIso,
        updated_at: nowIso
      };
      if (existingSub?.id) upsertData.id = existingSub.id;

      // 1. Salva as respostas e a nota calculada
      const { error: saveError } = await supabase
        .from('respostas_aulas')
        .upsert(upsertData, { onConflict: 'aluno_id,aula_id' });

      if (saveError) {
        throw saveError;
      }

      // 2. Efeitos pedagógicos (finalização do módulo na aprovação ou criação de recuperação na reprovação)
      if (mode === 'student') {
        const { data: aulaData } = await supabase
          .from('aulas')
          .select('id, livro_id, min_grade, versao, tipo, titulo, questionario, ordem, parent_aula_id')
          .eq('id', lessonId)
          .maybeSingle();

        if (aulaData?.livro_id) {
          if (isApproved) {
            await finalizeModuleOnApproval(profile.id, aulaData.livro_id);
          } else {
            await unfinalizeModule(profile.id, aulaData.livro_id);
            await ensureRecoveryExam(aulaData, finalGrade, minGrade);
          }
        }
      }

      setExercicioFinalizado(true);
      // Regra oficial: ao finalizar, o aluno só terá acesso ao gabarito da avaliação em que for aprovado
      setShowGabarito(isApproved);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onSaved?.();
    } catch (err: any) {
      console.error('[AvaliacaoFixacao] ERRO final:', err);
      toast.error('Erro ao salvar avaliação: ' + err.message);
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

  // Save gabarito (admin or professor)
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

      let textSuccess = 'Gabarito salvo com sucesso!';
      try {
        const regraded = await regradeSubmissionsForAula(lessonId);
        if (regraded > 0) {
          textSuccess += ` (${regraded} nota(s) de alunos recalculada(s))`;
        }
      } catch (e) {
        console.warn('Erro ao recorrigir submissões:', e);
      }

      setSaveMessage({ type: 'success', text: textSuccess });
      setTimeout(() => setSaveMessage(null), 4000);
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
          if (isNaN(selectedIndex)) return false;
          if (selectedIndex === mIdx) return true;
          // Accept if the text of the selected right item is identical to the expected right item
          const expectedText = pair.right?.trim().toLowerCase() || '';
          const selectedText = q.matchingPairs![selectedIndex]?.right?.trim().toLowerCase() || '';
          return expectedText === selectedText && expectedText !== '';
        });

      default:
        return false;
    }
  };

  // Get stats with points using official computeScore (0.5 per TF/MC, 0.5 per matching pair = 3.0 pts)
  const stats = useMemo(() => {
    let totalQuestions = 0;
    let answered = 0;
    let correct = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const q of questions) {
      totalQuestions++;
      const qKey = q.id;
      if (q.type === 'matching' && q.matchingPairs?.length) {
        const qPts = Math.min(3.0, q.matchingPairs.length * 0.5);
        totalPoints += qPts;
        const uA = respostasAluno[qKey];
        if (uA && typeof uA === 'object' && Object.keys(uA).length > 0) {
          answered++;
          const pairPts = q.matchingPairs.reduce((acc, _, mIdx) => {
            return acc + (matchingPairCorrect(q, mIdx, uA) ? 0.5 : 0);
          }, 0);
          earnedPoints += Math.min(3.0, pairPts);
          if (isCorrect(q, qKey)) correct++;
        }
      } else {
        const points = q.points || 0.5;
        totalPoints += points;
        if (respostasAluno[qKey] !== undefined && respostasAluno[qKey] !== null) {
          answered++;
          if (isCorrect(q, qKey)) {
            correct++;
            earnedPoints += points;
          }
        }
      }
    }

    const grade = computeScore(questions, respostasAluno);
    const passed = grade >= minGrade;

    return { totalQuestions, answered, correct, totalPoints, earnedPoints, grade, passed };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, respostasAluno, minGrade]);

  // Render True/False question
  const renderTrueFalse = (q: QuizQuestion, idx: number) => {
    const qKey = q.id;
    const studentAns = respostasAluno[qKey];

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', flex: 1 }}>
            {idx + 1}. {q.text}
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-muted)', 
            background: 'var(--glass-bg)',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            marginLeft: '0.5rem',
            flexShrink: 0
          }}>
            {q.points || 0.5} pt
          </div>
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
        {exercicioFinalizado && mode === 'student' && !showGabarito && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            color: 'var(--error)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} />
            Gabarito disponível apenas na avaliação em que o aluno for aprovado.
          </div>
        )}
      </div>
    );
  };

  // Render Multiple Choice question
  const renderMultipleChoice = (q: QuizQuestion, idx: number) => {
    const qKey = q.id;
    const studentAns = respostasAluno[qKey];
    const showResult = showGabarito && exercicioFinalizado;
    const correct = showResult ? String(studentAns) === String(q.correct) : null;

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', flex: 1 }}>
            {idx + 1}. {q.text}
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-muted)', 
            background: 'var(--glass-bg)',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            marginLeft: '0.5rem',
            flexShrink: 0
          }}>
            {q.points || 0.5} pt
          </div>
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
                  {isSelected && '●'}
                  {isCorrectOption && !isSelected && '✓'}
                </span>
                <span>{option}</span>
              </label>
            );
          })}
        </div>
        {exercicioFinalizado && mode === 'student' && !showGabarito && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            color: 'var(--error)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} />
            Gabarito disponível apenas na avaliação em que o aluno for aprovado.
          </div>
        )}
      </div>
    );
  };

  // Render Matching question
  const renderMatching = (q: QuizQuestion, idx: number) => {
    const qKey = q.id;
    const studentAns = respostasAluno[qKey] || {};
    const showResult = showGabarito && exercicioFinalizado;

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', flex: 1 }}>
            {idx + 1}. {q.text}
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-muted)', 
            background: 'var(--glass-bg)',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            marginLeft: '0.5rem',
            flexShrink: 0
          }}>
            {q.points || 3.0} pts
          </div>
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
        {exercicioFinalizado && mode === 'student' && !showGabarito && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            color: 'var(--error)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} />
            Gabarito disponível apenas na avaliação em que o aluno for aprovado.
          </div>
        )}
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
          ID: {q.id} | Tipo: {q.type} | Pontos: {q.points || 0.5}
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
      </div>
    );
  };

  // Group questions by type
  const groupedQuestions = useMemo(() => {
    const groups = {
      trueFalse: questions.filter(q => q.type === 'true_false'),
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
          <Award size={28} color="var(--primary)" />
          <h2 style={{ margin: 0, color: 'var(--text)' }}>
            Avaliação
          </h2>
        </div>

        {/* Admin & Professor controls */}
        {(mode === 'admin' || mode === 'professor') && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
          </div>
        )}

        {/* Stats for students */}
        {mode === 'student' && exercicioFinalizado && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: stats.passed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${stats.passed ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
          }}>
            {stats.passed ? <CheckCircle size={26} color="var(--success)" /> : <AlertCircle size={26} color="var(--error)" />}
            <div>
              <div style={{ fontWeight: 800, color: stats.passed ? 'var(--success)' : 'var(--error)', fontSize: '1.15rem' }}>
                {stats.passed
                  ? `Aprovado nesta Avaliação! Nota: ${stats.grade.toFixed(1)} / 10`
                  : `Nota Insuficiente: ${stats.grade.toFixed(1)} / 10 (Mínimo: ${minGrade.toFixed(1)})`}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {stats.passed
                  ? 'Parabéns! Você foi aprovado e o gabarito oficial desta avaliação está liberado abaixo para revisão.'
                  : 'Cada versão permite apenas 1 oportunidade. O gabarito oficial só é liberado na avaliação em que você for aprovado.'}
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

      {/* Grading info */}
      {mode === 'student' && !exercicioFinalizado && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          borderRadius: '8px',
          background: 'rgba(var(--primary-rgb), 0.05)',
          border: '1px solid rgba(var(--primary-rgb), 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <Clock size={20} color="var(--primary)" />
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
              Total: {stats.totalQuestions} questões | Nota mínima: {minGrade}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              10 V/F (5pts) | 4 Múltipla Escolha (2pts) | 1 Relacione (3pts)
            </div>
          </div>
          <div style={{ 
            fontSize: '0.9rem', 
            color: 'var(--text-muted)',
            background: 'var(--glass-bg)',
            padding: '0.5rem 1rem',
            borderRadius: '6px'
          }}>
            Respondidas: {stats.answered}/{stats.totalQuestions}
          </div>
        </div>
      )}

      {/* Admin & Professor: Edit mode */}
      {(mode === 'admin' || mode === 'professor') && editingGabarito && (
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

      {/* Estado Vazio - Nenhuma questão cadastrada */}
      {questions.length === 0 && (
        <div style={{
          padding: '2.5rem',
          textAlign: 'center',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--glass-border)',
          marginBottom: '2rem'
        }}>
          <AlertCircle size={48} color="var(--primary)" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>
            {mode === 'student' ? 'Avaliação em Preparação' : 'Nenhuma questão cadastrada'}
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto', fontSize: '0.9rem', lineHeight: '1.5' }}>
            {mode === 'student'
              ? 'Esta avaliação ainda não possui questões cadastradas pelo professor. Por favor, aguarde a publicação das questões.'
              : 'Esta avaliação ainda não possui questionário cadastrado. Utilize o painel de Gerenciamento de Conteúdo do Professor ou Administrador para cadastrar as questões desta avaliação.'}
          </p>
        </div>
      )}

      {/* Professor ou aluno aprovado nesta avaliação: View mode with gabarito */}
      {(mode === 'professor' || mode === 'admin' || (mode === 'student' && exercicioFinalizado && stats.passed)) && showGabarito && (
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
              {groupedQuestions.trueFalse.length} questões (5,0 pts)
            </span>
          </div>
          {expandedSections.trueFalse && (
            <div>
              {groupedQuestions.trueFalse.map((q) => renderTrueFalse(q, getGlobalIndex(q) - 1))}
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
              II - Múltipla Escolha
            </span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {groupedQuestions.multipleChoice.length} questões (2,0 pts)
            </span>
          </div>
          {expandedSections.multipleChoice && (
            <div>
              {groupedQuestions.multipleChoice.map((q) => renderMultipleChoice(q, getGlobalIndex(q) - 1))}
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
              III - Relacione as Colunas
            </span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
              1 questão (3,0 pts)
            </span>
          </div>
          {expandedSections.matching && (
            <div>
              {groupedQuestions.matching.map((q) => renderMatching(q, getGlobalIndex(q) - 1))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons for students */}
      {mode === 'student' && questions.length > 0 && (
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
               {saving ? 'Salvando...' : 'Enviar Avaliação'}
             </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AvaliacaoFixacao;
