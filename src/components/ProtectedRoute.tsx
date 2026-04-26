import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'professor' | 'suporte' | 'coordenador_polo'
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { profile, loading } = useProfile()

  useEffect(() => {
    const checkSessionActivity = async () => {
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      const lastActivity = localStorage.getItem('fatesa_last_activity');
      const now = Date.now();

      if (lastActivity && (now - parseInt(lastActivity, 10)) > SIX_HOURS) {
        localStorage.removeItem('fatesa_last_activity');
        await supabase.auth.signOut();
        window.location.href = '/login';
      } else {
        localStorage.setItem('fatesa_last_activity', now.toString());
      }
    };
    
    checkSessionActivity();

    const updateActivity = () => localStorage.setItem('fatesa_last_activity', Date.now().toString());
    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('scroll', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, []);

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
  
  // Is admin if tipo is admin/suporte OR if caminhos_acesso contains them OR if specialized email
  const isAdmin = ['admin', 'suporte'].includes(userType) || roles.some(r => ['admin', 'suporte'].includes(r)) || profile.email === 'edi.ben.jr@gmail.com'
  
  // Is professor if tipo is professor OR if caminhos_acesso contains professor OR if specialized email OR if is Admin
  const isProfessor = userType === 'professor' || roles.includes('professor') || isAdmin

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

  // Handle Blocking (but only for students, admins/profs are exempt via checkAccessStatus)
  if (profile.accessStatus === 'blocked_payment') {
    return <Navigate to="/vencido" replace />
  }

  if (profile.accessStatus === 'blocked_admin') {
    return <Navigate to="/vencido?type=admin" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
