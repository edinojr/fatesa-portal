import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  ChevronDown, 
  Check, 
  Sparkles, 
  ArrowRight, 
  Users 
} from 'lucide-react'
import { useProfile } from '../../hooks/useProfile'
import { isUserAdmin } from '../../lib/authUtils'

export interface PanelSwitcherProps {
  currentPanel: 'admin' | 'aluno' | 'professor' | 'coordenador'
  className?: string
  style?: React.CSSProperties
  profile?: any
}

interface PanelOption {
  id: 'admin' | 'aluno' | 'professor' | 'coordenador'
  name: string
  shortName: string
  badge: string
  badgeColor: string
  description: string
  path: string
  icon: React.ReactNode
}

export const PanelSwitcher: React.FC<PanelSwitcherProps> = ({ 
  currentPanel, 
  className, 
  style, 
  profile: propProfile 
}) => {
  const { profile: hookProfile } = useProfile()
  const profile = propProfile || hookProfile
  const navigate = useNavigate()

  const [isOpen, setIsOpen] = useState(false)
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; right: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Atualiza coordenadas do dropdown em relação ao botão trigger
  const updateCoords = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropdownHeight = 280

    let top = rect.bottom + 8
    // Se não houver espaço embaixo, abre para cima
    if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
      top = Math.max(10, rect.top - dropdownHeight - 8)
    }

    const right = Math.max(12, window.innerWidth - rect.right)
    setDropdownCoords({ top, right })
  }, [])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen) {
      updateCoords()
    }
    setIsOpen(prev => !prev)
  }

  // Fecha ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    const handleScrollOrResize = () => {
      updateCoords()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [isOpen, updateCoords])

  if (!profile) return null

  const isAdmin = isUserAdmin(profile)
  const roles = (profile.caminhos_acesso as string[]) || []
  const isProfessor = isAdmin || profile.tipo === 'professor' || roles.includes('professor')
  const isCoordinator = isAdmin || profile.tipo === 'coordenador_polo' || roles.includes('coordenador_polo')

  // Se o usuário não for admin e tiver apenas 1 papel, não exibe o seletor
  const totalRoles = (isAdmin ? 4 : 1) + (isProfessor && !isAdmin ? 1 : 0) + (isCoordinator && !isAdmin ? 1 : 0)
  if (!isAdmin && totalRoles <= 1) {
    return null
  }

  // Lista de painéis disponíveis para o usuário
  const options: PanelOption[] = []

  if (isAdmin) {
    options.push({
      id: 'admin',
      name: 'Painel Administrativo',
      shortName: 'Administrativo',
      badge: 'Gestão',
      badgeColor: '#ef4444',
      description: 'Controle de alunos, cursos, notas e financeiro',
      path: '/admin',
      icon: <LayoutDashboard size={18} />
    })
  }

  if (isProfessor) {
    options.push({
      id: 'professor',
      name: 'Painel do Professor',
      shortName: 'Professor',
      badge: 'Docente',
      badgeColor: '#10b981',
      description: 'Lançamento de aulas, presenças e correções',
      path: '/professor',
      icon: <GraduationCap size={18} />
    })
  }

  if (isCoordinator) {
    options.push({
      id: 'coordenador',
      name: 'Painel do Coordenador',
      shortName: 'Coordenador',
      badge: 'Polo',
      badgeColor: '#8b5cf6',
      description: 'Gestão dos alunos e chamadas do polo',
      path: '/coordenador',
      icon: <Users size={18} />
    })
  }

  // Todo usuário com acesso a múltiplos painéis pode acessar o Painel do Aluno
  options.push({
    id: 'aluno',
    name: 'Painel do Aluno',
    shortName: 'Aluno',
    badge: 'Estudante',
    badgeColor: '#3b82f6',
    description: 'Meus cursos, aulas, provas, boletim e certificados',
    path: '/dashboard?view=student',
    icon: <BookOpen size={18} />
  })

  const currentOption = options.find(o => o.id === currentPanel) || options[0]
  const isLightHeader = false

  const handleSelectPanel = (opt: PanelOption) => {
    localStorage.setItem('fatesa_active_role', opt.id)
    setIsOpen(false)
    navigate(opt.path)
  }

  return (
    <div 
      className={`panel-switcher-container ${className || ''}`}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', zIndex: 1200, ...style }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="nav-btn-premium panel-switcher-trigger"
        style={{
          width: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.45rem 0.9rem',
          borderRadius: '12px',
          background: isLightHeader ? '#003366' : 'rgba(255, 255, 255, 0.18)',
          border: isLightHeader ? '1.5px solid #d4af37' : '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow: isLightHeader ? '0 4px 15px rgba(0, 51, 102, 0.25)' : '0 4px 15px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.82rem',
          transition: 'all 0.2s ease',
        }}
        title="Clique para alternar entre os painéis disponíveis"
      >
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: currentOption.badgeColor,
          background: 'rgba(255,255,255,0.15)',
          padding: '4px',
          borderRadius: '8px'
        }}>
          {currentOption.icon}
        </span>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.15 }}>
          <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: isLightHeader ? 'rgba(212, 175, 55, 0.95)' : 'rgba(255,255,255,0.85)', fontWeight: 800 }}>
            Painel Ativo
          </span>
          <span style={{ fontWeight: 800, color: '#ffffff' }}>
            {currentOption.shortName}
          </span>
        </div>

        <span style={{
          fontSize: '0.65rem',
          padding: '2px 7px',
          borderRadius: '20px',
          background: isLightHeader ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255,255,255,0.2)',
          color: '#ffffff',
          border: isLightHeader ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.3)',
          fontWeight: 800,
          marginLeft: '2px'
        }}>
          {currentOption.badge}
        </span>

        <ChevronDown 
          size={15} 
          style={{ 
            color: '#ffffff',
            opacity: 0.9, 
            transition: 'transform 0.2s ease', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
          }} 
        />
      </button>

      {/* Renderiza via React Portal diretamente no document.body para NUNCA ser cortado por overflow: hidden */}
      {isOpen && dropdownCoords && createPortal(
        <div
          ref={dropdownRef}
          className="panel-switcher-dropdown"
          style={{
            position: 'fixed',
            top: `${dropdownCoords.top}px`,
            right: `${dropdownCoords.right}px`,
            width: '320px',
            maxWidth: 'calc(100vw - 24px)',
            background: '#0d1527',
            border: '1.5px solid #d4af37',
            borderRadius: '16px',
            padding: '0.75rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 25px rgba(0, 86, 179, 0.45)',
            backdropFilter: 'blur(25px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            animation: 'fadeInSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 999999
          }}
        >
          {/* Header do menu dropdown */}
          <div style={{ 
            padding: '0.4rem 0.6rem 0.6rem', 
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={14} color="#f59e0b" />
              <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                Alternar Painel
              </span>
            </div>
            {isAdmin && (
              <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>
                Acesso Mestre
              </span>
            )}
          </div>

          {/* Lista de opções de painéis */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
            {options.map((opt) => {
              const isActive = opt.id === currentPanel

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectPanel(opt)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    width: '100%',
                    padding: '0.7rem 0.8rem',
                    borderRadius: '12px',
                    border: isActive ? `1.5px solid ${opt.badgeColor}` : '1.5px solid rgba(255,255,255,0.06)',
                    background: isActive ? `${opt.badgeColor}22` : 'rgba(255,255,255,0.03)',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: `${opt.badgeColor}25`,
                    color: opt.badgeColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: `1px solid ${opt.badgeColor}40`
                  }}>
                    {opt.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                        {opt.name}
                      </span>
                      <span style={{
                        fontSize: '0.6rem',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: `${opt.badgeColor}25`,
                        color: opt.badgeColor,
                        fontWeight: 700,
                        border: `1px solid ${opt.badgeColor}50`
                      }}>
                        {opt.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px', lineHeight: 1.2 }}>
                      {opt.description}
                    </div>
                  </div>

                  {isActive ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: opt.badgeColor,
                      color: '#000',
                      flexShrink: 0
                    }}>
                      <Check size={13} strokeWidth={3} />
                    </div>
                  ) : (
                    <ArrowRight size={15} style={{ opacity: 0.4, flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes fadeInSlideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default PanelSwitcher
export { PanelNavIcons } from './PanelNavIcons'
