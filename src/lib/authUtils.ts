import { supabase } from './supabase'

export function isTokenExpired(accessToken: string | null): boolean {
  if (!accessToken) return true
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    const exp = payload.exp * 1000
    return Date.now() >= exp
  } catch {
    return true
  }
}

export async function checkSessionAndRedirect(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || isTokenExpired(session.access_token)) {
    await supabase.auth.signOut()
    window.location.href = '/login?expired=true'
    return false
  }
  return true
}

export async function handleSupabaseError(err: any): Promise<boolean> {
  if (!err) return false

  const status = err?.status || err?.code
  const message = err?.message || ''

  if (
    status === 401 ||
    status === 403 ||
    message?.toLowerCase().includes('invalid refresh token') ||
    message?.toLowerCase().includes('refresh token not found') ||
    message?.toLowerCase().includes('jwt expired') ||
    message?.toLowerCase().includes('auth error')
  ) {
    await supabase.auth.signOut()
    window.location.href = '/login?expired=true'
    return true
  }
  return false
}
