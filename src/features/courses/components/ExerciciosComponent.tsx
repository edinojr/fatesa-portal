import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  Edit3,
  Save,
  Loader2,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  AlertCircle,
  Award,
  CheckCircle2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  X as XIcon
} from 'lucide-react';
import { QuizQuestion } from '../../../types/admin';
import { useProfile } from '../../../hooks/useProfile';
import { supabase } from '../../../lib/supabase';

type UserMode = 'admin' | 'professor' | 'student';

interface ExerciciosComponentProps {
  lessonId: string;
  initialQuestions: QuizQuestion[];
  onSaved?: () => void;
}

const ExerciciosComponent: React.FC<ExerciciosComponentProps> = ({
  lessonId,
  initialQuestions,
  onSaved
}) => {
  const { profile } = useProfile();

  // ────────────────────────────────────────────────────────────
  // 1. Determinação de perfil (admin / professor / aluno)
  // ────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────
  // 2. Estados centrais
  // ────────────────────────────────────────────────────────────
  // Gabarito oficial (compartilhado entre todos os perfis em memória)
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions || []);

  // Respostas do aluno (apenas modo 'student')
  const [respostasAluno, setRespostasAluno] = useState<Record<string, any>>({});

  // Flag que controla o fluxo pedagógico: false = respondendo, true = conferindo
  const [exercicioEnviado, setExercicioEnviado] = useState<boolean>(false);

  // Modo de edição do gabarito (apenas admin)
  const [editingGabarito, setEditingGabarito] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Professor: pode ocultar/mostrar gabarito (default: visível)
  const [showGabaritoProfessor, setShowGabaritoProfessor] = useState<boolean>(true);

  // Sincroniza as perguntas se a prop mudar (ex: troca de aula)
  useEffect(() => {
    setQuestions(initialQuestions || []);
    setExercicioEnviado(false);
    setRespostasAluno({});
    setEditingGabarito(false);
  }, [lessonId, initialQuestions]);

  // ────────────────────────────────────────────────────────────
  // 3. Handlers do Aluno
  // ────────────────────────────────────────────────────────────
  const setResposta = (qKey: string, valor: any) => {
    setRespostasAluno((prev) => ({ ...prev, [qKey]: valor }));
  };

  const handleEnviarExercicios = () => {
    setExercicioEnviado(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleRefazer = () => {
    setExercicioEnviado(false);
    setRespostasAluno({});
  };

  // ────────────────────────────────────────────────────────────
  // 4. Handlers do Admin (gabarito oficial)
  // ────────────────────────────────────────────────────────────
  const updateGabarito = (idx: number, patch: Partial<QuizQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

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
      setSaveMessage({ type: 'success', text: 'Gabarito oficial salvo com sucesso!' });
      setTimeout(() => setSaveMessage(null), 3500);
      onSaved?.();
    } catch (err: any) {
      console.error('Erro ao salvar gabarito:', err);
      setSaveMessage({
        type: 'error',
        text: `Erro ao salvar gabarito: ${err?.message || 'tente novamente'}`
      });
    } finally {
      setSaving(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // 5. Funções utilitárias de comparação (gabarito x resposta)
  // ────────────────────────────────────────────────────────────
  const isCorrect = (q: QuizQuestion, qKey: string): boolean => {
    const r = respostasAluno[qKey];
    if (r === undefined || r === null) return false;
    switch (q.type) {
      case 'matching': {
        if (!q.matchingPairs) return false;
        return q.matchingPairs.every((_, mIdx) => String(r?.[mIdx]) === String(mIdx));
      }
      case 'true_false':
        return r === q.isTrue;
      case 'discursive':
        return false;
      case 'multiple_choice':
      default:
        return String(r) === String(q.correct);
    }
  };

  const getOfficialAnswer = (q: QuizQuestion): string => {
    switch (q.type) {
      case 'multiple_choice':
      default:
        return q.options?.[q.correct ?? 0] || '—';
      case 'true_false':
        return q.isTrue ? 'Verdadeiro' : 'Falso';
      case 'matching':
        return q.matchingPairs?.map((p) => `${p.left} → ${p.right}`).join(' | ') || '—';
      case 'discursive':
        return q.expectedAnswer || '—';
    }
  };

  // ────────────────────────────────────────────────────────────
  // 6. Renderização condicional das perguntas
  // ────────────────────────────────────────────────────────────
  const renderQuestion = (q: QuizQuestion, idx: number) => {
    const qKey = q.id || String(idx);
    const isExerciseFinished = exercicioEnviado && mode === 'student';
    const correct = isCorrect(q, qKey);
    const studentAns = respostasAluno[qKey];

    // Border de feedback (apenas aluno após envio)
    const borderStyle = isExerciseFinished
      ? `1px solid ${correct ? 'var(--success)' : 'var(--error)'}`
      : '1px solid var(--glass-border)';

    return (
      <div
        key={qKey}
        className="exercicio-question-card"
        style={{
          padding: '1.75rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
          border: borderStyle,
          marginBottom: '1.5rem'
        }}
      >
        {/* Cabeçalho da pergunta */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.25rem',
            gap: '1rem'
          }}
        >
          <p style={{ fontWeight: 600, fontSize: '1.05rem', flex: 1, lineHeight: 1.5 }}>
            {idx + 1}. {q.text}
          </p>
          {isExerciseFinished && (
            <div
              style={{
                color: correct ? 'var(--success)' : 'var(--error)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                background: correct ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                padding: '0.35rem 0.7rem',
                borderRadius: '8px'
              }}
            >
              {correct ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {correct ? 'Correta' : 'Incorreta'}
            </div>
          )}
        </div>

        {/* MÚLTIPLA ESCOLHA */}
        {(q.type === 'multiple_choice' || !q.type) &&
          q.options?.map((opt, oIdx) => {
            const isSelected = studentAns === oIdx;
            const isOfficial = q.correct === oIdx;
            const showAsCorrect = isExerciseFinished && isOfficial;
            const showAsWrong = isExerciseFinished && isSelected && !isOfficial;

            return (
              <label
                key={oIdx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.9rem 1rem',
                  borderRadius: '12px',
                  background: isSelected ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                  border: showAsCorrect
                    ? '1px solid var(--success)'
                    : showAsWrong
                    ? '1px solid var(--error)'
                    : '1px solid var(--glass-border)',
                  cursor: isExerciseFinished ? 'default' : 'pointer',
                  marginBottom: '0.5rem',
                  transition: 'all 0.15s'
                }}
              >
                <input
                  type="radio"
                  name={`q-${qKey}`}
                  checked={isSelected}
                  onChange={() => setResposta(qKey, oIdx)}
                  disabled={isExerciseFinished}
                  style={{ cursor: isExerciseFinished ? 'default' : 'pointer' }}
                />
                <span style={{ flex: 1 }}>{opt}</span>
                {showAsCorrect && (
                  <span
                    style={{
                      color: 'var(--success)',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <CheckCircle size={13} /> GABARITO
                  </span>
                )}
                {showAsWrong && <XCircle size={15} color="var(--error)" />}
              </label>
            );
          })}

        {/* VERDADEIRO / FALSO */}
        {q.type === 'true_false' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[true, false].map((v) => {
              const isSelected = studentAns === v;
              const isOfficial = q.isTrue === v;
              const showAsCorrect = isExerciseFinished && isOfficial;
              const showAsWrong = isExerciseFinished && isSelected && !isOfficial;
              return (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => !isExerciseFinished && setResposta(qKey, v)}
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                  disabled={isExerciseFinished}
                  style={{
                    width: 'auto',
                    border: showAsCorrect
                      ? '2px solid var(--success)'
                      : showAsWrong
                      ? '2px solid var(--error)'
                      : undefined,
                    opacity: isExerciseFinished && !isSelected ? 0.55 : 1
                  }}
                >
                  {v ? 'Verdadeiro' : 'Falso'}
                  {showAsCorrect && <CheckCircle size={13} style={{ marginLeft: '0.5rem' }} />}
                  {showAsWrong && <XCircle size={13} style={{ marginLeft: '0.5rem' }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* ASSOCIAÇÃO (matching) */}
        {q.type === 'matching' && q.matchingPairs && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {q.matchingPairs.map((pair, mIdx) => {
              const selected = studentAns?.[mIdx];
              const expectedIdx = String(mIdx);
              const isMatch = String(selected) === expectedIdx;
              const isWrongSelection = isExerciseFinished && selected !== undefined && !isMatch;
              return (
                <div
                  key={mIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: isExerciseFinished
                      ? isMatch
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(239, 68, 68, 0.08)'
                      : 'rgba(255,255,255,0.02)',
                    border: isExerciseFinished
                      ? isMatch
                        ? '1px solid var(--success)'
                        : '1px solid var(--error)'
                      : '1px solid var(--glass-border)',
                    borderRadius: '10px'
                  }}
                >
                  <span style={{ flex: 1, fontWeight: 600 }}>{pair.left}</span>
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                  <select
                    value={selected ?? ''}
                    onChange={(e) =>
                      setResposta(qKey, { ...(studentAns || {}), [mIdx]: e.target.value })
                    }
                    disabled={isExerciseFinished}
                    style={{
                      padding: '0.5rem 0.75rem',
                      background: 'var(--bg-dark)',
                      color: 'var(--text)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      minWidth: '180px'
                    }}
                  >
                    <option value="">Selecione...</option>
                    {q.matchingPairs!.map((p, pIdx) => (
                      <option key={pIdx} value={pIdx}>
                        {p.right}
                      </option>
                    ))}
                  </select>
                  {isExerciseFinished && (isMatch ? <CheckCircle size={16} color="var(--success)" /> : <XCircle size={16} color="var(--error)" />)}
                </div>
              );
            })}
          </div>
        )}

        {/* DISCURSIVA */}
        {q.type === 'discursive' && (
          <textarea
            value={studentAns || ''}
            onChange={(e) => setResposta(qKey, e.target.value)}
            disabled={isExerciseFinished}
            rows={4}
            placeholder="Digite sua resposta..."
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              background: 'var(--bg-dark)',
              color: 'var(--text)',
              border: '1px solid var(--glass-border)',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        )}

        {/* FEEDBACK PÓS-ENVIO (aluno) — gabarito oficial + explicação */}
        {isExerciseFinished && !correct && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.85rem 1rem',
              background: 'rgba(239, 68, 68, 0.07)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              fontSize: '0.9rem',
              lineHeight: 1.5
            }}
          >
            <strong style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <XCircle size={14} /> Resposta correta:
            </strong>
            <span style={{ marginTop: '0.4rem', display: 'block' }}>{getOfficialAnswer(q)}</span>
            {q.explanation && (
              <span
                style={{
                  marginTop: '0.5rem',
                  display: 'block',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic'
                }}
              >
                {q.explanation}
              </span>
            )}
          </div>
        )}

        {/* GABARITO VISÍVEL PARA PROFESSOR */}
        {mode === 'professor' && showGabaritoProfessor && !isExerciseFinished && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: 'rgba(var(--primary-rgb), 0.08)',
              border: '1px solid rgba(var(--primary-rgb), 0.25)',
              borderRadius: '10px',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <CheckCircle size={14} color="var(--primary)" />
            <span>
              <strong>Gabarito oficial:</strong> {getOfficialAnswer(q)}
            </span>
          </div>
        )}

        {/* GABARITO SEMPRE VISÍVEL PARA ADMIN — em exercícios novos E já resolvidos */}
        {mode === 'admin' && !editingGabarito && (
          <div
            data-testid={`admin-gabarito-${qKey}`}
            style={{
              marginTop: '1rem',
              padding: '0.85rem 1rem',
              background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.12), rgba(var(--primary-rgb), 0.04))',
              border: '1px solid rgba(var(--primary-rgb), 0.4)',
              borderLeft: '4px solid var(--primary)',
              borderRadius: '10px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              flexWrap: 'wrap'
            }}
          >
            <ClipboardList size={16} color="var(--primary)" />
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--primary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Gabarito Oficial
              </strong>
              <span style={{ color: 'var(--text)' }}>{getOfficialAnswer(q)}</span>
            </span>
            {q.explanation && (
              <span
                style={{
                  width: '100%',
                  marginTop: '0.4rem',
                  paddingTop: '0.6rem',
                  borderTop: '1px dashed rgba(var(--primary-rgb), 0.25)',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                  fontSize: '0.82rem',
                  lineHeight: 1.5
                }}
              >
                💡 {q.explanation}
              </span>
            )}
          </div>
        )}

        {/* GABARITO EDITÁVEL PARA ADMIN */}
        {mode === 'admin' && editingGabarito && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'rgba(var(--primary-rgb), 0.05)',
              border: '1px dashed rgba(var(--primary-rgb), 0.4)',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: 'var(--primary)',
                letterSpacing: '0.5px'
              }}
            >
              Editando gabarito oficial
            </span>

            {(q.type === 'multiple_choice' || !q.type) && (
              <select
                value={q.correct ?? 0}
                onChange={(e) => updateGabarito(idx, { correct: Number(e.target.value) })}
                style={{
                  padding: '0.5rem',
                  background: 'var(--bg-dark)',
                  color: 'var(--text)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px'
                }}
              >
                {q.options?.map((opt, oIdx) => (
                  <option key={oIdx} value={oIdx}>
                    {String.fromCharCode(65 + oIdx)} — {opt}
                  </option>
                ))}
              </select>
            )}

            {q.type === 'true_false' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => updateGabarito(idx, { isTrue: v })}
                    className={`btn ${q.isTrue === v ? 'btn-primary' : 'btn-outline'}`}
                    style={{ width: 'auto' }}
                  >
                    {v ? 'Verdadeiro' : 'Falso'}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'discursive' && (
              <input
                type="text"
                value={q.expectedAnswer || ''}
                onChange={(e) => updateGabarito(idx, { expectedAnswer: e.target.value })}
                placeholder="Resposta esperada..."
                style={{
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg-dark)',
                  color: 'var(--text)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px'
                }}
              />
            )}

            <input
              type="text"
              value={q.explanation || ''}
              onChange={(e) => updateGabarito(idx, { explanation: e.target.value })}
              placeholder="Comentário/explicação pedagógica (opcional)"
              style={{
                padding: '0.5rem 0.75rem',
                background: 'var(--bg-dark)',
                color: 'var(--text)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                fontSize: '0.85rem'
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────
  // 7. Renderização principal por modo
  // ────────────────────────────────────────────────────────────
  if (!questions || questions.length === 0) {
    return (
      <div
        style={{
          padding: '2.5rem',
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: '20px',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}
      >
        <AlertCircle size={36} color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
        <p>Esta lição ainda não possui exercícios cadastrados.</p>
        {mode === 'admin' && (
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Clique em &ldquo;Cadastrar Gabarito&rdquo; abaixo para começar.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="exercicios-component">
      {/* ──────── BARRA DE AÇÕES POR PERFIL ──────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: '14px',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Award size={20} color="var(--primary)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {questions.length} {questions.length === 1 ? 'exercício' : 'exercícios'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {mode === 'admin' && 'Modo Gerenciamento — você pode editar o gabarito oficial.'}
              {mode === 'professor' && 'Modo Conferência — visualização com gabarito para consulta.'}
              {mode === 'student' && 'Modo Prática — sem efeito avaliativo, apenas para autoavaliação.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {mode === 'admin' &&
            (editingGabarito ? (
              <>
                <button
                  onClick={() => {
                    setEditingGabarito(false);
                    setQuestions(initialQuestions || []);
                  }}
                  className="btn btn-outline"
                  style={{ width: 'auto' }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarGabarito}
                  className="btn btn-primary"
                  style={{ width: 'auto' }}
                  disabled={saving}
                >
                  {saving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
                  {saving ? 'Salvando...' : 'Salvar Gabarito'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditingGabarito(true)}
                className="btn btn-primary"
                style={{ width: 'auto' }}
              >
                <Edit3 size={16} /> Editar Gabarito
              </button>
            ))}

          {mode === 'professor' && (
            <button
              onClick={() => setShowGabaritoProfessor((v) => !v)}
              className="btn btn-outline"
              style={{ width: 'auto' }}
            >
              {showGabaritoProfessor ? <EyeOff size={16} /> : <Eye size={16} />}
              {showGabaritoProfessor ? 'Ocultar Gabarito' : 'Mostrar Gabarito'}
            </button>
          )}

          {mode === 'student' &&
            (exercicioEnviado ? (
              <button onClick={handleRefazer} className="btn btn-outline" style={{ width: 'auto' }}>
                <RefreshCw size={16} /> Refazer Exercícios
              </button>
            ) : (
              <button onClick={handleEnviarExercicios} className="btn btn-primary" style={{ width: 'auto' }}>
                <Send size={16} /> Verificar Respostas (Pedagógico)
              </button>
            ))}
        </div>
      </div>

      {/* ──────── PAINEL DE GABARITO COMPLETO PARA ADMIN (sempre visível) ──────── */}
      {mode === 'admin' && !editingGabarito && (
        <div
          className="painel-gabarito-admin"
          style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.08), rgba(99, 102, 241, 0.05))',
            border: '1px solid rgba(var(--primary-rgb), 0.3)',
            borderRadius: '16px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--primary)'
              }}
            >
              <ClipboardList size={20} /> Gabarito Oficial — Visão Geral
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontWeight: 600
              }}
            >
              {questions.length} {questions.length === 1 ? 'questão cadastrada' : 'questões cadastradas'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '0.75rem'
            }}
          >
            {questions.map((q, idx) => {
              const qKey = q.id || String(idx);
              const typeLabel =
                q.type === 'true_false' ? 'V/F' :
                q.type === 'matching' ? 'Associação' :
                q.type === 'discursive' ? 'Dissertativa' : 'Múltipla Escolha';

              const compactAnswer =
                q.type === 'multiple_choice' || !q.type
                  ? q.options?.[q.correct ?? 0] || '—'
                  : q.type === 'true_false'
                  ? (q.isTrue ? 'Verdadeiro' : 'Falso')
                  : q.type === 'matching'
                  ? `${q.matchingPairs?.length || 0} pares`
                  : q.expectedAnswer
                  ? (q.expectedAnswer.length > 40 ? q.expectedAnswer.substring(0, 40) + '…' : q.expectedAnswer)
                  : '—';

              return (
                <div
                  key={qKey}
                  style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--glass-border)',
                    borderLeft: '3px solid var(--primary)',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)' }}>
                      Q{idx + 1}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'var(--text-muted)',
                        fontWeight: 700
                      }}
                    >
                      {typeLabel}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.4
                    }}
                  >
                    {q.text}
                  </span>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text)',
                      fontWeight: 600,
                      marginTop: '0.25rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px dashed var(--glass-border)'
                    }}
                  >
                    ✓ {compactAnswer}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mensagem de feedback do salvamento */}
      {saveMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            background: saveMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${saveMessage.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
            color: saveMessage.type === 'success' ? 'var(--success)' : 'var(--error)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {saveMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {saveMessage.text}
        </div>
      )}

      {/* ──────── PAINEL DE GABARITO REALTIME (ALUNO APÓS ENVIO) ──────── */}
      {mode === 'student' && exercicioEnviado && (
        <div
          className="painel-gabarito-realtime"
          style={{
            padding: '1.5rem',
            background: 'rgba(var(--primary-rgb), 0.07)',
            border: '1px solid rgba(var(--primary-rgb), 0.3)',
            borderRadius: '16px',
            marginBottom: '2rem'
          }}
        >
          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <CheckCircle2 size={20} color="var(--primary)" />
            Resultado do Exercício (Autoavaliação)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
            Confira abaixo seu desempenho. Verde indica acerto e vermelho indica erro — logo após
            cada questão errada você verá a resposta correta oficial. Esta ação é puramente
            pedagógica, <strong>não impacta sua nota final nem bloqueia seu progresso</strong>.
          </p>
          <div
            style={{
              marginTop: '0.85rem',
              display: 'flex',
              gap: '1.5rem',
              fontSize: '0.85rem'
            }}
          >
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>
              <CheckCircle size={14} style={{ verticalAlign: 'middle' }} />{' '}
              {questions.filter((q, i) => isCorrect(q, q.id || String(i))).length} acertos
            </span>
            <span style={{ color: 'var(--error)', fontWeight: 700 }}>
              <XCircle size={14} style={{ verticalAlign: 'middle' }} />{' '}
              {questions.filter((q, i) => !isCorrect(q, q.id || String(i))).length} erros
            </span>
          </div>
        </div>
      )}

      {/* ──────── LISTA DE PERGUNTAS ──────── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {questions.map((q, idx) => renderQuestion(q, idx))}
      </div>
    </div>
  );
};

export default ExerciciosComponent;
