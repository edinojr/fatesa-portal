import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ShieldCheck, 
  GraduationCap, 
  Users, 
  BookOpen 
} from 'lucide-react'
import { useProfile } from '../../hooks/useProfile'
import { isUserAdmin } from '../../lib/authUtils'

export interface PanelNavIconsProps {
  currentPanel: 'admin' | 'aluno' | 'professor' | 'coordenador'
  className?: string
  style?: React.CSSProperties
}

interface PanelItem {
  id: 'admin' | 'professor' | 'coordenador' | 'aluno'
  name: string
  shortName: string
  path: string
  icon: React.ReactNode
  activeColor: string
  glowColor: string
}

export const PanelNavIcons: React.FC<PanelNavIconsProps> = ({ currentPanel, className, style }) => {
  const { profile } = useProfile()
  const navigate = useNavigate()

  if (!profile) return null

  const isAdmin = isUserAdmin(profile)
  const roles = (profile.caminhos_acesso as string[]) || []
  const isProfessor = isAdmin || profile.tipo === 'professor' || roles.includes('professor')
  const isCoordinator = isAdmin || profile.tipo === 'coordenador_polo' || roles.includes('coordenador_polo')

  // Se não for admin e tiver apenas 1 papel, não exibe a barra rápida
  const availableCount = (isAdmin ? 4 : (1 + (isProfessor ? 1 : 0) + (isCoordinator ? 1 : 0)))
  if (availableCount <= 1) return null

  const allPanels: PanelItem[] = [
    {
      id: 'admin',
      name: 'Painel do Administrador',
      shortName: 'Admin',
      path: '/admin',
      icon: <ShieldCheck size={17} />,
      activeColor: '#ef4444',
      glowColor: 'rgba(239, 68, 68, 0.25)'
    },
    {
      id: 'professor',
      name: 'Painel do Professor',
      shortName: 'Professor',
      path: '/professor',
      icon: <GraduationCap size={17} />,
      activeColor: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.25)'
    },
    {
      id: 'coordenador',
      name: 'Painel do Coordenador de Polo',
      shortName: 'Polo',
      path: '/coordenador',
      icon: <Users size={17} />,
      activeColor: '#8b5cf6',
      glowColor: 'rgba(139, 92, 246, 0.25)'
    },
    {
      id: 'aluno',
      name: 'Painel do Aluno',
      shortName: 'Aluno',
      path: '/dashboard?view=student',
      icon: <BookOpen size={17} />,
      activeColor: '#3b82f6',
      glowColor: 'rgba(59, 130, 246, 0.25)'
    }
  ]

  // Filtra painéis disponíveis para o usuário
  const availablePanels = allPanels.filter(p => {
    if (isAdmin) return true
    if (p.id === 'aluno') return true
    if (p.id === 'professor') return isProfessor
    if (p.id === 'coordenador') return isCoordinator
    return false
  })

  const handleNavigate = (panel: PanelItem) => {
    localStorage.setItem('fatesa_active_role', panel.id)
    navigate(panel.path)
  }

  return (
    <div 
      className={`panel-nav-icons-bar ${className || ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '9999px',
        padding: '3px 4px',
        gap: '4px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        ...style
      }}
      title="Alternar rapidamente entre painéis"
    >
      {availablePanels.map(panel => {
        const isActive = panel.id === currentPanel

        return (
          <button
            key={panel.id}
            onClick={() => handleNavigate(panel)}
            title={`Alternar para ${panel.name}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: isActive ? '6px 12px' : '6px 10px',
              borderRadius: '9999px',
              border: isActive ? `1.5px solid ${panel.activeColor}` : '1.5px solid transparent',
              background: isActive 
                ? `linear-gradient(135deg, ${panel.glowColor} 0%, rgba(255,255,255,0.05) 100%)` 
                : 'transparent',
              color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: isActive ? 700 : 500,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive ? `0 0 12px ${panel.glowColor}` : 'none',
              transform: isActive ? 'scale(1.02)' : 'scale(1)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.color = '#ffffff'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
              }
            }}
          >
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: isActive ? panel.activeColor : 'inherit' 
            }}>
              {panel.icon}
            </span>
            <span className="panel-nav-label" style={{ letterSpacing: '0.02em' }}>
              {panel.shortName}
            </span>
            {isActive && (
              <span 
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: panel.activeColor,
                  display: 'inline-block',
                  marginLeft: '2px',
                  boxShadow: `0 0 6px ${panel.activeColor}`
                }} 
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default PanelNavIcons
