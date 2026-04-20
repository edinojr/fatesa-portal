import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env', 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) env[match[1]] = match[2]
})

const supabaseUrl = env['VITE_SUPABASE_URL']
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY']

if (!serviceRoleKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY not found in .env")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function check() {
  console.log("Checking policies for 'nucleos'...")
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'nucleos' })
  if (error) {
    // If RPC doesn't exist, try direct SQL if possible or just check pg_policies
    console.log("RPC failed, trying query...")
    const { data: policies, error: pError } = await supabase.from('pg_policies').select('*').eq('tablename', 'nucleos')
    console.log("Policies:", policies)
    console.log("Error:", pError)
  } else {
    console.log("Policies:", data)
  }
}

check()
