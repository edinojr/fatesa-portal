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
  console.log("Checking tables...")
  const { data: freq, error: errFreq } = await supabase.from('frequencia').select('count').limit(1)
  console.log("frequencia:", freq, errFreq)
  
  const { data: pres, error: errPres } = await supabase.from('presencas').select('count').limit(1)
  console.log("presencas:", pres, errPres)
}

check()
