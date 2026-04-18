import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.join(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const parts = line.split('=')
  if (parts.length >= 2) {
    const key = parts[0].trim()
    const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '')
    env[key] = value
  }
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function run() {
  const { data, error } = await supabase.from('nucleos').select('id, nome, modules_blocked, is_active')
  if (error) console.error(error)
  else console.log('Nucleos:', JSON.stringify(data, null, 2))
}

run()
