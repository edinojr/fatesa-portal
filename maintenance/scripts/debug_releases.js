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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  // Get some students
  const { data: students, error } = await supabase
    .from('users')
    .select('id, email, nome, nucleo_id, tipo')
    .eq('tipo', 'aluno')
    .limit(5)
  
  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Students:', JSON.stringify(students, null, 2))

  // Get releases for the first student's nucleo
  if (students.length > 0 && students[0].nucleo_id) {
    const { data: releases } = await supabase
      .from('liberacoes_nucleo')
      .select('*')
      .eq('nucleo_id', students[0].nucleo_id)
    
    console.log(`Releases for Nucleo ${students[0].nucleo_id}:`, JSON.stringify(releases, null, 2))

    // Check if the nucleo itself is blocked
    const { data: nucleo } = await supabase
      .from('nucleos')
      .select('*')
      .eq('id', students[0].nucleo_id)
      .single()
    
    console.log('Nucleo Status:', JSON.stringify(nucleo, null, 2))
  } else {
    console.log('No students with nucleo_id found.')
  }
}

run()
