import React from 'react'
import { ChevronLeft, ChevronRight, LogOut, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import TopBanner from './TopBanner'
import { PanelSwitcher } from '../common/PanelSwitcher'

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
  const { profile, signOut } = useProfile()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (showBackButton) {
      // Volta sempre para a página anterior; sem histórico (link direto),
      // cai para o painel do papel ativo.
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

  // Botão "Voltar ao Painel Inicial": leva ao início do painel do papel ativo
  const roleHome: Record<string, string> = {
    admin: '/admin',
    professor: '/professor',
    coordinator: '/coordenador',
    student: '/dashboard',
    viewer: '/dashboard'
  }
  const showHome = showHomeButton ?? (variant === 'admin' || variant === 'professor' || variant === 'coordinator')
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
      >
        <LogOut size={18} /> <span className="mobile-hide">Sair</span>
      </button>
    )

    return <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>{actionButtons}</div>
  }

  const headerStyles: Record<string, React.CSSProperties> = {
    admin: { background: 'var(--primary)', color: '#fff' },
    professor: { background: 'var(--primary)', color: '#fff' },
    coordinator: { background: 'var(--primary)', color: '#fff' },
    student: { background: 'var(--primary)', color: '#fff' },
    viewer: { background: 'var(--primary)', color: '#fff' }
  }

  const currentStyle = headerStyles[variant] || headerStyles.student

  return (
    <div>
      {showTopBanner && <TopBanner />}
      <header 
        className="dashboard-header-modern"
        style={{ 
          ...currentStyle, 
          justifyContent: 'space-between',
          padding: '1rem 2.5rem',
          height: 'auto',
          minHeight: '70px'
        }}
      >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {showBackButton && (
          <button 
            onClick={handleBack} 
            className="nav-btn-premium" 
            style={{ width: 'auto', padding: '0.5rem' }}
            title="Voltar"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {showHome && (
          <button 
            onClick={() => navigate(effectiveHomePath)} 
            className="nav-btn-premium" 
            style={{ width: 'auto', padding: '0.5rem 0.9rem', gap: '0.5rem' }}
            title="Voltar ao Painel Inicial"
          >
            <Home size={20} /> <span className="mobile-hide">Painel Inicial</span>
          </button>
        )}
        
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{title}</h1>
          {subtitle && (
            <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>{subtitle}</p>
          )}
        </div>

        {breadcrumb && breadcrumb.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '2rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.5rem' }}>
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight size={14} style={{ opacity: 0.3 }} />}
                <span 
                  onClick={item.onClick}
                  style={{ 
                    color: item.isActive ? 'var(--primary)' : 'inherit',
                    opacity: item.isActive ? 1 : 0.7,
                    fontWeight: item.isActive ? 700 : 400,
                    cursor: item.onClick ? 'pointer' : 'default',
                    textDecoration: item.onClick ? 'underline' : 'none'
                  }}
                >
                  {item.label}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {nav && (
          <div style={{ marginLeft: '2rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.5rem' }}>
            {nav}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {actions || getDefaultActions()}
      </div>
    </header>
  </div>
  )
}

export default PageHeader