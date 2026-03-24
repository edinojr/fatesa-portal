import React from 'react'
import { Navigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'professor' | 'suporte'
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { profile, loading } = useProfile()

  if (loading) {
    return (
      <div className="auth-container" style={{ background: 'var(--bg-dark)', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Validando credenciais...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/" replace />
  }

  const roles = (profile.caminhos_acesso as string[]) || []
  const userType = profile.tipo
  
  // Is admin if tipo is admin/suporte OR if caminhos_acesso contains them OR if specialized email
  const isAdmin = ['admin', 'suporte'].includes(userType) || roles.some(r => ['admin', 'suporte'].includes(r)) || profile.email === 'edi.ben.jr@gmail.com'
  
  // Is professor if tipo is professor OR if caminhos_acesso contains professor OR if specialized email OR if is Admin
  const isProfessor = userType === 'professor' || roles.includes('professor') || isAdmin

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  if (requiredRole === 'professor' && !isProfessor) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
