import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkTable() {
    const { data, error } = await supabase.from('respostas_aulas').select('*').limit(5)
    if (error) {
        console.error('Error:', error)
        return
    }
    console.log('Respostas Sample:', JSON.stringify(data, null, 2))
}

checkTable()
