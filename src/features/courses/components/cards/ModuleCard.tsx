import React from 'react'
import { Eye, CheckSquare, CheckCircle, BookOpen, Clock } from 'lucide-react'
import BaseCard from './BaseCard'
import ContentCarousel from './ContentCarousel'

export interface ModuleCardProps {
  book: any
  index?: number
  completionCount?: number
  gabaritoStats?: { filled: number; total: number }
  showReleaseControls?: boolean
  releaseControls?: React.ReactNode
  onOpenLessons?: () => void
  showReleaseBadges?: (lesson: any) => boolean
  headerExtra?: React.ReactNode
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  book,
  index,
  completionCount = 0,
  gabaritoStats,
  showReleaseControls = true,
  releaseControls,
  onOpenLessons,
  showReleaseBadges,
  headerExtra,
}) => {
  const lessons: any[] = book.aulas || []
  const totalLessons = lessons.length
  const gab = gabaritoStats || { filled: 0, total: 0 }
  const gabPercent = gab.total > 0 ? Math.round((gab.filled / gab.total) * 100) : 0
  const gabComplete = gab.total > 0 && gab.filled === gab.total

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <BaseCard
        href={onOpenLessons ? '#' : `/book/${book.id}`}
        capaUrl={book.capa_url}
        titulo={book.titulo}
        subtitulo={`${totalLessons} ${totalLessons === 1 ? 'aula' : 'aulas'}${completionCount > 0 ? ` • ${completionCount} concluíram` : ''}`}
        badge={
          gab.total > 0
            ? {
                label: `Gabarito ${gab.filled}/${gab.total}`,
                color: gabComplete ? '#22c55e' : 'var(--text-muted)',
                bg: gabComplete ? 'rgba(34,197,94,0.12)' : 'var(--glass)',
              }
            : undefined
        }
        accentColor={gabComplete ? '#22c55e' : 'var(--primary)'}
        onClick={onOpenLessons ? (e) => { e.preventDefault(); onOpenLessons(); } : undefined}
      >
        {gab.total > 0 && (
          <div style={{ marginTop: '0.3rem' }}>
            <div
              style={{
                height: '4px',
                background: 'var(--glass-border)',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${gabPercent}%`,
                  background: gabComplete ? '#22c55e' : 'var(--primary)',
                  borderRadius: '10px',
                  transition: 'width 0.4s',
                }}
              />
            </div>
          </div>
        )}
        {headerExtra}
      </BaseCard>

      {showReleaseControls && releaseControls}

      {totalLessons > 0 ? (
        <ContentCarousel items={lessons} showReleaseBadges={showReleaseBadges} />
      ) : (
        <div
          style={{
            padding: '1rem',
            textAlign: 'center',
            background: 'var(--glass)',
            border: '1px dashed var(--glass-border)',
            borderRadius: '10px',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
          }}
        >
          Nenhuma aula cadastrada neste módulo.
        </div>
      )}
    </div>
  )
}

export default ModuleCard
