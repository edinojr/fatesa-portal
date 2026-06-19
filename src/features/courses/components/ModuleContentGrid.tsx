import React, { useMemo } from 'react'
import { Lock, CheckCircle } from 'lucide-react'

interface ModuleContentGridProps {
  aulas: any[]
  progressoAulas: any[]
  atividades: any[]
  profile: any
  onItemClick: (item: any) => void
  compact?: boolean
}

const ModuleContentGrid: React.FC<ModuleContentGridProps> = ({
  aulas,
  progressoAulas,
  atividades,
  profile,
  onItemClick,
  compact = false,
}) => {
  // 1. Ordenação Estrita: Ordem -> ID para garantir consistência absoluta
  const sortedAulas = useMemo(() => {
    return [...aulas].sort((a, b) => {
      const ordA = Number(a.ordem) || 0;
      const ordB = Number(b.ordem) || 0;
      if (ordA !== ordB) return ordA - ordB;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [aulas]);

  const isVideoType = (t: string) => t === 'gravada' || t === 'ao_vivo' || t === 'video' || t === 'aula_video';

  // 2. Extração de Categorias (Mutuamente Exclusivas)
  const panorama = sortedAulas.find((a: any) => a.ordem === 0 || a.titulo?.trim()?.toLowerCase() === 'panorama');

  const licoes = sortedAulas.filter((a: any) => {
    if (a.tipo !== 'licao' && a.tipo !== 'material') return false;
    if (a.ordem === 0 || a.titulo?.trim()?.toLowerCase() === 'panorama') return false;
    return true;
  });

  const exercicios = sortedAulas.filter((a: any) => a.tipo === 'exercicio' || a.tipo === 'atividade');

  const avaliacoes = sortedAulas.filter((a: any) => a.tipo === 'avaliacao' || a.tipo === 'prova' || !!a.is_bloco_final);

  const videos = sortedAulas.filter((a: any) => isVideoType(a.tipo) || a.video_url || a.url_video);

  const watchedIds = (progressoAulas || []).filter((p: any) => p.concluida).map((p: any) => p.aula_id);

  const isCompleted = (item: any) => {
    if (item.tipo === 'atividade' || item.tipo === 'exercicio' || item.tipo === 'avaliacao' || item.tipo === 'prova' || item.is_bloco_final) {
      const s = (atividades || []).find((at: any) => at.aula_id === item.id);
      return !!(s && (s.status === 'corrigida' || s.status === 'concluido'));
    }
    return watchedIds.includes(item.id);
  };

  const isActuallyLocked = (item: any) => {
    const isStaff = profile?.tipo === 'admin' || profile?.tipo === 'suporte' || profile?.tipo === 'professor' ||
                    (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte'].includes(r));
    if (isStaff) return false;
    if ((item.tipo === 'prova' || item.tipo === 'avaliacao' || !!item.is_bloco_final) && (item.versao || 1) > 1) {
      const versao = item.versao || 1;
      const moduleSubs = (atividades || []).filter((s: any) => s.book_id === item.livro_id);
      const examSubs = moduleSubs.filter((s: any) => s.is_bloco_final || s.lesson_type === 'prova' || (s.aulas && /V[1-3]|RECUPERAÇ/i.test(s.aulas.titulo || '')));
      let passedAny = false;
      if (examSubs.length > 0) {
        const highestExam = examSubs.reduce((prev, current) => {
          const prevV = prev.aulas?.versao || 1;
          const currV = current.aulas?.versao || 1;
          return currV >= prevV ? current : prev;
        });
        const minGrade = highestExam.aulas?.min_grade || 7.0;
        if ((highestExam.aulas?.versao || 1) < versao && highestExam.status === 'corrigida' && (highestExam.nota || 0) >= minGrade) {
          passedAny = true;
        }
      }
      if (passedAny) return true;
      const didPrevious = moduleSubs.some((s: any) => {
        const aula = s.aulas;
        return (aula?.tipo === 'prova' || aula?.tipo === 'avaliacao' || aula?.is_bloco_final) && (aula?.versao || 1) === versao - 1 && s.status === 'corrigida';
      });
      if (didPrevious) return false;
    }
    if (!!item.lockedByProfessor) return true;
    if (item.status_liberacao === false) return true;
    if (item.data_liberacao && new Date(item.data_liberacao) > new Date()) return true;
    return false;
  };

  // 3. Montagem Matemática da Grade
  const hasPanorama = !!panorama;
  
  // CORREÇÃO: Coluna de lições só deve incluir o panorama se ele existir, caso contrário começa com as lições
  const colLessons = panorama ? [panorama, ...licoes] : licoes;
  
  // Coluna 2 e 3: Alinhamento horizontal com a primeira lição
  const colExercises = hasPanorama ? [null, ...exercicios] : exercicios;
  const colVideos = hasPanorama ? [null, ...videos] : videos;
  
  const maxContentRows = Math.max(colLessons.length, colExercises.length, colVideos.length, 1);
  
  const totalGridRows = Math.max(maxContentRows, avaliacoes.length, 1);
  const avaliacoesStartRow = totalGridRows - avaliacoes.length;
  
  const normalize = (col: any[]) => {
    const result = [...col];
    while (result.length < totalGridRows) result.push(null);
    return result;
  };

  const gridData = {
    lessons: normalize(colLessons),
    exercises: normalize(colExercises),
    videos: normalize(colVideos),
    avaliacoes: Array.from({ length: totalGridRows }, (_, i) => {
      const pos = i - avaliacoesStartRow;
      return pos >= 0 && pos < avaliacoes.length ? avaliacoes[pos] : null;
    }),
  };

  const renderGridItem = (item: any, label: string) => {
    if (!item) return <div style={{ height: compact ? '45px' : '80px', visibility: 'hidden' }} />;
    const completed = isCompleted(item);
    const locked = isActuallyLocked(item);
    const isAvaliacao = item.tipo === 'avaliacao' || item.tipo === 'prova' || !!item.is_bloco_final;
    const isExercicio = item.tipo === 'exercicio' || item.tipo === 'atividade';
    let borderColor = 'var(--glass-border)';
    if (completed) borderColor = 'var(--success)';
    else if (isAvaliacao) borderColor = '#eab308';
    else if (isExercicio) borderColor = '#10b981';
    return (
      <div 
        onClick={() => !locked && onItemClick(item)}
        style={{ 
          padding: compact ? '0.5rem' : '1rem', 
          background: locked ? 'rgba(255,255,255,0.02)' : 'var(--glass)', 
          border: `1px solid ${borderColor}`,
          borderLeft: `4px solid ${borderColor}`,
          borderRadius: '12px', 
          cursor: locked ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          transition: 'all 0.2s',
          position: 'relative',
          height: compact ? '45px' : '80px',
          overflow: 'hidden'
        }}
      >
        {locked && <Lock size={compact ? 10 : 14} color="var(--text-muted)" />}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ 
            fontSize: compact ? '0.6rem' : '0.75rem', 
            fontWeight: 800, 
            color: isAvaliacao ? '#eab308' : isExercicio ? '#10b981' : 'var(--primary)', 
            textTransform: 'uppercase', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            {label}
          </div>
          <div style={{ 
            fontSize: compact ? '0.7rem' : '0.85rem', 
            color: 'var(--text)', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            {item.titulo}
          </div>
        </div>
        {completed && <CheckCircle size={compact ? 12 : 16} color="var(--success)" />}
      </div>
    );
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(4, 1fr)', 
      gridAutoRows: compact ? '45px' : '80px',
      gap: compact ? '0.5rem' : '1rem',
      animation: 'fadeIn 0.5s ease-out'
    }}>
      <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: compact ? '0.7rem' : '0.9rem', padding: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Lições</div>
      <div style={{ textAlign: 'center', fontWeight: 800, color: '#10b981', fontSize: compact ? '0.7rem' : '0.9rem', padding: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Exercícios</div>
      <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: compact ? '0.7rem' : '0.9rem', padding: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Vídeos</div>
      <div style={{ textAlign: 'center', fontWeight: 800, color: '#eab308', fontSize: compact ? '0.7rem' : '0.9rem', padding: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Avaliações</div>
      {Array.from({ length: totalGridRows }).map((_, rowIndex) => (
        <React.Fragment key={rowIndex}>
          {renderGridItem(
            gridData.lessons[rowIndex], 
            rowIndex === 0 && panorama ? 'Panorama' : `Lição ${String(panorama ? rowIndex : rowIndex + 1).padStart(2, '0')}`
          )}
          {renderGridItem(
            gridData.exercises[rowIndex], 
            `Exercício ${String(rowIndex - (hasPanorama ? 1 : 0) + 1).padStart(2, '0')}`
          )}
          {renderGridItem(
            gridData.videos[rowIndex], 
            `Vídeo ${String(rowIndex - (hasPanorama ? 1 : 0) + 1).padStart(2, '0')}`
          )}
          {(() => {
            const evalIdx = rowIndex - (totalGridRows - avaliacoes.length);
            const label = evalIdx === 0 ? 'Avaliação' : evalIdx === 1 ? 'Recuperação' : evalIdx === 2 ? '2ª Recuperação' : `Avaliação ${evalIdx + 1}`;
            return renderGridItem(gridData.avaliacoes[rowIndex], label);
          })()}
        </React.Fragment>
      ))}
    </div>
  );
}

export default ModuleContentGrid
