import React, { useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { isUserAdmin } from '../lib/authUtils'
import Dashboard from '../pages/Dashboard'

const DashboardBridge = () => {
  const { profile, loading } = useProfile()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (!loading && profile) {
      const roles = (profile.caminhos_acesso as string[]) || []
      const isAdminUser = isUserAdmin(profile)
      const isProfessorUser = profile.tipo === 'professor' || roles.includes('professor')
      const isCoordinatorUser = profile.tipo === 'coordenador_polo' || roles.includes('coordenador_polo')

      const storedRole = localStorage.getItem('fatesa_active_role')
      const isExplicitStudentView = searchParams.get('view') === 'student' || searchParams.get('preview') === 'aluno'

      // REGRA OBRIGATÓRIA: Para administradores, o painel inicial padrão é a página de administradores (/admin).
      // Se o administrador explicitamente escolher ou estiver com a role 'aluno' (ou ?view=student), permanece no Painel do Aluno.
      if (isAdminUser) {
        if (isExplicitStudentView || storedRole === 'aluno') {
          return // Permanece no dashboard exibindo o painel do aluno
        }
        localStorage.setItem('fatesa_active_role', 'admin')
        navigate('/admin', { replace: true })
        return
      }

      if (storedRole === 'aluno') {
        return
      }

      if (storedRole === 'professor' && isProfessorUser) {
        navigate('/professor', { replace: true })
        return
      }

      if (storedRole === 'coordenador' && isCoordinatorUser) {
        navigate('/coordenador', { replace: true })
        return
      }

      if (isProfessorUser) {
        navigate('/professor', { replace: true })
      } else if (isCoordinatorUser) {
        navigate('/coordenador', { replace: true })
      }
    }
  }, [profile, loading, navigate, searchParams])

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
