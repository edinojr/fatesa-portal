const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const { data: paulinas } = await supabase.from('livros')
    .select('id, titulo')
    .ilike('titulo', '%Paulinas%');
  
  if (!paulinas) return;

  for (const livro of paulinas) {
    const { data: aulas } = await supabase.from('aulas')
      .select('id, titulo, versao, tipo')
      .eq('livro_id', livro.id)
      .eq('tipo', 'prova');
    
    console.log(`\nLivro: ${livro.titulo} (${livro.id})`);
    console.log('--------------------------------------------------');
    if (aulas && aulas.length > 0) {
      console.table(aulas);
    } else {
      console.log('No assessments found.');
    }
  }
}

run().catch(console.error);
