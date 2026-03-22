import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') {
  console.error(
    'ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas!\n' +
    'Se você estiver vendo isso no GitHub Pages, certifique-se de que os SECRETS ' +
    '(VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) estão configurados corretamente nas ' +
    'configurações do repositório.'
  )
}

export const supabase = createClient(
  supabaseUrl && supabaseUrl !== 'undefined' ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey && supabaseAnonKey !== 'undefined' ? supabaseAnonKey : 'placeholder-key'
)
