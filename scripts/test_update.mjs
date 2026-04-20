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
  // Query pg_policies via a simple select if allowed, or just assume we need to add it.
  // Actually, I can just try to update a test user and see the error.
  const { data, error } = await supabase.from('users').update({ status_nucleo: 'pendente' }).eq('id', 'non-existent-id')
  console.log("Update result:", data, error)
}

check()
