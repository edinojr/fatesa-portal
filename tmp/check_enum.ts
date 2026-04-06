import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data, error } = await supabase.rpc('get_enum_values', { enum_name: 'pagamento_status' })
  if (error) {
     console.log("No RPC get_enum_values. Trying query...")
     const { data: data2, error: error2 } = await supabase.from('pagamentos').select('status').limit(1)
     console.log("Error or data:", error2, data2)
  } else {
    console.log("Enum values:", data)
  }
}

test()
