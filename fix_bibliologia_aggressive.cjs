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

    // Aggressive check: look for "ESBO" and "LI" (ignoring accents)
    const hasEsboco = /ESBO.*LI/i.test(html) || /ESBO[ÇC]O/i.test(html);
    
    if (!hasEsboco) {
      console.log(`OK  | ${a.titulo.substring(0, 40).padEnd(45)} | No outline found`);
      continue;
    }

    // Find the actual start: look for the first occurrence of "ESBO"
    const startIdxText = html.search(/ESBO/i);
    if (startIdxText === -1) continue;

    // Move back to the start of the tag
    let startIdx = startIdxText;
    while (startIdx > 0 && html[startIdx - 1] !== '<') {
      startIdx--;
    }

    // Find the end: look for "TEXTO I" or the first <hr> after the start
    const endMarker = /TEXTO\s+I/i;
    const endMatch = html.slice(startIdx).match(endMarker);
    
    let finalEndIdx;
    if (endMatch) {
      finalEndIdx = startIdx + endMatch.index;
      // Move back to the start of the tag for TEXTO I
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
      console.error(`  Error uploading ${a.titulo}:`, error.message);
    } else {
      console.log(`FIX | ${a.titulo.substring(0, 40).padEnd(45)} | Outline removed`);
      fixedCount++;
    }
  }

  console.log(`\nFinished. Fixed ${fixedCount} lessons.`);
}

run();
