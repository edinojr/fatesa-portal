import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkUser() {
    const { data, error } = await supabase.from('users').select('*').eq('email', 'edi.ben.jr@gmail.com').maybeSingle()
    if (error) {
        console.error('Error:', error)
        return
    }
    console.log('User Profile:', JSON.stringify(data, null, 2))
}

checkUser()
