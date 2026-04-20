import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkAulas() {
    const { data, error } = await supabase.from('aulas').select('*').limit(1)
    if (error) {
        console.error('Error:', error)
        return
    }
    console.log('Aulas Columns:', Object.keys(data[0] || {}))
}

checkAulas()
