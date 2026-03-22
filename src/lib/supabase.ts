import { createClient } from '@supabase/supabase-js'

const cleanEnvVar = (val: any, key: string) => {
  if (typeof val !== 'string') return val;
  if (val.startsWith(`${key}=`)) {
    return val.substring(key.length + 1);
  }
  return val;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabaseUrl = cleanEnvVar(rawUrl, 'VITE_SUPABASE_URL') || 'https://placeholder.supabase.co'
const supabaseAnonKey = cleanEnvVar(rawKey, 'VITE_SUPABASE_ANON_KEY') || 'placeholder-key'

if (!rawUrl || !rawKey) {
  console.error(
    'Faltam variáveis de ambiente do Supabase! ' +
    'Certifique-se de que os Secrets no GitHub (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) estão configurados corretamente.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
