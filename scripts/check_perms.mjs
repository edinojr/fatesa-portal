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
  const { data, error } = await supabase.rpc('get_policies_for_table', { t_name: 'users' })
  console.log("Policies:", data, error)
  
  // If rpc doesn't exist, try to update a non-existent user and check the error code
  const { error: upError } = await supabase.from('users').update({ nome: 'test' }).eq('id', '00000000-0000-0000-0000-000000000000')
  console.log("Update Error:", upError)
}

check()
