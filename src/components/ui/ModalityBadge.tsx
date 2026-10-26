import React from 'react'

interface ModalityBadgeProps {
  ensinoTipo?: string | null
  size?: 'sm' | 'md'
}

const ModalityBadge: React.FC<ModalityBadgeProps> = ({ ensinoTipo, size = 'sm' }) => {
  const tipo = (ensinoTipo || 'online').toLowerCase()
  const isOnline = tipo === 'online' || tipo === 'ead'
  const label = isOnline ? 'Online' : 'Presencial'
  // Tags azuis com letras brancas para alta legibilidade
  const color = '#ffffff'
  const bg = isOnline ? '#2563eb' : '#0056b3'
  const fontSize = size === 'sm' ? '0.65rem' : '0.75rem'
  const padding = size === 'sm' ? '0.2rem 0.6rem' : '0.3rem 0.75rem'

  return (
    <span
      title={`Modalidade do módulo: ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color,
        background: bg,
        border: '1px solid rgba(255, 255, 255, 0.25)',
        padding,
        borderRadius: '999px',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#ffffff', display: 'inline-block',
      }} />
      {label}
    </span>
  )
}

export default ModalityBadge
