const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jhqnitdmdlbagnfwwrwx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4');

async function removeDuplicateLessons() {
    try {
        const { data: lessons, error: fetchError } = await supabase
            .from('aulas')
            .select('id, titulo, livro_id, ordem')
            .order('ordem', { ascending: true });

        if (fetchError) throw fetchError;

        const seen = new Set();
        const toDelete = [];

        lessons.forEach(l => {
            const key = `${l.livro_id}_${l.titulo}`;
            if (seen.has(key)) {
                toDelete.push(l.id);
            } else {
                seen.add(key);
            }
        });

        if (toDelete.length === 0) {
            console.log('No duplicate lessons found within modules.');
            return;
        }

        console.log(`Found ${toDelete.length} duplicate lessons. Deleting...`);
        
        const { error: deleteError } = await supabase
            .from('aulas')
            .delete()
            .in('id', toDelete);

        if (deleteError) {
            console.error('Error deleting duplicates:', deleteError);
        } else {
            console.log(`Successfully deleted ${toDelete.length} duplicate lessons.`);
        }
    } catch (err) {
        console.error('Global error:', err);
    }
}

removeDuplicateLessons();
