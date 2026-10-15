import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  Users, 
  ChevronDown, 
  Check, 
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { useProfile } from '../../hooks/useProfile'
import { isUserAdmin } from '../../lib/authUtils'

export interface PanelSwitcherProps {
  currentPanel: 'admin' | 'aluno' | 'professor' | 'coordenador'
  className?: string
  style?: React.CSSProperties
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

export const PanelSwitcher: React.FC<PanelSwitcherProps> = ({ currentPanel, className, style }) => {
  const { profile } = useProfile()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!profile) return null

  const isAdmin = isUserAdmin(profile)
  const roles = (profile.caminhos_acesso as string[]) || []
  const isProfessor = isAdmin || profile.tipo === 'professor' || roles.includes('professor')
  const isCoordinator = isAdmin || profile.tipo === 'coordenador_polo' || roles.includes('coordenador_polo')

  // Se o usuário não for admin e tiver apenas 1 papel, não exibe o seletor
  const totalRoles = (isAdmin ? 4 : 1) + (isProfessor ? 1 : 0) + (isCoordinator ? 1 : 0)
  if (!isAdmin && totalRoles <= 1) {
    return null
  }

  // Lista de painéis disponíveis para o usuário
  const options: PanelOption[] = []

  if (isAdmin) {
    options.push({
      id: 'admin',
      name: 'Painel do Administrador',
      shortName: 'Admin',
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
      description: 'Gestão de alunos do núcleo e relatórios de polo',
      path: '/coordenador',
      icon: <Users size={18} />
    })
  }

  // Todo usuário/administrador pode acessar o Painel do Aluno
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

  const handleSelectPanel = (opt: PanelOption) => {
    localStorage.setItem('fatesa_active_role', opt.id)
    setIsOpen(false)
    navigate(opt.path)
  }

  return (
    <div 
      ref={containerRef} 
      className={`panel-switcher-container ${className || ''}`}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', zIndex: 1200, ...style }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="nav-btn-premium panel-switcher-trigger"
        style={{
          width: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.45rem 0.9rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
          cursor: 'pointer',
          color: '#fff',
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
          background: 'rgba(255,255,255,0.05)',
          padding: '4px',
          borderRadius: '8px'
        }}>
          {currentOption.icon}
        </span>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.15 }}>
          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.65, fontWeight: 800 }}>
            Painel Atual
          </span>
          <span style={{ fontWeight: 800, color: '#fff' }}>
            {currentOption.name}
          </span>
        </div>

        <span style={{
          fontSize: '0.65rem',
          padding: '2px 7px',
          borderRadius: '20px',
          background: `${currentOption.badgeColor}22`,
          color: currentOption.badgeColor,
          border: `1px solid ${currentOption.badgeColor}55`,
          fontWeight: 800,
          marginLeft: '2px'
        }}>
          {currentOption.badge}
        </span>

        <ChevronDown 
          size={15} 
          style={{ 
            opacity: 0.7, 
            transition: 'transform 0.2s ease', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
          }} 
        />
      </button>

      {isOpen && (
        <div
          className="panel-switcher-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '320px',
            background: '#12141c',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '16px',
            padding: '0.75rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(25px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            animation: 'fadeInSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 9999
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
                    border: isActive ? `1px solid ${opt.badgeColor}66` : '1px solid transparent',
                    background: isActive ? `${opt.badgeColor}18` : 'transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: `${opt.badgeColor}22`,
                    color: opt.badgeColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
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
                        background: `${opt.badgeColor}22`,
                        color: opt.badgeColor,
                        fontWeight: 700
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
                    <ArrowRight size={15} style={{ opacity: 0.3, flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
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
