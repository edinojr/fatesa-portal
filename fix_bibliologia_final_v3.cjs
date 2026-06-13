const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: livros } = await supabase.from('livros').select('id, titulo');
  const bib = livros.find(b => b.titulo.includes('Bibliologia'));

  const { data: aulas } = await supabase
    .from('aulas')
    .select('id, titulo, ordem, arquivo_url')
    .eq('livro_id', bib.id)
    .eq('tipo', 'licao')
    .order('ordem');

  let fixedCount = 0;

  for (const a of aulas) {
    if (!a.arquivo_url) continue;

    const resp = await fetch(a.arquivo_url);
    const html = await resp.text();

    // Busca por 'ESBO' independente de acentos ou maiúsculas
    const startIdxText = html.search(/ESBO/i);
    if (startIdxText === -1) {
      console.log(`OK  | ${a.titulo.substring(0, 40).padEnd(45)} | Não encontrado`);
      continue;
    }

    // Sobe até o início da tag HTML (<p>, <h3>, etc)
    let startIdx = startIdxText;
    while (startIdx > 0 && html[startIdx - 1] !== '<') {
      startIdx--;
    }

    // Procura o fim da seção (início do TEXTO I ou a primeira linha horizontal <hr>)
    const endMarker = /TEXTO\s+I/i;
    const endMatch = html.match(endMarker);
    
    let finalEndIdx;
    if (endMatch) {
      finalEndIdx = endMatch.index;
      // Garante que paramos no início da tag do TEXTO I
      while (finalEndIdx > startIdx && html[finalEndIdx - 1] !== '<') {
        finalEndIdx--;
      }
    } else {
      const hrIdx = html.indexOf('<hr>', startIdx);
      finalEndIdx = hrIdx !== -1 ? hrIdx : html.length;
    }

    const newHtml = html.substring(0, startIdx) + html.substring(finalEndIdx);
    
    const storagePath = a.arquivo_url.split('/public/livros/')[1];
    const { error } = await supabase.storage.from('livros').upload(storagePath, newHtml, {
      contentType: 'text/html; charset=utf-8',
      upsert: true
    });

    if (error) {
      console.error(`  Erro upload ${a.titulo}:`, error.message);
    } else {
      console.log(`FIX | ${a.titulo.substring(0, 40).padEnd(45)} | Esboço removido`);
      fixedCount++;
    }
  }

  console.log(`\nConcluído. ${fixedCount} lições corrigidas.`);
}

run();
