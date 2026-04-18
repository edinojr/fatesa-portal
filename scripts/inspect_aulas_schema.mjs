import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectTable() {
    const { data, error } = await supabase.from('aulas').select('*').limit(1);
    
    if (error) {
        console.error('Error inspecting table:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in "aulas" table:', Object.keys(data[0]));
    } else {
        console.log('No data in "aulas" table to inspect columns.');
    }
}

inspectTable();
