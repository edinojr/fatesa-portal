const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://jhqnitdmdlbagnfwwrwx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log('Deleting existing exercises and evaluations...');
  
  const { error: err1 } = await supabase.from('aulas').delete().match({ tipo: 'atividade' });
  if (err1) console.error('Error deleting activities:', err1);

  const { error: err2 } = await supabase.from('aulas').delete().match({ tipo: 'prova' });
  if (err2) console.error('Error deleting provas:', err2);

  const { error: err3 } = await supabase.from('aulas').delete().eq('is_bloco_final', true);
  if (err3) console.error('Error deleting is_bloco_final:', err3);

  console.log('Deletion completed.');
}

run();
