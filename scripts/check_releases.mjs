import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env', 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) env[match[1]] = match[2]
})

const supabaseUrl = env['VITE_SUPABASE_URL']
const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY']

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
  const { data, error } = await supabase.from('liberacoes_nucleo').select('*').limit(20)
  console.log("Liberacoes Nucleo:", data)
}

check()
