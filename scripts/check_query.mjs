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
  console.log("Fetching users with pagamentos...")
  const start = Date.now()
  const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          nucleos(nome),
          pagamentos (*)
        `)
        .limit(1)
        
  console.log("Done in", Date.now() - start, "ms")
  console.log("Error:", error)
}

check()
