import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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

        // Try to get user. If it fails due to lock/timeout, we silent fail for analytics.
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          if (authError.message.includes('Lock broken')) return; // Ignore lock issues
          throw authError;
        }
        
        await supabase.from('portal_access_logs').insert({
          user_id: user?.id || null,
          session_id: sessionId,
          user_type: user ? 'registrado' : 'visitante',
          path: location.pathname
        })
      } catch (err: any) {
        // Silent fail for analytics. Most likely network or lock issue.
        if (err?.name === 'AbortError' || err?.message?.includes('Fetch')) return;
        console.error('Analytics Error:', err)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [location.pathname]) // Only track on pathname change

  return null
}

export default AnalyticsTracker
