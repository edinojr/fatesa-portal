
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jhqnitdmdlbagnfwwrwx.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function deleteExercises() {
  console.log('Deleting existing exercises (tipo = atividade)...')
  const { data, error } = await supabase
    .from('aulas')
    .delete()
    .eq('tipo', 'atividade')

  if (error) {
    console.error('Error deleting exercises:', error)
    process.exit(1)
  }

  console.log('Exercises deleted successfully.')
}

deleteExercises()
