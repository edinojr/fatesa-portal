const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jhqnitdmdlbagnfwwrwx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4');

async function removeAllDuplicates() {
    try {
        console.log('Analyzing lessons for duplicates...');
        const { data: lessons, error: fetchError } = await supabase
            .from('aulas')
            .select('id, titulo, livro_id, arquivo_url, ordem');

        if (fetchError) throw fetchError;

        const urlMap = new Map();
        const titleModuleMap = new Map();
        const toDelete = new Set();

        lessons.forEach(l => {
            // 1. Duplicate by exact same URL (Content duplication)
            if (l.arquivo_url) {
                if (urlMap.has(l.arquivo_url)) {
                    toDelete.add(l.id);
                } else {
                    urlMap.set(l.arquivo_url, l.id);
                }
            }

            // 2. Duplicate by Title + Module (Logical duplication)
            const key = `${l.livro_id}_${l.titulo?.toLowerCase().trim()}`;
            if (titleModuleMap.has(key)) {
                toDelete.add(l.id);
            } else {
                titleModuleMap.set(key, l.id);
            }
        });

        if (toDelete.size === 0) {
            console.log('No duplicate lessons found.');
            return;
        }

        const deleteList = Array.from(toDelete);
        console.log(`Found ${deleteList.length} duplicate lessons. Deleting...`);
        
        const { error: deleteError } = await supabase
            .from('aulas')
            .delete()
            .in('id', deleteList);

        if (deleteError) {
            console.error('Error deleting duplicates:', deleteError);
        } else {
            console.log(`Successfully deleted ${deleteList.length} duplicate lessons.`);
        }
    } catch (err) {
        console.error('Global error:', err);
    }
}

removeAllDuplicates();
