import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isTokenExpired } from '../lib/authUtils'

const AnalyticsTracker = () => {
  const location = useLocation()

  useEffect(() => {
    // Small delay to let other auth operations settle
    const timer = setTimeout(async () => {
      try {
        let sessionId = sessionStorage.getItem('portal_session_id')
        if (!sessionId) {
          sessionId = crypto.randomUUID()
          sessionStorage.setItem('portal_session_id', sessionId)
        }

        const { data: { session } } = await supabase.auth.getSession()

        if (session?.access_token && !isTokenExpired(session.access_token)) {
          // Logged-in user
          await supabase.from('portal_access_logs').insert({
            user_id: session.user.id,
            session_id: sessionId,
            user_type: 'registrado',
            path: location.pathname + location.search
          })
        } else {
          // Visitor (not logged in) — track public pages
          const publicPaths = ['/', '/sobre', '/metodologia', '/cursos', '/patrono', '/contato', '/matricula', '/login', '/signup']
          const isPublic = publicPaths.some(p => location.pathname === p || location.pathname.startsWith('/cursos'))
          if (isPublic) {
            await supabase.from('portal_access_logs').insert({
              user_id: null,
              session_id: sessionId,
              user_type: 'visitante',
              path: location.pathname + location.search
            })
          }
        }
      } catch (err: any) {
        // Silent fail for analytics. Most likely network or lock issue.
        if (err?.name === 'AbortError' || err?.message?.includes('Fetch')) return;
        // RLS may block visitor inserts — silently ignore
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [location.pathname, location.search]) // Track on pathname or search change

  return null
}

export default AnalyticsTracker
