import React, { useState, useMemo } from 'react';
import {
  Award,
  Trash2,
  Loader2,
  Save,
  Plus,
  Unlock,
  Lock,
  AlertCircle,
  BookOpen,
  FileText,
  User,
  MapPin,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Settings,
} from 'lucide-react';
import StudentProgressCard from './StudentProgressCard';
import ExamAnswerKeyModal from './ExamAnswerKeyModal';

interface StudentDetailsModalProps {
  student: any;
  onClose: () => void;
  atividades?: any[];
  notas?: any[];
  courseSubmissions?: any[];
  expandedSub?: string | null;
  handleExpandSub?: (sub: any) => void;
  questionEvaluations?: Record<string, boolean>;
  toggleEvaluation?: (sub: any, qId: string, correct: boolean) => void;
  handleLancarNota?: (e: React.FormEvent<HTMLFormElement>) => void;
  handleDeleteSubmission: (id: string) => void;
  actionLoading: string | null;
  isProfessor: boolean;
  studentCourseLivros: any[];
  studentExceptions: string[];
  handleToggleException: (sId: string, lId: string, current: boolean) => void;
  studentExams?: any[];
  studentExamExceptions?: string[];
  handleToggleExamException?: (sId: string, aulaId: string, current: boolean) => void;
  studentExclusions?: string[];
  handleToggleExclusion?: (sId: string, lId: string, current: boolean) => void;
  allAulas?: any[];
  progressoIds?: Set<string>;
  historicoNotas?: any[];
}

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  student,
  onClose,
  atividades = [],
  notas = [],
  courseSubmissions = [],
  expandedSub,
  handleExpandSub,
  questionEvaluations = {},
  toggleEvaluation,
  handleLancarNota,
  handleDeleteSubmission,
  actionLoading,
  isProfessor,
  studentCourseLivros = [],
  studentExceptions = [],
  handleToggleException,
  studentExams = [],
  studentExamExceptions = [],
  handleToggleExamException,
  studentExclusions = [],
  handleToggleExclusion,
  allAulas = [],
  progressoIds = new Set<string>(),
  historicoNotas = [],
}) => {
  const [activeTab, setActiveTab] = useState<'progresso' | 'submissoes' | 'gestao'>('progresso');
  const [selectedExamSub, setSelectedExamSub] = useState<any | null>(null);

  // Ordena os livros por ordem curricular
  const sortedLivros = useMemo(() => {
    return [...studentCourseLivros].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }, [studentCourseLivros]);

  // Estatísticas globais do aluno
  const studentStats = useMemo(() => {
    let aprovados = 0;
    let recuperacao = 0;
    let dp = 0;
    let totalExercicios = 0;
    let concluidosExercicios = 0;

    sortedLivros.forEach((livro) => {
      const mAulas = allAulas.filter((a) => a.livro_id === livro.id);
      const mExercicios = mAulas.filter(
        (a) =>
          (a.tipo === 'exercicio' || a.tipo === 'atividade') &&
          !a.is_bloco_final &&
          a.tipo !== 'prova' &&
          a.tipo !== 'avaliacao'
      );
      totalExercicios += mExercicios.length;

      mExercicios.forEach((ex) => {
        if (
          progressoIds.has(ex.id) ||
          courseSubmissions.some((s) => s.aula_id === ex.id && (s.status === 'corrigida' || s.status === 'concluido'))
        ) {
          concluidosExercicios++;
        }
      });

      const moduloSubs = courseSubmissions.filter(
        (s) => s.aulas?.livro_id === livro.id || s.livro_id === livro.id || mAulas.some((a) => a.id === s.aula_id)
      );

      const histNota = historicoNotas.find(
        (h) => (h.modulo_nome || '').toLowerCase().trim() === (livro.titulo || '').toLowerCase().trim()
      );

      const notasDoModulo = moduloSubs
        .filter((s) => s.nota !== undefined && s.nota !== null)
        .map((s) => Number(s.nota));

      if (histNota && histNota.nota != null) {
        notasDoModulo.push(Number(histNota.nota));
      }

      const best = notasDoModulo.length > 0 ? Math.max(...notasDoModulo) : -1;
      const v3Sub = moduloSubs.find(
        (s) => (s.aulas?.versao === 3 || s.versao === 3) && s.nota != null
      );

      if (best >= 7.0) {
        aprovados++;
      } else if (v3Sub && Number(v3Sub.nota) < 7.0) {
        dp++;
      } else if (notasDoModulo.some((n) => n < 7.0)) {
        recuperacao++;
      }
    });

    return {
      totalModulos: sortedLivros.length,
      aprovados,
      recuperacao,
      dp,
      totalExercicios,
      concluidosExercicios,
    };
  }, [sortedLivros, allAulas, progressoIds, courseSubmissions, historicoNotas]);

  return (
    <>
      <div
        className="modal-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9998,
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
            maxWidth: '1050px',
            width: '98%',
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
          {/* HEADER PRINCIPAL */}
          <div
            style={{
              padding: '1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'linear-gradient(135deg, rgba(0, 86, 179, 0.2) 0%, rgba(15, 23, 42, 0.95) 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1rem',
            }}
          >
            <div>
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
                  Ficha do Aluno
                </span>
                {student.nucleos?.nome && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.65rem',
                      borderRadius: '20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#cbd5e1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <MapPin size={12} /> {student.nucleos.nome}
                  </span>
                )}
              </div>

              <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
                {student.nome}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.82rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                <span>{student.email}</span>
                {student.curso_id && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#60a5fa' }}>
                    <BookOpen size={14} /> Curso Vinculado
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Fechar"
            >
              <Plus style={{ transform: 'rotate(45deg)' }} size={20} />
            </button>
          </div>

          {/* KPI RESUMO ACADÊMICO */}
          <div
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>
                Total Módulos
              </span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                {studentStats.totalModulos}
              </div>
            </div>

            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '12px',
                backgroundColor: 'rgba(0, 86, 179, 0.12)',
                border: '1.5px solid #0056b3',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#60a5fa' }}>
                Aprovados
              </span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#60a5fa', marginTop: '2px' }}>
                {studentStats.aprovados}
              </div>
            </div>

            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1.5px solid #f59e0b',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#fbbf24' }}>
                Recuperação
              </span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fbbf24', marginTop: '2px' }}>
                {studentStats.recuperacao}
              </div>
            </div>

            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '12px',
                backgroundColor: 'rgba(220, 38, 38, 0.12)',
                border: '1.5px solid #dc2626',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#f87171' }}>
                Dependência (DP)
              </span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f87171', marginTop: '2px' }}>
                {studentStats.dp}
              </div>
            </div>

            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>
                Exercícios Concluídos
              </span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                {studentStats.concluidosExercicios} <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>/ {studentStats.totalExercicios}</span>
              </div>
            </div>
          </div>

          {/* TABS NAVEGAÇÃO */}
          <div
            style={{
              padding: '0 1.5rem',
              display: 'flex',
              gap: '0.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
            }}
          >
            <button
              onClick={() => setActiveTab('progresso')}
              style={{
                padding: '0.85rem 1.25rem',
                background: 'none',
                border: 'none',
                borderBottom: `3px solid ${activeTab === 'progresso' ? '#0056b3' : 'transparent'}`,
                color: activeTab === 'progresso' ? '#60a5fa' : '#94a3b8',
                fontWeight: activeTab === 'progresso' ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
              }}
            >
              <Layers size={16} /> Progresso por Módulo ({sortedLivros.length})
            </button>

            <button
              onClick={() => setActiveTab('submissoes')}
              style={{
                padding: '0.85rem 1.25rem',
                background: 'none',
                border: 'none',
                borderBottom: `3px solid ${activeTab === 'submissoes' ? '#0056b3' : 'transparent'}`,
                color: activeTab === 'submissoes' ? '#60a5fa' : '#94a3b8',
                fontWeight: activeTab === 'submissoes' ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
              }}
            >
              <FileText size={16} /> Fichário & Submissões ({courseSubmissions.length})
            </button>

            {isProfessor && (
              <button
                onClick={() => setActiveTab('gestao')}
                style={{
                  padding: '0.85rem 1.25rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: `3px solid ${activeTab === 'gestao' ? '#0056b3' : 'transparent'}`,
                  color: activeTab === 'gestao' ? '#60a5fa' : '#94a3b8',
                  fontWeight: activeTab === 'gestao' ? 800 : 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                }}
              >
                <Settings size={16} /> Gestão & Liberações
              </button>
            )}
          </div>

          {/* CONTEÚDO SCROLLÁVEL */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {/* TAB 1: PROGRESSO POR MÓDULO (1 CARD POR MÓDULO COM FOTO) */}
            {activeTab === 'progresso' && (
              <div>
                {sortedLivros.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94a3b8' }}>
                    <BookOpen size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                      Nenhum módulo cadastrado para o curso deste aluno.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                      gap: '1.5rem',
                    }}
                  >
                    {sortedLivros.map((livro) => {
                      const isAuthorized = studentExceptions.includes(livro.id);

                      return (
                        <StudentProgressCard
                          key={livro.id}
                          livro={livro}
                          aulas={allAulas}
                          progressoIds={progressoIds}
                          submissions={courseSubmissions}
                          historicoNotas={historicoNotas}
                          onOpenExam={(sub) => setSelectedExamSub(sub)}
                          isAuthorized={isAuthorized}
                          onToggleAuthorization={
                            isProfessor ? () => handleToggleException(student.id, livro.id, isAuthorized) : undefined
                          }
                          actionLoading={actionLoading}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: FICHÁRIO & SUBMISSÕES */}
            {activeTab === 'submissoes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ color: '#60a5fa', margin: '0 0 0.85rem 0', fontSize: '1rem', fontWeight: 800 }}>
                    Atividades e Avaliações Enviadas no Portal ({courseSubmissions.length})
                  </h4>

                  {courseSubmissions.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      O aluno ainda não enviou atividades dos cursos no portal.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {courseSubmissions.map((sub) => {
                        const isGradeApproved = (sub.nota ?? 0) >= 7.0;

                        return (
                          <div
                            key={sub.id}
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              padding: '1rem',
                              borderRadius: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div
                                style={{ cursor: 'pointer', flex: 1 }}
                                onClick={() => handleExpandSub && handleExpandSub(sub)}
                              >
                                <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>
                                  {sub.aulas?.titulo || 'Atividade'}
                                </strong>
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                                  Enviado em: {new Date(sub.created_at).toLocaleDateString('pt-BR')} • Status: {sub.status}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                  style={{
                                    fontSize: '1.15rem',
                                    fontWeight: 900,
                                    color: sub.status === 'pendente' ? '#eab308' : isGradeApproved ? '#60a5fa' : '#f87171',
                                    backgroundColor:
                                      sub.status === 'pendente'
                                        ? 'rgba(234, 179, 8, 0.15)'
                                        : isGradeApproved
                                        ? 'rgba(0, 86, 179, 0.15)'
                                        : 'rgba(220, 38, 38, 0.15)',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '8px',
                                    border: `1px solid ${
                                      sub.status === 'pendente'
                                        ? '#eab308'
                                        : isGradeApproved
                                        ? '#0056b3'
                                        : '#dc2626'
                                    }`,
                                  }}
                                >
                                  {sub.status === 'pendente' ? 'Pendente' : Number(sub.nota || 0).toFixed(1)}
                                </div>

                                <button
                                  onClick={() => setSelectedExamSub(sub)}
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '8px',
                                    backgroundColor: '#0056b3',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                  }}
                                  title="Ver Gabarito Completo"
                                >
                                  <FileText size={13} /> Gabarito
                                </button>

                                {isProfessor && (
                                  <button
                                    onClick={() => handleDeleteSubmission(sub.id)}
                                    disabled={actionLoading === `delete_sub_${sub.id}`}
                                    style={{
                                      padding: '0.35rem 0.6rem',
                                      borderRadius: '8px',
                                      backgroundColor: 'rgba(220, 38, 38, 0.15)',
                                      color: '#f87171',
                                      border: '1px solid rgba(220, 38, 38, 0.3)',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                    }}
                                    title="Excluir submissão e retornar à base"
                                  >
                                    {actionLoading === `delete_sub_${sub.id}` ? (
                                      <Loader2 className="spinner" size={13} />
                                    ) : (
                                      <Trash2 size={13} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* NOTAS MANUAIS DO PÓLO */}
                <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <h4 style={{ margin: '0 0 0.85rem 0', color: '#60a5fa', fontSize: '0.95rem' }}>
                    Notas Manuais do Pólo
                  </h4>
                  {notas.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                      Sem notas de atividades do pólo lançadas.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {notas.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.75rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '8px',
                          }}
                        >
                          <div>
                            <strong>{n.atividades?.titulo}</strong>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{n.feedback}</div>
                          </div>
                          <div
                            style={{
                              fontSize: '1.2rem',
                              fontWeight: 800,
                              color: n.nota >= 7 ? '#60a5fa' : '#f87171',
                            }}
                          >
                            {Number(n.nota).toFixed(1)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* FORMULÁRIO PARA LANÇAR NOTA MANUAL */}
                {isProfessor && handleLancarNota && (
                  <div style={{ padding: '1.25rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Lançar / Atualizar Nota Manual</h4>
                    <form onSubmit={handleLancarNota}>
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
                          Selecione a Atividade ou Prova
                        </label>
                        <select name="atividade_id" className="form-control" required style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}>
                          <option value="">-- Escolha a atividade --</option>
                          <optgroup label="Atividades do Pólo (Manuais)">
                            {atividades.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.titulo}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Fichário (Painel do Aluno)">
                            {courseSubmissions.map((s) => (
                              <option key={s.id} value={`course:${s.aulas?.id}`}>
                                {s.aulas?.titulo} ({new Date(s.created_at).toLocaleDateString('pt-BR')})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: '1 1 120px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
                            Nota (0 a 10)
                          </label>
                          <input
                            type="number"
                            name="nota"
                            max="10"
                            min="0"
                            step="0.1"
                            className="form-control"
                            required
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
                          />
                        </div>

                        <div className="form-group" style={{ flex: '2 1 240px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
                            Feedback Adicional
                          </label>
                          <input
                            type="text"
                            name="feedback"
                            className="form-control"
                            placeholder="Excelente desempenho..."
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={actionLoading === 'lancar_nota'}
                          style={{
                            padding: '0.55rem 1.25rem',
                            backgroundColor: '#0056b3',
                            color: '#ffffff',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <Save size={16} /> Salvar Avaliação
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: GESTÃO & LIBERAÇÕES */}
            {activeTab === 'gestao' && isProfessor && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* AUTORIZAÇÃO DE MÓDULOS (EXCEÇÕES) */}
                {studentCourseLivros.length > 0 && (
                  <div
                    style={{
                      padding: '1.25rem',
                      background: 'rgba(0, 86, 179, 0.08)',
                      borderRadius: '14px',
                      border: '1px solid rgba(0, 86, 179, 0.25)',
                    }}
                  >
                    <h4 style={{ color: '#60a5fa', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Unlock size={18} /> Autorização de Acesso (Módulos Anteriores)
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 1rem 0' }}>
                      Ative para permitir que este aluno acesse módulos concluídos antes da sua matrícula ou com dependência.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                      {sortedLivros.map((livro) => {
                        const isAuthorized = studentExceptions.includes(livro.id);
                        return (
                          <div
                            key={livro.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.75rem',
                              background: 'rgba(255,255,255,0.03)',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.05)',
                            }}
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                              {livro.titulo}
                            </span>
                            <button
                              style={{
                                width: 'auto',
                                padding: '0.25rem 0.65rem',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: isAuthorized ? '#10b981' : 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                              onClick={() => handleToggleException(student.id, livro.id, isAuthorized)}
                              disabled={actionLoading === `toggle_exception_${livro.id}`}
                            >
                              {actionLoading === `toggle_exception_${livro.id}` ? (
                                <Loader2 className="spinner" size={12} />
                              ) : isAuthorized ? (
                                'Autorizado'
                              ) : (
                                'Bloqueado'
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* LIBERAÇÃO INDIVIDUAL DE PROVAS (V1, V2, V3) */}
                {studentExams.length > 0 && handleToggleExamException && (
                  <div
                    style={{
                      padding: '1.25rem',
                      background: 'rgba(16, 185, 129, 0.05)',
                      borderRadius: '14px',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <h4 style={{ color: '#10b981', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Unlock size={18} /> Liberação Individual de Provas (V1, V2, V3)
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 1rem 0' }}>
                      Libere avaliações específicas diretamente para este aluno.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {studentExams.map((exam) => {
                        const isReleased = studentExamExceptions.includes(exam.id);
                        const versao = exam.versao || 1;
                        const moduloNome = exam.livros?.titulo || '';

                        return (
                          <div
                            key={exam.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.75rem',
                              background: 'rgba(255,255,255,0.03)',
                              borderRadius: '8px',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                                {exam.titulo || `Prova V${versao}`}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
                                ({moduloNome})
                              </span>
                            </div>
                            <button
                              style={{
                                width: 'auto',
                                padding: '0.3rem 0.8rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: isReleased ? '#10b981' : 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer',
                              }}
                              onClick={() => handleToggleExamException(student.id, exam.id, isReleased)}
                              disabled={actionLoading === `toggle_exam_exception_${exam.id}`}
                            >
                              {actionLoading === `toggle_exam_exception_${exam.id}` ? (
                                <Loader2 className="spinner" size={12} />
                              ) : isReleased ? (
                                <>
                                  <Unlock size={12} /> Liberada
                                </>
                              ) : (
                                <>
                                  <Lock size={12} /> Bloqueada
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CORREÇÃO DE PROVAS INDEVIDAS / FANTASMAS */}
                {courseSubmissions.length > 0 && (
                  <div
                    style={{
                      padding: '1.25rem',
                      background: 'rgba(239, 68, 68, 0.05)',
                      borderRadius: '14px',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <h4 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={18} /> Provas com Respostas Vazias (Fantasmas)
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 1rem 0' }}>
                      Identifique e remova submissões iniciadas sem resposta para retornar a avaliação à base.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {courseSubmissions
                        .filter(
                          (sub) =>
                            (sub.aulas?.tipo === 'prova' || sub.aulas?.tipo === 'avaliacao' || sub.aulas?.is_bloco_final) &&
                            (!sub.respostas || Object.keys(sub.respostas || {}).length === 0)
                        )
                        .map((sub) => (
                          <div
                            key={sub.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.75rem',
                              background: 'rgba(239, 68, 68, 0.08)',
                              borderRadius: '8px',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>
                                ⚠ {sub.aulas?.titulo || 'Avaliação'}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
                                (Sem respostas registradas)
                              </span>
                            </div>
                            <button
                              style={{
                                width: 'auto',
                                padding: '0.3rem 0.8rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Deseja remover esta submissão indevida de "${sub.aulas?.titulo}"? O aluno poderá refazer a avaliação.`
                                  )
                                ) {
                                  handleDeleteSubmission(sub.id);
                                }
                              }}
                              disabled={actionLoading === `delete_sub_${sub.id}`}
                            >
                              {actionLoading === `delete_sub_${sub.id}` ? (
                                <Loader2 className="spinner" size={12} />
                              ) : (
                                'Remover Submissão'
                              )}
                            </button>
                          </div>
                        ))}

                      {courseSubmissions.filter(
                        (sub) =>
                          (sub.aulas?.tipo === 'prova' || sub.aulas?.tipo === 'avaliacao' || sub.aulas?.is_bloco_final) &&
                          (!sub.respostas || Object.keys(sub.respostas || {}).length === 0)
                      ).length === 0 && (
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, textAlign: 'center', padding: '0.5rem' }}>
                          Nenhuma submissão sem respostas encontrada.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER MODAL */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE GABARITO DA PROVA COM AS RESPOSTAS DO ALUNO */}
      {selectedExamSub && (
        <ExamAnswerKeyModal
          submission={selectedExamSub}
          student={student}
          onClose={() => setSelectedExamSub(null)}
          onDeleteSubmission={handleDeleteSubmission}
          actionLoading={actionLoading}
        />
      )}
    </>
  );
};

export default StudentDetailsModal;
