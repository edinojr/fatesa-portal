import React from 'react'
import { Link } from 'react-router-dom'
import { Eye, Lock } from 'lucide-react'
import { getTipoConfig, ROOT_ACTION_LABEL } from './contentTypes'

export interface ContentCardProps {
  lesson: any
  index?: number
  showReleaseBadge?: boolean
  released?: boolean
  actionLabel?: string
  href?: string
  onClick?: () => void
  compact?: boolean
}

const ContentCard: React.FC<ContentCardProps> = ({
  lesson,
  index,
  showReleaseBadge = false,
  released = true,
  actionLabel,
  href,
  onClick,
  compact = false,
}) => {
  const tipoConf = getTipoConfig(lesson.tipo)
  const hasGabarito = Array.isArray(lesson.questionario) && lesson.questionario.length > 0
  const isFinal = !!lesson.is_bloco_final
  const linkTo = href || `/lesson/${lesson.id}`

  const label = actionLabel || ROOT_ACTION_LABEL[tipoConf.root](lesson)

  const isLocked = showReleaseBadge && !released

  return (
    <Link
      to={isLocked ? '#' : linkTo}
      style={{
        display: 'flex',
        flexDirection: 'row',
        background: 'var(--glass)',
        border: `1px solid ${isLocked ? 'var(--glass-border)' : tipoConf.color}33`,
        borderLeft: `4px solid ${tipoConf.color}`,
        borderRadius: '10px',
        padding: compact ? '0.6rem 0.75rem' : '0.75rem 0.9rem',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all 0.2s ease',
        opacity: isLocked ? 0.5 : 1,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        gap: '0.6rem',
        alignItems: 'center',
      }}
      onClick={(e) => isLocked && e.preventDefault()}
      onMouseEnter={(e) => {
        if (!isLocked) {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div
        style={{
          minWidth: compact ? '32px' : '36px',
          height: compact ? '32px' : '36px',
          borderRadius: '8px',
          background: tipoConf.bg,
          border: `1px solid ${tipoConf.color}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: tipoConf.color,
          flexShrink: 0,
        }}
      >
        {tipoConf.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
          {typeof index === 'number' && (
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>
              #{index + 1}
            </span>
          )}
          <h6
            style={{
              fontSize: compact ? '0.78rem' : '0.85rem',
              fontWeight: 600,
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
            title={lesson.titulo}
          >
            {lesson.titulo}
          </h6>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.55rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '1px 6px',
              borderRadius: '4px',
              background: tipoConf.bg,
              color: tipoConf.color,
              border: `1px solid ${tipoConf.color}33`,
              whiteSpace: 'nowrap',
            }}
          >
            {isFinal ? 'AVALIAÇÃO FINAL' : tipoConf.label}
          </span>
          {hasGabarito && (
            <span
              style={{
                fontSize: '0.55rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(34,197,94,0.12)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.25)',
                whiteSpace: 'nowrap',
              }}
            >
              ✓ Gabarito
            </span>
          )}
          {isLocked && (
            <span
              style={{
                fontSize: '0.55rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--text-muted)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                whiteSpace: 'nowrap',
              }}
            >
              <Lock size={8} /> Bloqueado
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {onClick ? (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!isLocked) onClick()
            }}
            disabled={isLocked}
            style={{
              padding: compact ? '0.3rem 0.5rem' : '0.4rem 0.6rem',
              fontSize: '0.65rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              background: 'transparent',
              border: `1px solid ${tipoConf.color}55`,
              borderRadius: '6px',
              color: tipoConf.color,
              cursor: isLocked ? 'not-allowed' : 'pointer',
              opacity: isLocked ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            <Eye size={11} /> {label}
          </button>
        ) : (
          <span
            style={{
              padding: compact ? '0.3rem 0.5rem' : '0.4rem 0.6rem',
              fontSize: '0.65rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              background: 'transparent',
              border: `1px solid ${tipoConf.color}55`,
              borderRadius: '6px',
              color: tipoConf.color,
            }}
          >
            <Eye size={11} /> {label}
          </span>
        )}
      </div>
    </Link>
  )
}

export default ContentCard
