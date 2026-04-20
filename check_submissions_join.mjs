import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkSubmissions() {
    const { data, error } = await supabase.from('respostas_aulas').select('*, aulas(titulo, tipo, is_bloco_final)').limit(5)
    if (error) {
        console.error('Error:', error)
        return
    }
    console.log('Submissions with Aulas:', JSON.stringify(data, null, 2))
}

checkSubmissions()
