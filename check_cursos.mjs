import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkCursos() {
    const { data, error } = await supabase.from('cursos').select('*').limit(5)
    if (error) {
        console.error('Error:', error)
        return
    }
    console.log('Cursos Sample:', JSON.stringify(data, null, 2))
}

checkCursos()
