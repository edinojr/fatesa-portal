const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  console.log('Starting cleanup of assessments...');

  // 1. Find all assessments (tipo = 'prova' OR is_bloco_final = true)
  const { data: assessments, error: fetchError } = await supabase
    .from('aulas')
    .select('id, titulo')
    .or('tipo.eq.prova,is_bloco_final.eq.true');

  if (fetchError) {
    console.error('Error fetching assessments:', fetchError);
    return;
  }

  if (!assessments || assessments.length === 0) {
    console.log('No assessments found to delete.');
    return;
  }

  console.log(`Found ${assessments.length} assessments to delete.`);

  const ids = assessments.map(a => a.id);

  // 2. Delete the assessments
  const { error: deleteError } = await supabase
    .from('aulas')
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.error('Error deleting assessments:', deleteError);
  } else {
    console.log(`Successfully deleted ${ids.length} assessments.`);
  }
}

run().catch(console.error);
