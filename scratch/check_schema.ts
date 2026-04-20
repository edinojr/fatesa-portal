import { createClient } from '@supabase/supabase-client-server'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  const { data, error } = await supabase.from('cursos').select('*').limit(1)
  if (error) {
    console.error('Error fetching cursos:', error)
  } else {
    console.log('Cursos record sample:', data[0])
    console.log('Columns:', Object.keys(data[0] || {}))
  }
}

checkSchema()
