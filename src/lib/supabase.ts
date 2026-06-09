import { createClient } from '@supabase/supabase-js'

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Limpeza de possíveis erros comuns (copiar o nome da variável junto com o valor)
if (supabaseUrl.startsWith('VITE_SUPABASE_URL=')) {
  supabaseUrl = supabaseUrl.replace('VITE_SUPABASE_URL=', '').trim()
}
if (supabaseAnonKey.startsWith('VITE_SUPABASE_ANON_KEY=')) {
  supabaseAnonKey = supabaseAnonKey.replace('VITE_SUPABASE_ANON_KEY=', '').trim()
}

// Validação mais rigorosa para evitar o erro "Invalid supabaseUrl"
const isValidUrl = (url: string | undefined): boolean => {
  if (!url || url === 'undefined' || url === 'null' || url === '') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const isConfigured = isValidUrl(supabaseUrl) && supabaseAnonKey && supabaseAnonKey !== 'undefined' && supabaseAnonKey !== ''

if (!isConfigured) {
  console.error(
    '🚨 ERRO DE CONFIGURAÇÃO SUPABASE:\n' +
    'As variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não foram encontradas no arquivo .env ou no ambiente.\n\n' +
    'URL detectada: ' + (supabaseUrl || '(vazia)') + '\n' +
    'Anon Key: ' + (supabaseAnonKey ? '********' : '(vazia)') + '\n\n' +
    'AÇÕES REQUERIDAS:\n' +
    '1. Verifique se o arquivo .env existe na raiz do projeto.\n' +
    '2. Certifique-se de que os nomes das variáveis estão corretos.\n' +
    '3. Reinicie o servidor de desenvolvimento (npm run dev).\n'
  )
}

// If not configured, fail early to avoid sending requests to a placeholder Supabase project
if (!isConfigured) {
  console.error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env and restart the dev server.')
  throw new Error('Supabase not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// Configuração do Cliente Supabase
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'fatesa-auth-token',
      flowType: 'pkce'
    },
    global: {
      headers: { 'x-application-name': 'fatesa-portal' }
    }
  }
)

export const isSupabaseConfigured = isConfigured
export { supabaseUrl, supabaseAnonKey }
