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
  // Query information_schema via RPC if possible, or just try to select and see errors
  // But actually, let's just try to check for the UNIQUE constraint.
  console.log('Attempting to check unique constraint by trying an upsert...')
  // This is a test upsert that should work if RLS allows or fail with a specific error
  const { error } = await supabase.from('liberacoes_nucleo').upsert({
    nucleo_id: '00000000-0000-0000-0000-000000000000',
    item_id: '00000000-0000-0000-0000-000000000000',
    item_type: 'modulo',
    liberado: false
  }, { onConflict: 'nucleo_id, item_id, item_type' })

  if (error) {
    console.log('Upsert error:', error.message)
    console.log('Error code:', error.code)
  } else {
    console.log('Upsert successful (or RLS blocked it quietly?)')
  }
}

run()
