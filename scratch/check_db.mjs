import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jhqnitdmdlbagnfwwrwx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDQ3NTEsImV4cCI6MjA4OTM4MDc1MX0.exQIEIRdWh0JNy_nD2BuA1LElwktRuqlfXIqVXVvSiI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  console.log('Fetching lessons for the first book...')
  const { data: lessons, error: lessonsError } = await supabase
    .from('aulas')
    .select('id, titulo, nucleo_id, livro_id')
    .eq('livro_id', '6a052574-6985-4bc6-ba16-2c58fbf02f69') // Epístola aos Hebreus
  
  if (lessonsError) {
    console.error('Error fetching lessons:', lessonsError)
    return
  }

  console.log('Lessons found:', lessons.length)
  lessons.forEach(l => {
    console.log(` Lesson: ${l.titulo} (ID: ${l.id}, Nucleo ID: ${l.nucleo_id})`)
  })
}

checkData()
