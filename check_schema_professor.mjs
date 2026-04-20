import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkSchema() {
    // Verificar se existe tabela de junção professor_nucleos
    const { data: tables, error: tError } = await supabase.from('professor_nucleos').select('*').limit(1)
    if (!tError) {
        console.log('Tabela professor_nucleos existe.')
    } else {
        console.log('Tabela professor_nucleos NÃO existe ou erro:', tError.message)
    }

    // Verificar colunas da tabela users para ver se tem algo como nucleos_ids
    const { data: user, error: uError } = await supabase.from('users').select('*').limit(1)
    if (user && user[0]) {
        console.log('Colunas de users:', Object.keys(user[0]))
    }
}

checkSchema()
