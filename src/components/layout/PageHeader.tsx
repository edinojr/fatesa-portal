import React from 'react'
import { ChevronLeft, ChevronRight, LogOut, ExternalLink, LayoutDashboard, ShieldCheck, Users, GraduationCap, Home, BookOpen, Award } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import Logo from '../common/Logo'
import TopBanner from './TopBanner'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  showBackButton?: boolean
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
  actions,
  nav,
  variant = 'student',
  breadcrumb,
  showTopBanner = true
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useProfile()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (showBackButton) {
      const activeRole = localStorage.getItem('fatesa_active_role')
      if (activeRole === 'admin') navigate('/admin')
      else if (activeRole === 'professor') navigate('/professor')
      else if (activeRole === 'coordenador_polo') navigate('/coordenador')
      else navigate('/dashboard')
    }
  }

  const handleRoleNavigate = (role: string, path: string) => {
    localStorage.setItem('fatesa_active_role', role)
    navigate(path)
  }

  const isStaff = ['admin', 'professor', 'suporte'].includes(profile?.tipo || '') || 
                  (profile?.caminhos_acesso || []).some((r: string) => ['admin', 'professor', 'suporte'].includes(r))
  const isAdmin = profile?.tipo === 'admin' || (profile?.caminhos_acesso || []).includes('admin')
  const isProfessor = profile?.tipo === 'professor' || (profile?.caminhos_acesso || []).includes('professor')
  const isCoordinator = profile?.tipo === 'coordenador_polo' || (profile?.caminhos_acesso || []).includes('coordenador_polo')

  const getDefaultActions = () => {
    if (variant === 'viewer') return null
    
    const actionButtons: React.ReactNode[] = []

    if (variant === 'admin' || variant === 'professor' || variant === 'coordinator' || isStaff) {
      if (isAdmin || variant === 'admin') {
        actionButtons.push(
          <button
            key="admin"
            onClick={() => handleRoleNavigate('admin', '/admin')}
            className="nav-btn-premium"
            style={{ width: 'auto' }}
          >
            <LayoutDashboard size={18} /> <span className="mobile-hide">Painel Admin</span>
          </button>
        )
      }
      if (isProfessor || variant === 'professor') {
        actionButtons.push(
          <button
            key="professor"
            onClick={() => handleRoleNavigate('professor', '/professor')}
            className="nav-btn-premium"
            style={{ width: 'auto' }}
          >
            <GraduationCap size={18} /> <span className="mobile-hide">Painel Professor</span>
          </button>
        )
      }
      if (isCoordinator || variant === 'coordinator') {
        actionButtons.push(
          <button
            key="coordinator"
            onClick={() => handleRoleNavigate('coordenador_polo', '/coordenador')}
            className="nav-btn-premium"
            style={{ width: 'auto' }}
          >
            <Users size={18} /> <span className="mobile-hide">Painel Coordenador</span>
          </button>
        )
      }
      if (variant === 'student' && isStaff) {
        actionButtons.push(
          <button
            key="student"
            onClick={() => navigate('/dashboard')}
            className="nav-btn-premium"
            style={{ width: 'auto' }}
          >
            <ExternalLink size={18} /> <span className="mobile-hide">Painel Aluno</span>
          </button>
        )
      }
    }

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

    return <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{actionButtons}</div>
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