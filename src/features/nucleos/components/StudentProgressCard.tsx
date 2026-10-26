import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Clock,
  Award,
  ChevronRight,
  Unlock,
  Lock,
} from 'lucide-react';
import { getExamVersion, getExamLabel } from '../../../lib/examRules';

interface StudentProgressCardProps {
  livro: any;
  aulas: any[];
  progressoIds: Set<string>;
  submissions: any[];
  historicoNotas?: any[];
  onOpenExam: (submission: any) => void;
  isAuthorized?: boolean;
  onToggleAuthorization?: () => void;
  actionLoading?: string | null;
}

export const StudentProgressCard: React.FC<StudentProgressCardProps> = ({
  livro,
  aulas = [],
  progressoIds,
  submissions = [],
  historicoNotas = [],
  onOpenExam,
  isAuthorized,
  onToggleAuthorization,
  actionLoading,
}) => {
  const [imageError, setImageError] = useState(false);

  // Filtra as aulas deste livro específico
  const moduloAulas = aulas.filter((a) => a.livro_id === livro.id);

  // 1. Exercícios do módulo
  const exercicios = moduloAulas.filter(
    (a) =>
      (a.tipo === 'exercicio' || a.tipo === 'atividade') &&
      !a.is_bloco_final &&
      a.tipo !== 'prova' &&
      a.tipo !== 'avaliacao'
  );

  const exerciciosConcluidos = exercicios.filter(
    (ex) =>
      progressoIds.has(ex.id) ||
      submissions.some((s) => s.aula_id === ex.id && (s.status === 'corrigida' || s.status === 'concluido'))
  );

  const totalExercicios = exercicios.length;
  const numConcluidos = exerciciosConcluidos.length;
  const pctExercicios = totalExercicios > 0 ? Math.round((numConcluidos / totalExercicios) * 100) : 100;

  // 2. Avaliações cadastradas do módulo (V1, V2, V3)
  const avaliacoesAulas = moduloAulas
    .filter((a) => a.tipo === 'prova' || a.tipo === 'avaliacao' || !!a.is_bloco_final)
    .sort((a, b) => getExamVersion(a) - getExamVersion(b));

  // Submissões deste módulo
  const moduloSubs = submissions.filter((s) => {
    if (s.aulas?.livro_id === livro.id || s.livro_id === livro.id) return true;
    if (avaliacoesAulas.some((a) => a.id === s.aula_id)) return true;
    return false;
  });

  // Mapeia tentativas por versão
  const v1Aula = avaliacoesAulas.find((a) => getExamVersion(a) === 1);
  const v2Aula = avaliacoesAulas.find((a) => getExamVersion(a) === 2);
  const v3Aula = avaliacoesAulas.find((a) => getExamVersion(a) === 3);

  const v1Sub = moduloSubs.find((s) => getExamVersion(s.aulas || s) === 1 && (s.status === 'corrigida' || s.nota != null));
  const v2Sub = moduloSubs.find((s) => getExamVersion(s.aulas || s) === 2 && (s.status === 'corrigida' || s.nota != null));
  const v3Sub = moduloSubs.find((s) => getExamVersion(s.aulas || s) === 3 && (s.status === 'corrigida' || s.nota != null));

  // Fallback para histórico de notas se não houver submissão direta
  const histNota = historicoNotas.find(
    (h) => (h.modulo_nome || '').toLowerCase().trim() === (livro.titulo || '').toLowerCase().trim()
  );

  const v1Nota = v1Sub ? Number(v1Sub.nota) : histNota ? Number(histNota.nota) : null;
  const v2Nota = v2Sub ? Number(v2Sub.nota) : null;
  const v3Nota = v3Sub ? Number(v3Sub.nota) : null;

  // Status Acadêmico do Módulo
  let statusGeral: 'aprovado' | 'recuperacao' | 'dp' | 'andamento' | 'nao_iniciado' = 'nao_iniciado';
  let recoveryLabel = 'Avaliação não iniciada';
  let recoveryBadgeColor = '#64748b';

  const bestGrade = Math.max(v1Nota ?? -1, v2Nota ?? -1, v3Nota ?? -1);

  if (bestGrade >= 7.0) {
    statusGeral = 'aprovado';
    if (v1Nota !== null && v1Nota >= 7.0) {
      recoveryLabel = '✔ Aprovado direto na 1ª tentativa (Sem recuperação)';
      recoveryBadgeColor = '#0056b3';
    } else if (v2Nota !== null && v2Nota >= 7.0) {
      recoveryLabel = '✔ Aprovado na Recuperação V2';
      recoveryBadgeColor = '#0056b3';
    } else if (v3Nota !== null && v3Nota >= 7.0) {
      recoveryLabel = '✔ Aprovado na Recuperação 2 V3';
      recoveryBadgeColor = '#0056b3';
    }
  } else if (v3Nota !== null && v3Nota < 7.0) {
    statusGeral = 'dp';
    recoveryLabel = '✖ Módulo em Dependência (Reprovado na V3)';
    recoveryBadgeColor = '#dc2626';
  } else if (v2Nota !== null && v2Nota < 7.0) {
    statusGeral = 'recuperacao';
    recoveryLabel = '⚠ Em 2ª Recuperação: V3 pendente de realização';
    recoveryBadgeColor = '#ea580c';
  } else if (v1Nota !== null && v1Nota < 7.0) {
    statusGeral = 'recuperacao';
    recoveryLabel = '⚠ Em Recuperação: V2 pendente de realização';
    recoveryBadgeColor = '#f59e0b';
  } else if (numConcluidos > 0 || moduloSubs.length > 0) {
    statusGeral = 'andamento';
    recoveryLabel = '○ Em andamento: Exercícios sendo realizados';
    recoveryBadgeColor = '#0284c7';
  }

  // Lista de versões a renderizar
  const versionsData = [
    {
      versao: 1,
      label: 'V1: Avaliação',
      aula: v1Aula,
      sub: v1Sub,
      nota: v1Nota,
      dispensada: false,
    },
    {
      versao: 2,
      label: 'V2: Avaliação Recuperação',
      aula: v2Aula,
      sub: v2Sub,
      nota: v2Nota,
      dispensada: v1Nota !== null && v1Nota >= 7.0,
      bloqueada: v1Nota === null || v1Nota >= 7.0,
    },
    {
      versao: 3,
      label: 'V3: Avaliação Recuperação 2',
      aula: v3Aula,
      sub: v3Sub,
      nota: v3Nota,
      dispensada: bestGrade >= 7.0,
      bloqueada: v2Nota === null || v2Nota >= 7.0,
    },
  ];

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '18px',
        border: `1.5px solid ${
          statusGeral === 'aprovado'
            ? '#0056b3'
            : statusGeral === 'recuperacao'
            ? '#f59e0b'
            : statusGeral === 'dp'
            ? '#dc2626'
            : 'rgba(255, 255, 255, 0.08)'
        }`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* CAPA DO MÓDULO COM FOTO E TÍTULO */}
      <div
        style={{
          position: 'relative',
          height: '160px',
          width: '100%',
          backgroundColor: '#0f172a',
          overflow: 'hidden',
        }}
      >
        {livro.capa_url && !imageError ? (
          <img
            src={livro.capa_url}
            alt={livro.titulo}
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #0056b3 0%, #0f172a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              textAlign: 'center',
            }}
          >
            <BookOpen size={48} color="rgba(255, 255, 255, 0.25)" />
          </div>
        )}

        {/* Gradiente escuro sobre a imagem para garantir legibilidade dos textos */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.4) 60%, rgba(0, 0, 0, 0.2) 100%)',
          }}
        />

        {/* Status Badge no topo direito */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '0.3rem 0.75rem',
              borderRadius: '20px',
              color: '#ffffff',
              backgroundColor:
                statusGeral === 'aprovado'
                  ? '#0056b3'
                  : statusGeral === 'recuperacao'
                  ? '#f59e0b'
                  : statusGeral === 'dp'
                  ? '#dc2626'
                  : statusGeral === 'andamento'
                  ? '#0284c7'
                  : 'rgba(100, 116, 139, 0.8)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            {statusGeral === 'aprovado'
              ? `Aprovado (${bestGrade.toFixed(1)})`
              : statusGeral === 'recuperacao'
              ? 'Em Recuperação'
              : statusGeral === 'dp'
              ? 'Dependência'
              : statusGeral === 'andamento'
              ? 'Em Andamento'
              : 'Não Iniciado'}
          </span>
        </div>

        {/* Título e Ordem do Módulo sobre a capa */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '16px',
            right: '16px',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#60a5fa',
              letterSpacing: '1px',
              display: 'block',
              marginBottom: '2px',
            }}
          >
            Módulo {livro.ordem ?? '•'}
          </span>
          <h4
            style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#ffffff',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={livro.titulo}
          >
            {livro.titulo}
          </h4>
        </div>
      </div>

      {/* CORPO DO CARD */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
        {/* SEÇÃO 1: EXERCÍCIOS CONCLUÍDOS */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen size={14} color="#60a5fa" /> Exercícios Concluídos
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: numConcluidos === totalExercicios && totalExercicios > 0 ? '#22c55e' : '#ffffff',
              }}
            >
              {totalExercicios > 0 ? `${numConcluidos} / ${totalExercicios}` : 'Nenhum exercício'}
            </span>
          </div>

          {/* Barra de Progresso */}
          <div
            style={{
              height: '8px',
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${pctExercicios}%`,
                backgroundColor: numConcluidos === totalExercicios && totalExercicios > 0 ? '#22c55e' : '#0056b3',
                borderRadius: '10px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.68rem', color: '#64748b' }}>
            <span>{pctExercicios}% finalizado</span>
            {numConcluidos === totalExercicios && totalExercicios > 0 && (
              <span style={{ color: '#22c55e', fontWeight: 700 }}>Todos concluídos ✔</span>
            )}
          </div>
        </div>

        {/* SEÇÃO 2: AVALIAÇÕES FEITAS E NOTAS (V1, V2, V3) */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Award size={14} color="#0056b3" /> Avaliações do Módulo
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {versionsData.map((item) => {
              const { versao, label, sub, nota, dispensada, bloqueada } = item;
              const hasTaken = nota !== null;
              const isGradeApproved = hasTaken && nota >= 7.0;

              return (
                <div
                  key={versao}
                  style={{
                    backgroundColor: hasTaken
                      ? isGradeApproved
                        ? 'rgba(0, 86, 179, 0.08)'
                        : 'rgba(220, 38, 38, 0.08)'
                      : 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '10px',
                    border: `1px solid ${
                      hasTaken
                        ? isGradeApproved
                          ? 'rgba(0, 86, 179, 0.3)'
                          : 'rgba(220, 38, 38, 0.3)'
                        : 'rgba(255, 255, 255, 0.05)'
                    }`,
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      {hasTaken ? (
                        sub?.created_at ? (
                          `Feita em ${new Date(sub.created_at).toLocaleDateString('pt-BR')}`
                        ) : (
                          'Nota lançada'
                        )
                      ) : dispensada ? (
                        <span style={{ color: '#64748b' }}>Dispensada (Aprovado na V1)</span>
                      ) : bloqueada ? (
                        <span style={{ color: '#64748b' }}>Aguardando liberação</span>
                      ) : (
                        <span style={{ color: '#eab308' }}>Pendente de realização</span>
                      )}
                    </div>
                  </div>

                  {/* LADO DIREITO: NOTA E BOTÃO GABARITO */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {hasTaken ? (
                      <>
                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 900,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '8px',
                            backgroundColor: isGradeApproved ? 'rgba(0, 86, 179, 0.2)' : 'rgba(220, 38, 38, 0.2)',
                            color: isGradeApproved ? '#60a5fa' : '#f87171',
                            border: `1.5px solid ${isGradeApproved ? '#0056b3' : '#dc2626'}`,
                            minWidth: '45px',
                            textAlign: 'center',
                          }}
                        >
                          {nota.toFixed(1)}
                        </span>

                        {sub && (
                          <button
                            onClick={() => onOpenExam(sub)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '8px',
                              backgroundColor: '#0056b3',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              transition: 'background 0.2s',
                              whiteSpace: 'nowrap',
                            }}
                            title="Abrir a prova com o gabarito das respostas do aluno"
                          >
                            <FileText size={13} />
                            Gabarito
                          </button>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SEÇÃO 3: STATUS DE RECUPERAÇÃO BANNER */}
        <div
          style={{
            marginTop: 'auto',
            padding: '0.65rem 0.9rem',
            borderRadius: '10px',
            backgroundColor: `${recoveryBadgeColor}15`,
            border: `1px solid ${recoveryBadgeColor}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: recoveryBadgeColor === '#0056b3' ? '#60a5fa' : recoveryBadgeColor,
              lineHeight: 1.3,
            }}
          >
            {recoveryLabel}
          </span>

          {onToggleAuthorization && (
            <button
              onClick={onToggleAuthorization}
              disabled={actionLoading === `toggle_exception_${livro.id}`}
              style={{
                background: isAuthorized ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: isAuthorized ? '#22c55e' : '#94a3b8',
                border: `1px solid ${isAuthorized ? '#22c55e' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.65rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              title={isAuthorized ? 'Módulo liberado por exceção' : 'Liberar módulo por exceção'}
            >
              {isAuthorized ? <Unlock size={11} /> : <Lock size={11} />}
              {isAuthorized ? 'Liberado' : 'Bloqueado'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProgressCard;
