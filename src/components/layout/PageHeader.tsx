import React from 'react'
import { ChevronLeft, ChevronRight, LogOut, Home } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import TopBanner from './TopBanner'
import { PanelSwitcher } from '../common/PanelSwitcher'
import Logo from '../common/Logo'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  showBackButton?: boolean
  showHomeButton?: boolean
  homePath?: string
  actions?: React.ReactNode
  nav?: React.ReactNode
  variant?: 'admin' | 'professor' | 'coordinator' | 'student' | 'viewer'
  breadcrumb?: Array<{ label: string; onClick?: () => void; isActive?: boolean }>
  showTopBanner?: boolean
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBackButton = true,
  showHomeButton,
  homePath,
  actions,
  nav,
  variant = 'student',
  breadcrumb,
  showTopBanner = false
}) => {
  const navigate = useNavigate()
  const { signOut } = useProfile()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (showBackButton) {
      if (window.history.length > 1) {
        window.history.back()
        return
      }
      const activeRole = localStorage.getItem('fatesa_active_role')
      if (activeRole === 'admin') navigate('/admin')
      else if (activeRole === 'professor') navigate('/professor')
      else if (activeRole === 'coordenador_polo') navigate('/coordenador')
      else navigate('/dashboard')
    }
  }

  const roleHome: Record<string, string> = {
    admin: '/admin',
    professor: '/professor',
    coordinator: '/coordenador',
    student: '/dashboard',
    viewer: '/dashboard'
  }
  const showHome = showHomeButton ?? true
  const effectiveHomePath = homePath || roleHome[variant] || '/dashboard'

  const getDefaultActions = () => {
    if (variant === 'viewer') return null
    
    const actionButtons: React.ReactNode[] = []
    const currentPanel: 'admin' | 'professor' | 'aluno' = 
      variant === 'admin' ? 'admin' : 
      variant === 'professor' ? 'professor' : 'aluno'

    actionButtons.push(
      <PanelSwitcher key="panel-switcher" currentPanel={currentPanel} />
    )

    actionButtons.push(
      <button
        key="logout"
        onClick={() => signOut()}
        className="nav-btn-premium danger"
        style={{ width: 'auto' }}
        title="Encerrar sessão"
      >
        <LogOut size={18} /> <span className="mobile-hide">Sair</span>
      </button>
    )

    return <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>{actionButtons}</div>
  }

  return (
    <div>
      {showTopBanner && <TopBanner />}
      <header 
        className="dashboard-header-modern"
        style={{ 
          background: 'var(--primary, #0056b3)',
          color: '#ffffff',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          height: '60px',
          minHeight: '60px',
          maxHeight: '60px',
          boxShadow: '0 4px 16px rgba(0, 86, 179, 0.16), 0 0 10px rgba(0, 86, 179, 0.22)',
          borderBottom: '2.5px solid #d4af37',
          flexWrap: 'nowrap',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'nowrap', minWidth: 0, flex: 1 }}>
          {/* Logo Oficial Fatesa Padronizado */}
          <Link 
            to="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              textDecoration: 'none',
              transition: 'transform 0.2s ease',
              flexShrink: 0
            }} 
            title="Ir para a página inicial"
          >
            <Logo size={72} maxHeight={42} />
          </Link>

          {/* Menus e botões de navegação brancos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '1rem', flexShrink: 0 }}>
            {showHome && (
              <button 
                onClick={() => navigate(effectiveHomePath)} 
                className="nav-btn-premium" 
                style={{ width: 'auto', padding: '0.4rem 0.75rem', gap: '0.4rem', fontSize: '0.8rem' }}
                title="Voltar ao Painel Inicial"
              >
                <Home size={16} /> <span className="mobile-hide">Painel Inicial</span>
              </button>
            )}

            {showBackButton && (
              <button 
                onClick={handleBack} 
                className="nav-btn-premium" 
                style={{ width: 'auto', padding: '0.4rem 0.7rem', gap: '0.35rem', fontSize: '0.8rem' }}
                title="Voltar"
              >
                <ChevronLeft size={16} /> <span className="mobile-hide">Voltar</span>
              </button>
            )}
          </div>
          
          <div style={{ marginLeft: '0.25rem', minWidth: 0, overflow: 'hidden' }}>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
            {subtitle && (
              <p className="mobile-hide" style={{ margin: 0, opacity: 0.85, fontSize: '0.72rem', color: '#ffffff', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</p>
            )}
          </div>

          {breadcrumb && breadcrumb.length > 0 && (
            <div className="mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.4rem', borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '1rem', flexShrink: 0 }}>
              {breadcrumb.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight size={13} style={{ opacity: 0.6, color: '#ffffff' }} />}
                  <span 
                    onClick={item.onClick}
                    style={{ 
                      color: '#ffffff',
                      opacity: item.isActive ? 1 : 0.75,
                      fontWeight: item.isActive ? 800 : 500,
                      cursor: item.onClick ? 'pointer' : 'default',
                      textDecoration: item.onClick ? 'underline' : 'none',
                      fontSize: '0.82rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          {nav && (
            <div style={{ marginLeft: '0.4rem', borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '1rem', flexShrink: 0 }}>
              {nav}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'nowrap', flexShrink: 0 }}>
          {actions || getDefaultActions()}
        </div>
      </header>
    </div>
  )
}

export default PageHeader
