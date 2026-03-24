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
    'ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas ou inválidas!\n' +
    'URL tratada: ' + (supabaseUrl || 'vazia') + '\n' +
    'Se você estiver vendo isso no GitHub Pages, certifique-se de que os SECRETS ' +
    '(VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) estão configurados corretamente nas ' +
    'configurações do repositório (Settings > Secrets and variables > Actions).\n' +
    'IMPORTANTE: No valor do Secret, coloque APENAS o link (ex: https://abc.supabase.co), ' +
    'NÃO coloque "VITE_SUPABASE_URL=" junto.'
  )
}

// Usamos um fallback que não quebra o createClient mas sinaliza o erro
export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://jhqnitdmdlbagnfwwrwx.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder-key'
)

export const isSupabaseConfigured = isConfigured
export { supabaseUrl, supabaseAnonKey }
