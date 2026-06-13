const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  });
  return env;
}

async function run() {
  const env = loadEnv();
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  console.log('Checking for duplicate assessments...');
  
  const { data: assessments, error } = await supabase
    .from('aulas')
    .select('id, livro_id, titulo, tipo, ordem')
    .eq('tipo', 'avaliacao');

  if (error) {
    console.error('Error fetching assessments:', error);
    return;
  }

  const counts = {};
  assessments.forEach(a => {
    const key = `${a.livro_id}_${a.titulo}_${a.ordem}`;
    counts[key] = counts[key] || [];
    counts[key].push(a.id);
  });

  const duplicates = Object.entries(counts).filter(([key, ids]) => ids.length > 1);

  if (duplicates.length === 0) {
    console.log('No duplicate assessments found based on livro_id, titulo, and ordem.');
  } else {
    console.log(`Found ${duplicates.length} duplicate sets:`);
    duplicates.forEach(([key, ids]) => {
      console.log(`Key: ${key} | IDs: ${ids.join(', ')}`);
    });
  }
}

run().catch(console.error);
