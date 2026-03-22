import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validação mais rigorosa para evitar o erro "Invalid supabaseUrl"
const isValidUrl = (url: string | undefined): boolean => {
  if (!url || url === 'undefined' || url === 'null') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const isConfigured = isValidUrl(supabaseUrl) && supabaseAnonKey && supabaseAnonKey !== 'undefined'

if (!isConfigured) {
  console.error(
    'ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas ou inválidas!\n' +
    'URL encontrada: ' + supabaseUrl + '\n' +
    'Se você estiver vendo isso no GitHub Pages, certifique-se de que os SECRETS ' +
    '(VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) estão configurados corretamente nas ' +
    'configurações do repositório (Settings > Secrets and variables > Actions).'
  )
}

// Usamos um fallback que não quebra o createClient mas sinaliza o erro
export const supabase = createClient(
  isConfigured ? supabaseUrl! : 'https://placeholder-project.supabase.co',
  isConfigured ? supabaseAnonKey! : 'placeholder-key'
)

// Exportamos o estado para que a UI possa reagir se necessário
export const isSupabaseConfigured = isConfigured
