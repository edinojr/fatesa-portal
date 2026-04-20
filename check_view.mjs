import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkView() {
    const { data, error } = await supabase.from('view_submissions_detailed').select('*').limit(5)
    if (error) {
        console.error('Error:', error)
        return
    }
    console.log('Submissions Sample:', JSON.stringify(data, null, 2))
}

checkView()
