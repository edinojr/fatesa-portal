import React from 'react'

interface ModalityBadgeProps {
  ensinoTipo?: string | null
  size?: 'sm' | 'md'
}

const ModalityBadge: React.FC<ModalityBadgeProps> = ({ ensinoTipo, size = 'sm' }) => {
  const tipo = (ensinoTipo || 'online').toLowerCase()
  const isOnline = tipo === 'online' || tipo === 'ead'
  const label = isOnline ? 'Online' : 'Presencial'
  const color = isOnline ? '#3b82f6' : '#f59e0b'
  const bg = isOnline ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)'
  const fontSize = size === 'sm' ? '0.6rem' : '0.7rem'
  const padding = size === 'sm' ? '0.15rem 0.5rem' : '0.25rem 0.65rem'

  return (
    <span
      title={`Modalidade do módulo: ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color,
        background: bg,
        border: `1px solid ${color}33`,
        padding,
        borderRadius: '999px',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: color, display: 'inline-block',
      }} />
      {label}
    </span>
  )
}

export default ModalityBadge