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
  console.log("Fetching professor_nucleo...")
  const { data, error } = await supabase.from('professor_nucleo').select('*, users(email), nucleos(nome)')
  console.log("Data:", data)
  console.log("Error:", error)
}

check()
