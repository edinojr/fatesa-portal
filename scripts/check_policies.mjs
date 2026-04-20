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
  const { data, error } = await supabase.rpc('run_sql', { query: `
    SELECT tablename, policyname, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename IN ('users', 'pagamentos', 'nucleos')
  `})
  
  if (error) {
     console.log("No run_sql RPC, creating one.")
     // Since we don't have direct SQL access easily from JS, let's use the REST API
     // Actually I can't create RPC from anon key.
  } else {
     console.log(data)
  }
}

check()
