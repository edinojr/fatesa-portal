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

  const { data: books } = await supabase.from('livros').select('id, titulo').limit(5);
  if (!books) return;

  for (const book of books) {
    console.log(`\nChecking exercises for: ${book.titulo} (${book.id})`);
    const { data: exercises, error } = await supabase
      .from('aulas')
      .select('id, titulo, tipo, ordem')
      .eq('livro_id', book.id)
      .in('tipo', ['atividade', 'exercicio']);

    if (error) {
      console.error('Error:', error);
    } else {
      console.log(`Found ${exercises?.length || 0} exercises:`);
      exercises?.forEach(e => {
        console.log(`- ID: ${e.id} | Tipo: ${e.tipo} | Ordem: ${e.ordem} | Titulo: ${e.titulo}`);
      });
    }
  }
}

run().catch(console.error);
