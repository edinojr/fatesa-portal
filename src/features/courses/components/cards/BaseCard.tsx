import React from 'react'
import { Link } from 'react-router-dom'
import { Lock, CheckCircle } from 'lucide-react'

export interface BaseCardProps {
  href: string
  capaUrl?: string
  titulo: string
  subtitulo?: string
  badge?: {
    label: string
    color: string
    bg: string
  }
  status?: 'locked' | 'completed' | 'default'
  accentColor?: string
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const BaseCard: React.FC<BaseCardProps> = ({
  href,
  capaUrl,
  titulo,
  subtitulo,
  badge,
  status = 'default',
  accentColor = 'var(--primary)',
  children,
  className,
  style,
}) => {
  const isLocked = status === 'locked'
  const isCompleted = status === 'completed'

  return (
    <Link
      to={isLocked ? '#' : href}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'row',
        background: 'var(--glass)',
        border: `1px solid ${isCompleted ? 'var(--success)' : 'var(--glass-border)'}`,
        borderLeft: `4px solid ${isCompleted ? 'var(--success)' : accentColor}`,
        borderRadius: '14px',
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all 0.2s ease',
        opacity: isLocked ? 0.6 : 1,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        position: 'relative',
        ...style,
      }}
      onClick={(e) => isLocked && e.preventDefault()}
      onMouseEnter={(e) => {
        if (!isLocked) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {capaUrl && (
        <div
          style={{
            width: '80px',
            minHeight: '100px',
            flexShrink: 0,
            background: `url(${capaUrl}) center/cover no-repeat`,
            borderRight: '1px solid var(--glass-border)',
          }}
        />
      )}

      <div
        style={{
          flex: 1,
          padding: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <h4
            style={{
              margin: 0,
              fontSize: '0.9rem',
              fontWeight: 700,
              lineHeight: 1.3,
              color: 'var(--text-main)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            title={titulo}
          >
            {titulo}
          </h4>
          {isLocked && <Lock size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />}
          {isCompleted && <CheckCircle size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />}
        </div>

        {subtitulo && (
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {subtitulo}
          </span>
        )}

        {badge && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.6rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: '6px',
              background: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.color}33`,
              alignSelf: 'flex-start',
              marginTop: '0.2rem',
            }}
          >
            {badge.label}
          </span>
        )}

        {children}
      </div>
    </Link>
  )
}

export default BaseCard
