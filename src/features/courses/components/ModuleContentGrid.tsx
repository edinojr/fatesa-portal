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
  const sortedAulas = useMemo(() => [...aulas].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)), [aulas])

  const isVideoType = (t: string) => t === 'gravada' || t === 'ao_vivo' || t === 'video' || t === 'aula_video'

  const panorama = sortedAulas.find((a: any) => a.ordem === 0 || a.titulo?.trim()?.toLowerCase() === 'panorama')

  const licoes = sortedAulas
    .filter((a: any) => {
      if (a.tipo === 'atividade' || a.tipo === 'exercicio' || a.tipo === 'avaliacao' || a.tipo === 'prova' || a.is_bloco_final) return false
      if (isVideoType(a.tipo)) return false
      if (a.video_url || a.url_video) return false
      if (a.ordem === 0) return false
      if (a.titulo?.trim()?.toLowerCase() === 'panorama') return false
      return true
    })
    .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

  const exercicios = sortedAulas
    .filter((a: any) => (a.tipo === 'atividade' || a.tipo === 'exercicio') && a.tipo !== 'prova' && !a.is_bloco_final)
    .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

  const avaliacoes = sortedAulas
    .filter((a: any) => a.tipo === 'avaliacao' || a.tipo === 'prova' || !!a.is_bloco_final)
    .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

  const watchedIds = (progressoAulas || []).filter((p: any) => p.concluida).map((p: any) => p.aula_id)

  const isCompleted = (item: any) => {
    if (item.tipo === 'atividade' || item.tipo === 'exercicio' || item.tipo === 'avaliacao' || item.tipo === 'prova' || item.is_bloco_final) {
      const s = (atividades || []).find((at: any) => at.aula_id === item.id)
      return !!(s && (s.status === 'corrigida' || s.status === 'concluido'))
    }
    return watchedIds.includes(item.id)
  }

  const isActuallyLocked = (item: any) => {
    const isStaff = profile?.tipo === 'admin' || profile?.tipo === 'suporte' || profile?.tipo === 'professor' ||
                    (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte'].includes(r))
    
    if (!isStaff && !!item.lockedByProfessor) return true
    if (item.status_liberacao === false) return true
    if (item.data_liberacao && new Date(item.data_liberacao) > new Date()) return true
    return false
  }

  const videos = sortedAulas
    .filter((a: any) => isVideoType(a.tipo) || !!a.video_url || !!a.url_video)
    .filter((a: any) => a.tipo !== 'atividade' && a.tipo !== 'exercicio' && a.tipo !== 'avaliacao' && a.tipo !== 'prova' && !a.is_bloco_final)
    .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

  // Avaliações ficam alinhadas no final (linhas 8, 9, 10)
  const avaliacoesGrid = Array.from({ length: 11 }, (_, i) => {
    const pos = i - 8; // posições 8, 9, 10 → índices 0, 1, 2 do array avaliacoes
    return pos >= 0 && pos < avaliacoes.length ? avaliacoes[pos] : null;
  })

  const gridData = {
    lessons: [panorama, ...licoes].slice(0, 11),
    exercises: [null, ...exercicios].slice(0, 11),
    avaliacoes: avaliacoesGrid,
    videos: [null, ...videos].slice(0, 11),
  }

  const maxRows = Math.max(
    gridData.lessons.length,
    gridData.exercises.length,
    gridData.avaliacoes.length,
    gridData.videos.length,
    11
  )

  const renderGridItem = (item: any, label: string) => {
    if (!item) return <div style={{ height: compact ? '40px' : '80px' }} />
    
    const completed = isCompleted(item)
    const locked = isActuallyLocked(item)
    const isAvaliacao = item.tipo === 'avaliacao'
    const isExercicio = item.tipo === 'exercicio' || item.tipo === 'atividade'
    
    // Determine border color based on type
    let borderColor = 'var(--glass-border)'
    if (completed) borderColor = 'var(--success)'
    else if (isAvaliacao) borderColor = '#eab308'
    else if (isExercicio) borderColor = '#10b981'
    
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
          marginBottom: '0.5rem',
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
    )
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(4, 1fr)', 
      gap: compact ? '0.5rem' : '1rem',
      animation: 'fadeIn 0.5s ease-out'
    }}>
      <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: compact ? '0.7rem' : '0.9rem', padding: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Lições</div>
      <div style={{ textAlign: 'center', fontWeight: 800, color: '#10b981', fontSize: compact ? '0.7rem' : '0.9rem', padding: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Exercícios</div>
      <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: compact ? '0.7rem' : '0.9rem', padding: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Vídeos</div>
      <div style={{ textAlign: 'center', fontWeight: 800, color: '#eab308', fontSize: compact ? '0.7rem' : '0.9rem', padding: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Avaliações</div>

      {Array.from({ length: maxRows }).map((_, rowIndex) => (
        <React.Fragment key={rowIndex}>
          {renderGridItem(
            gridData.lessons[rowIndex], 
            rowIndex === 0 ? 'Panorama' : `Lição ${String(rowIndex).padStart(2, '0')}`
          )}
          {renderGridItem(
            gridData.exercises[rowIndex], 
            rowIndex === 0 ? '' : `Exercício ${String(rowIndex).padStart(2, '0')}`
          )}
          {renderGridItem(
            gridData.videos[rowIndex], 
            rowIndex === 0 ? '' : `Vídeo ${String(rowIndex).padStart(2, '0')}`
          )}
          {renderGridItem(
            gridData.avaliacoes[rowIndex], 
            rowIndex === 8 ? 'Avaliação' : rowIndex === 9 ? 'Recuperação' : rowIndex === 10 ? '2ª Recuperação' : ''
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default ModuleContentGrid
