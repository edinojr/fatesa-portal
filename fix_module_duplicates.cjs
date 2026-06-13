const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jhqnitdmdlbagnfwwrwx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4');

async function fixModules() {
    try {
        const { data: books, error: booksError } = await supabase.from('livros').select('id, titulo');
        if (booksError) throw booksError;

        // 1. Fix Angelologia / Angeologia
        const correct = books.find(b => b.titulo === 'Angelologia');
        const wrong = books.find(b => b.titulo === 'Angeologia');
        
        if (correct && wrong) {
            console.log(`Merging Angeologia (${wrong.id}) into Angelologia (${correct.id})...`);
            await supabase.from('aulas').update({ livro_id: correct.id }).eq('livro_id', wrong.id);
            await supabase.from('livros').delete().eq('id', wrong.id);
            console.log('Fixed Angelologia duplication.');
        }

        // 2. Check for other common near-duplicates based on covers
        // We can't really "find" them unless we have a list. 
        // Let's just check if there are any others.
    } catch (err) {
        console.error('Global error:', err);
    }
}

fixModules();
