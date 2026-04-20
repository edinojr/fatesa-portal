import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkLivros() {
    const { data, error } = await supabase.from('livros').select('*').eq('curso_id', '92291425-91f0-474d-b8c3-b43486f1cb25')
    if (error) {
        console.error('Error:', error)
        return
    }
    console.log('Livros Sample:', JSON.stringify(data, null, 2))
}

checkLivros()
