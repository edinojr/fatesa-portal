import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Award,
  AlertCircle,
  FileText,
  Trash2,
  Loader2,
  Calendar,
  User,
  BookOpen,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { matchingPairCorrect } from '../../../services/examCorrection';
import { getExamLabel } from '../../../lib/examRules';

interface ExamAnswerKeyModalProps {
  submission: any;
  student: any;
  onClose: () => void;
  onDeleteSubmission?: (subId: string) => void;
  actionLoading?: string | null;
}

export const ExamAnswerKeyModal: React.FC<ExamAnswerKeyModalProps> = ({
  submission,
  student,
  onClose,
  onDeleteSubmission,
  actionLoading,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'correct' | 'incorrect'>('all');

  if (!submission) return null;

  const aula = submission.aulas || {};
  const questionario: any[] = (Array.isArray(aula.questionario) ? aula.questionario : []).filter(
    (q: any) => q && (q.text || q.prompt || q.pergunta)
  );

  const respostas = submission.respostas || {};
  const nota = typeof submission.nota === 'number' ? submission.nota : parseFloat(submission.nota) || 0;
  const isAprovado = nota >= 7.0;
  const examLabel = getExamLabel(aula);
  const dataEnvio = submission.created_at
    ? new Date(submission.created_at).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Data não registrada';

  // Analisa acertos questão por questão
  const questionResults = questionario.map((q: any, idx: number) => {
    const qKey = q.id || idx;
    const studentAns = respostas[qKey];

    // Manual override if set
    const manualEval = respostas[`${qKey}_avaliacao`];

    let isCorrect = false;
    let earnedPoints = 0;
    const maxPoints = 0.5;

    if (q.type === 'matching' && Array.isArray(q.matchingPairs) && q.matchingPairs.length > 0) {
      let correctPairsCount = 0;
      const pairResults = q.matchingPairs.map((pair: any, mIdx: number) => {
        const pairManual = respostas[`${qKey}_${mIdx}_avaliacao`];
        const correct = pairManual !== undefined ? pairManual === true : matchingPairCorrect(q, mIdx, studentAns);
        if (correct) correctPairsCount++;
        return {
          left: pair.left,
          rightExpected: pair.right,
          selectedRightIdx: studentAns?.[mIdx],
          isCorrect: correct,
        };
      });
      isCorrect = correctPairsCount === q.matchingPairs.length;
      earnedPoints = Math.min(3.0, correctPairsCount * 0.5);
      return {
        question: q,
        index: idx,
        qKey,
        studentAns,
        isCorrect,
        isPartial: !isCorrect && correctPairsCount > 0,
        correctPairsCount,
        totalPairs: q.matchingPairs.length,
        pairResults,
        earnedPoints,
        maxPoints: Math.min(3.0, q.matchingPairs.length * 0.5),
      };
    }

    if (manualEval !== undefined) {
      isCorrect = manualEval === true;
      earnedPoints = isCorrect ? maxPoints : 0;
    } else if (q.type === 'multiple_choice' || !q.type) {
      const targetCorrect = q.correct !== undefined && q.correct !== null ? q.correct : q.correctOption;
      if (studentAns !== undefined && studentAns !== null && targetCorrect !== undefined && targetCorrect !== null) {
        isCorrect = String(studentAns).trim().toLowerCase() === String(targetCorrect).trim().toLowerCase();
        earnedPoints = isCorrect ? maxPoints : 0;
      }
    } else if (q.type === 'true_false') {
      const expectedBool =
        typeof q.isTrue === 'boolean'
          ? q.isTrue
          : q.correctAnswer === true ||
            q.correct === true ||
            String(q.correctAnswer).trim().toUpperCase() === 'V' ||
            String(q.correctAnswer).trim().toLowerCase() === 'verdadeiro';

      const studentBool =
        typeof studentAns === 'boolean'
          ? studentAns
          : studentAns === 'true' || studentAns === 'V' || studentAns === 'VERDADEIRO' || studentAns === 1 || studentAns === '1';

      if (studentAns !== undefined && studentAns !== null) {
        isCorrect = studentBool === expectedBool;
        earnedPoints = isCorrect ? maxPoints : 0;
      }
    } else if (q.type === 'discursive') {
      isCorrect = manualEval === true;
      earnedPoints = isCorrect ? maxPoints : 0;
    }

    return {
      question: q,
      index: idx,
      qKey,
      studentAns,
      isCorrect,
      isPartial: false,
      earnedPoints,
      maxPoints,
    };
  });

  const totalQuestions = questionResults.length;
  const correctCount = questionResults.filter((r) => r.isCorrect).length;
  const incorrectCount = questionResults.filter((r) => !r.isCorrect).length;

  const filteredResults = questionResults.filter((r) => {
    if (filterMode === 'correct') return r.isCorrect;
    if (filterMode === 'incorrect') return !r.isCorrect;
    return true;
  });

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '900px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
      >
        {/* HEADER MODAL */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(135deg, rgba(0, 86, 179, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px',
                  backgroundColor: '#0056b3',
                  color: '#ffffff',
                  letterSpacing: '0.5px',
                }}
              >
                {examLabel}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px',
                  backgroundColor: isAprovado ? 'rgba(0, 86, 179, 0.25)' : 'rgba(220, 38, 38, 0.25)',
                  color: isAprovado ? '#60a5fa' : '#f87171',
                  border: `1px solid ${isAprovado ? '#0056b3' : '#dc2626'}`,
                }}
              >
                {isAprovado ? 'Aprovado' : 'Reprovado / Recuperação'}
              </span>
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              {aula.titulo || 'Gabarito da Avaliação'}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.82rem', color: '#94a3b8', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <User size={14} color="#60a5fa" />
                <strong style={{ color: '#e2e8f0' }}>{student?.nome || 'Aluno'}</strong> ({student?.email || ''})
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} />
                {dataEnvio}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* NOTA EM DESTAQUE */}
            <div
              style={{
                textAlign: 'center',
                padding: '0.6rem 1.2rem',
                borderRadius: '16px',
                backgroundColor: isAprovado ? 'rgba(0, 86, 179, 0.2)' : 'rgba(220, 38, 38, 0.2)',
                border: `2px solid ${isAprovado ? '#0056b3' : '#dc2626'}`,
              }}
            >
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: isAprovado ? '#60a5fa' : '#f87171', letterSpacing: '0.5px' }}>
                Nota Final
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: isAprovado ? '#60a5fa' : '#f87171', lineHeight: 1.1 }}>
                {nota.toFixed(1)}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>de 10.0</div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* STATS BAR & FILTROS */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.82rem' }}>
            <span style={{ color: '#94a3b8' }}>
              Total: <strong style={{ color: '#ffffff' }}>{totalQuestions} questões</strong>
            </span>
            <span style={{ color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}>
              <CheckCircle2 size={15} /> {correctCount} acertos
            </span>
            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}>
              <XCircle size={15} /> {incorrectCount} erros
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setFilterMode('all')}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: filterMode === 'all' ? '#0056b3' : 'rgba(255, 255, 255, 0.1)',
                backgroundColor: filterMode === 'all' ? '#0056b3' : 'transparent',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Todas ({totalQuestions})
            </button>
            <button
              onClick={() => setFilterMode('correct')}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: filterMode === 'correct' ? '#22c55e' : 'rgba(255, 255, 255, 0.1)',
                backgroundColor: filterMode === 'correct' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                color: filterMode === 'correct' ? '#22c55e' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Acertos ({correctCount})
            </button>
            <button
              onClick={() => setFilterMode('incorrect')}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: filterMode === 'incorrect' ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                backgroundColor: filterMode === 'incorrect' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                color: filterMode === 'incorrect' ? '#ef4444' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Erros ({incorrectCount})
            </button>
          </div>
        </div>

        {/* LISTA DE QUESTÕES COM GABARITO E RESPOSTAS */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
              <HelpCircle size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>Nenhuma questão encontrada para este filtro.</p>
            </div>
          ) : (
            filteredResults.map((result) => {
              const { question: q, index, studentAns, isCorrect, isPartial, earnedPoints, maxPoints } = result;
              const qType = q.type || 'multiple_choice';

              return (
                <div
                  key={q.id || index}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '16px',
                    border: `1.5px solid ${
                      isCorrect
                        ? 'rgba(34, 197, 94, 0.35)'
                        : isPartial
                        ? 'rgba(234, 179, 8, 0.35)'
                        : 'rgba(239, 68, 68, 0.35)'
                    }`,
                    overflow: 'hidden',
                  }}
                >
                  {/* BARRA SUPERIOR DA QUESTÃO */}
                  <div
                    style={{
                      padding: '0.75rem 1.25rem',
                      backgroundColor: isCorrect
                        ? 'rgba(34, 197, 94, 0.08)'
                        : isPartial
                        ? 'rgba(234, 179, 8, 0.08)'
                        : 'rgba(239, 68, 68, 0.08)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#ffffff' }}>
                        Questão {index + 1}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          color: '#94a3b8',
                        }}
                      >
                        {qType === 'multiple_choice'
                          ? 'Múltipla Escolha'
                          : qType === 'true_false'
                          ? 'Verdadeiro ou Falso'
                          : qType === 'matching'
                          ? 'Relacione as Colunas'
                          : 'Dissertativa'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: isCorrect ? '#22c55e' : isPartial ? '#eab308' : '#ef4444',
                        }}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 size={16} /> Acertou (+{earnedPoints.toFixed(1)} pt)
                          </>
                        ) : isPartial ? (
                          <>
                            <CheckCircle2 size={16} /> Parcial (+{earnedPoints.toFixed(1)} de {maxPoints.toFixed(1)} pts)
                          </>
                        ) : (
                          <>
                            <XCircle size={16} /> Errou (0.0 pt)
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* ENUNCIADO DA QUESTÃO */}
                  <div style={{ padding: '1.25rem' }}>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }}>
                      {q.text}
                    </p>

                    {/* CONFRONTO: RESPOSTA DO ALUNO VS GABARITO OFICIAL */}
                    {qType === 'multiple_choice' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(q.options || []).map((opt: string, optIdx: number) => {
                          const targetCorrect = q.correct !== undefined && q.correct !== null ? q.correct : q.correctOption;
                          const isOptionCorrect = String(targetCorrect) === String(optIdx);
                          const isStudentSelected = studentAns !== undefined && studentAns !== null && String(studentAns) === String(optIdx);

                          let borderCol = 'rgba(255, 255, 255, 0.05)';
                          let bgCol = 'rgba(255, 255, 255, 0.02)';
                          let textCol = '#cbd5e1';

                          if (isOptionCorrect && isStudentSelected) {
                            // Aluno acertou
                            borderCol = '#22c55e';
                            bgCol = 'rgba(34, 197, 94, 0.15)';
                            textCol = '#22c55e';
                          } else if (isStudentSelected && !isOptionCorrect) {
                            // Aluno errou
                            borderCol = '#ef4444';
                            bgCol = 'rgba(239, 68, 68, 0.15)';
                            textCol = '#ef4444';
                          } else if (isOptionCorrect) {
                            // Opção correta que o aluno não marcou
                            borderCol = '#0056b3';
                            bgCol = 'rgba(0, 86, 179, 0.12)';
                            textCol = '#60a5fa';
                          }

                          return (
                            <div
                              key={optIdx}
                              style={{
                                padding: '0.65rem 0.9rem',
                                borderRadius: '10px',
                                border: `1.5px solid ${borderCol}`,
                                backgroundColor: bgCol,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.85rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span
                                  style={{
                                    fontWeight: 800,
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isStudentSelected ? borderCol : 'rgba(255,255,255,0.06)',
                                    color: isStudentSelected ? '#ffffff' : '#94a3b8',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span style={{ color: textCol, fontWeight: isStudentSelected || isOptionCorrect ? 700 : 400 }}>
                                  {opt}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {isStudentSelected && (
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '12px',
                                      backgroundColor: isOptionCorrect ? '#22c55e' : '#ef4444',
                                      color: '#ffffff',
                                    }}
                                  >
                                    Marcou esta {isOptionCorrect ? '✔' : '✖'}
                                  </span>
                                )}
                                {isOptionCorrect && !isStudentSelected && (
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '12px',
                                      backgroundColor: '#0056b3',
                                      color: '#ffffff',
                                    }}
                                  >
                                    Gabarito Correto ✔
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {qType === 'true_false' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                        {/* Resposta do Aluno */}
                        <div
                          style={{
                            padding: '0.85rem 1rem',
                            borderRadius: '12px',
                            backgroundColor: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1.5px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                          }}
                        >
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: isCorrect ? '#22c55e' : '#ef4444', marginBottom: '0.3rem' }}>
                            Resposta do Aluno
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                            {studentAns === undefined || studentAns === null || studentAns === ''
                              ? 'Não respondeu'
                              : studentAns === true || studentAns === 'true' || studentAns === 'V' || studentAns === 'VERDADEIRO' || studentAns === 1
                              ? 'VERDADEIRO'
                              : 'FALSO'}
                          </div>
                        </div>

                        {/* Gabarito Oficial */}
                        <div
                          style={{
                            padding: '0.85rem 1rem',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(0, 86, 179, 0.1)',
                            border: '1.5px solid #0056b3',
                          }}
                        >
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#60a5fa', marginBottom: '0.3rem' }}>
                            Gabarito Oficial
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#60a5fa' }}>
                            {q.isTrue === true || q.correctAnswer === true || q.correct === true || String(q.correctAnswer).toUpperCase() === 'V'
                              ? 'VERDADEIRO'
                              : 'FALSO'}
                          </div>
                        </div>
                      </div>
                    )}

                    {qType === 'matching' && Array.isArray(q.matchingPairs) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>
                          Confronto de Associações (Coluna A → Coluna B):
                        </div>
                        {q.matchingPairs.map((pair: any, mIdx: number) => {
                          const pairResult = result.pairResults?.[mIdx];
                          const isPairOk = pairResult?.isCorrect ?? false;
                          const selectedIdx = studentAns?.[mIdx];
                          const selectedPair = q.matchingPairs[selectedIdx];
                          const selectedText = selectedPair?.right || (selectedIdx !== undefined ? `Item ${selectedIdx}` : 'Não associou');

                          return (
                            <div
                              key={mIdx}
                              style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '10px',
                                backgroundColor: isPairOk ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                border: `1px solid ${isPairOk ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                display: 'grid',
                                gridTemplateColumns: 'minmax(140px, 1fr) auto minmax(140px, 1fr) minmax(140px, 1fr)',
                                gap: '0.75rem',
                                alignItems: 'center',
                                fontSize: '0.82rem',
                              }}
                            >
                              <div style={{ fontWeight: 700, color: '#ffffff' }}>{pair.left}</div>
                              <ChevronRight size={14} style={{ color: isPairOk ? '#22c55e' : '#ef4444' }} />
                              <div>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', display: 'block' }}>
                                  Aluno escolheu:
                                </span>
                                <span style={{ fontWeight: 700, color: isPairOk ? '#22c55e' : '#ef4444' }}>
                                  {selectedText} {isPairOk ? '✔' : '✖'}
                                </span>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', display: 'block' }}>
                                  Correto:
                                </span>
                                <span style={{ fontWeight: 700, color: '#60a5fa' }}>{pair.right}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {qType === 'discursive' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div
                          style={{
                            padding: '0.85rem 1rem',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.3rem' }}>
                            Texto Digitado pelo Aluno:
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#ffffff', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {studentAns || <em style={{ color: '#94a3b8' }}>Aluno não escreveu resposta.</em>}
                          </div>
                        </div>

                        {q.expectedAnswer && (
                          <div
                            style={{
                              padding: '0.85rem 1rem',
                              borderRadius: '12px',
                              backgroundColor: 'rgba(0, 86, 179, 0.08)',
                              border: '1px solid #0056b3',
                            }}
                          >
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#60a5fa', marginBottom: '0.3rem' }}>
                              Resposta Esperada / Critério:
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{q.expectedAnswer}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {onDeleteSubmission ? (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Deseja realmente excluir a submissão de "${aula.titulo || 'Avaliação'}" e retornar a prova para a base?\n\nO aluno poderá refazer a avaliação do zero.`
                  )
                ) {
                  onDeleteSubmission(submission.id);
                  onClose();
                }
              }}
              disabled={actionLoading === `delete_sub_${submission.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                backgroundColor: 'rgba(220, 38, 38, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {actionLoading === `delete_sub_${submission.id}` ? (
                <Loader2 className="spinner" size={14} />
              ) : (
                <Trash2 size={14} />
              )}
              Retornar Prova para a Base (Excluir)
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '10px',
              backgroundColor: '#0056b3',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Fechar Gabarito
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamAnswerKeyModal;
