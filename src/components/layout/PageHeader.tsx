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
  showTopBanner = true
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
          padding: '0.85rem 2rem',
          height: 'auto',
          minHeight: '70px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {/* Logo Oficial Fatesa Padronizado */}
          <Link 
            to="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              textDecoration: 'none',
              transition: 'transform 0.2s ease'
            }} 
            title="Ir para a página inicial"
          >
            <Logo size={115} />
          </Link>

          {/* Menus e botões de navegação brancos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '1.25rem' }}>
            {showHome && (
              <button 
                onClick={() => navigate(effectiveHomePath)} 
                className="nav-btn-premium" 
                style={{ width: 'auto', padding: '0.5rem 0.9rem', gap: '0.5rem' }}
                title="Voltar ao Painel Inicial"
              >
                <Home size={18} /> <span className="mobile-hide">Painel Inicial</span>
              </button>
            )}

            {showBackButton && (
              <button 
                onClick={handleBack} 
                className="nav-btn-premium" 
                style={{ width: 'auto', padding: '0.5rem 0.8rem', gap: '0.4rem' }}
                title="Voltar"
              >
                <ChevronLeft size={18} /> <span className="mobile-hide">Voltar</span>
              </button>
            )}
          </div>
          
          <div style={{ marginLeft: '0.25rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>{title}</h1>
            {subtitle && (
              <p style={{ margin: 0, opacity: 0.85, fontSize: '0.82rem', color: '#ffffff' }}>{subtitle}</p>
            )}
          </div>

          {breadcrumb && breadcrumb.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem', borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '1.25rem' }}>
              {breadcrumb.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight size={14} style={{ opacity: 0.6, color: '#ffffff' }} />}
                  <span 
                    onClick={item.onClick}
                    style={{ 
                      color: '#ffffff',
                      opacity: item.isActive ? 1 : 0.75,
                      fontWeight: item.isActive ? 800 : 500,
                      cursor: item.onClick ? 'pointer' : 'default',
                      textDecoration: item.onClick ? 'underline' : 'none',
                      fontSize: '0.9rem'
                    }}
                  >
                    {item.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          {nav && (
            <div style={{ marginLeft: '0.5rem', borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '1.25rem' }}>
              {nav}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {actions || getDefaultActions()}
        </div>
      </header>
    </div>
  )
}

export default PageHeader
