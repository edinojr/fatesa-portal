
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkSchema() {
    console.log('--- view_submissions_detailed ---');
    const { data: subData, error: subError } = await supabase.from('view_submissions_detailed').select('*').limit(1);
    if (subError) console.error('Error fetching view_submissions_detailed:', subError);
    else console.log('Columns:', Object.keys(subData[0] || {}));

    console.log('\n--- notas ---');
    const { data: notaData, error: notaError } = await supabase.from('notas').select('*').limit(1);
    if (notaError) console.error('Error fetching notas:', notaError);
    else console.log('Columns:', Object.keys(notaData[0] || {}));
}

checkSchema();
