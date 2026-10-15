import React from 'react'
import { Navigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { isUserAdmin } from '../lib/authUtils'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'professor' | 'suporte' | 'coordenador_polo'
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
    return <Navigate to="/login" replace />
  }

  const roles = (profile.caminhos_acesso as string[]) || []
  const userType = profile.tipo
  
  // Is admin if isUserAdmin(profile) returns true
  const isAdmin = isUserAdmin(profile)
  
  // Is professor if tipo is professor OR if caminhos_acesso contains professor OR if is Admin
  const isProfessor = userType === 'professor' || roles.includes('professor') || isAdmin

  // Is coordinator if tipo is coordenador_polo OR if caminhos_acesso contains coordenador_polo OR if is Admin
  const isCoordinator = userType === 'coordenador_polo' || roles.includes('coordenador_polo') || isAdmin

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  if (requiredRole === 'professor' && !isProfessor) {
    return <Navigate to="/dashboard" replace />
  }

  if (requiredRole === 'coordenador_polo' && !isCoordinator) {
    return <Navigate to="/dashboard" replace />
  }

  // Handle Blocking (only for regular students; admins, professors, and coordinators are never blocked)
  if (!isAdmin && !isProfessor && !isCoordinator) {
    if (profile.accessStatus === 'blocked_payment') {
      return <Navigate to="/vencido" replace />
    }

    if (profile.accessStatus === 'blocked_admin') {
      return <Navigate to="/vencido?type=admin" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute
