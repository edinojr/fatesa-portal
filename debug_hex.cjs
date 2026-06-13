const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: livros } = await supabase.from('livros').select('id, titulo');
  const bib = livros.find(b => b.titulo.includes('Bibliologia'));
  const { data: aulas } = await supabase.from('aulas').select('arquivo_url').eq('livro_id', bib.id).eq('tipo', 'licao').order('ordem');
  
  const l4 = aulas[3];
  const resp = await fetch(l4.arquivo_url);
  const text = await resp.text();
  
  console.log('Text length:', text.length);
  for(let i=0; i<text.length; i++) {
    if(text[i].toUpperCase() === 'E') {
      console.log(`Pos ${i}: ${text.substring(i, i+20).replace(/\n/g, ' ')} | Hex: ${Buffer.from(text[i]).toString('hex')}`);
    }
  }
}

run();
