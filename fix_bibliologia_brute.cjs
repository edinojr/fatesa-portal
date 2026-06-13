const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: livros } = await supabase.from('livros').select('id, titulo');
  const bib = livros.find(b => b.titulo.includes('Bibliologia'));

  const { data: aulas } = await supabase
    .from('aulas')
    .select('id, titulo, arquivo_url')
    .eq('livro_id', bib.id)
    .eq('tipo', 'licao')
    .order('ordem');

  console.log(`Processing ${aulas.length} lessons...`);

  for (const a of aulas) {
    if (!a.arquivo_url) continue;

    const resp = await fetch(a.arquivo_url);
    const html = await resp.text();

    // Look for "ESBO" and "LI" (very broad to catch encoding issues)
    // We search for the first occurrence of 'E' followed by 'S' 'B' 'O' (case insensitive)
    const startIdx = html.search(/ESBO/i);
    
    if (startIdx === -1) {
      console.log(`OK  | ${a.titulo.substring(0, 40).padEnd(45)}`);
      continue;
    }

    // We found something that looks like ESBOÇO. 
    // Now find the start of the tag containing it.
    let tagStartIdx = startIdx;
    while (tagStartIdx > 0 && html[tagStartIdx - 1] !== '<') {
      tagStartIdx--;
    }

    // Now find "TEXTO I" or "TEXTO 1" or "TEXTO" followed by a Roman numeral
    const endMarker = /TEXTO\s+([IVXLCDM\d]+)/i;
    const endMatch = html.match(endMarker);
    
    if (!endMatch) {
      console.log(`WARN| ${a.titulo.substring(0, 40).padEnd(45)} | Found ESBO but no TEXTO I`);
      continue;
    }

    // We want to remove from tagStartIdx up to the start of the tag that contains TEXTO I
    let tagEndIdx = endMatch.index;
    while (tagEndIdx > tagStartIdx && html[tagEndIdx - 1] !== '<') {
      tagEndIdx--;
    }

    const removed = html.substring(tagStartIdx, tagEndIdx);
    const newHtml = html.substring(0, tagStartIdx) + html.substring(tagEndIdx);

    console.log(`FIX | ${a.titulo.substring(0, 40).padEnd(45)} | Removed ${removed.length} bytes`);
    // console.log(`   Removed content: ${removed.substring(0, 100)}...`);

    const storagePath = a.arquivo_url.split('/public/livros/')[1];
    const { error } = await supabase.storage.from('livros').upload(storagePath, newHtml, {
      contentType: 'text/html; charset=utf-8',
      upsert: true
    });

    if (error) console.error(`  Upload Error: ${error.message}`);
  }
}

run();
