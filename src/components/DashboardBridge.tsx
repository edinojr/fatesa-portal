import React, { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import Dashboard from '../pages/Dashboard'

const DashboardBridge = () => {
  const { profile, loading } = useProfile()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && profile) {
      const roles = (profile.caminhos_acesso as string[]) || []
      const storedRole = localStorage.getItem('fatesa_active_role')

      const isAdminUser = profile.tipo === 'admin' || roles.includes('admin') || roles.includes('suporte')
      const isProfessorUser = profile.tipo === 'professor' || roles.includes('professor')

      // Se o usuário escolheu um papel específico, redirecionar para ele
      if (storedRole === 'aluno') {
        // Admin/professor escolheu ver como aluno - fica no dashboard
        return
      }
      
      if (storedRole === 'professor' && (isAdminUser || isProfessorUser)) {
        navigate('/professor', { replace: true })
        return
      }

      // Admin vai para admin por padrão
      if (isAdminUser) {
        navigate('/admin', { replace: true })
      } else if (isProfessorUser) {
        navigate('/professor', { replace: true })
      }
      // Aluno fica no Dashboard
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

  // Se nenhum redirecionamento aconteceu, é porque é Aluno (ou admin/professor escolheu ver como aluno)
  return <Dashboard />
}

export default DashboardBridge
