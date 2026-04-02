import React, { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import Dashboard from '../pages/Dashboard'

const DashboardBridge = () => {
  const { profile, loading } = useProfile()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && profile) {
      const activeRole = localStorage.getItem('fatesa_active_role')
      const roles = (profile.caminhos_acesso as string[]) || []
      
      // If the user has a stored role that they actually possess, redirect them there
      if (activeRole === 'admin' && (profile.tipo === 'admin' || roles.includes('admin') || roles.includes('suporte'))) {
        navigate('/admin', { replace: true })
      } else if (activeRole === 'professor' && (profile.tipo === 'professor' || roles.includes('professor'))) {
        navigate('/professor', { replace: true })
      }
      // Otherwise, they stay here and render the Student Dashboard (the default)
    }
  }, [profile, loading, navigate])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a', color: 'var(--primary)', gap: '1rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Sincronizando portal...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  // If no redirection happened, it means Student is the active role (or default)
  return <Dashboard />
}

export default DashboardBridge
