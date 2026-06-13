const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // 1. Find Bibliologia
  const { data: livros } = await supabase.from('livros').select('id, titulo');
  const bib = livros.find(b => b.titulo.includes('Bibliologia'));

  // 2. Get all licao-type lessons for Bibliologia
  const { data: aulas } = await supabase
    .from('aulas')
    .select('id, titulo, arquivo_url')
    .eq('livro_id', bib.id)
    .eq('tipo', 'licao')
    .order('ordem');

  console.log(`Processing ${aulas.length} lessons in Bibliologia...`);

  let fixedCount = 0;

  for (const a of aulas) {
    if (!a.arquivo_url) continue;

    const resp = await fetch(a.arquivo_url);
    let html = await resp.text();

    // O padrão do esboço é: começa com "ESBOÇO DA LIÇÃO" e termina antes de "TEXTO I"
    // Vamos usar uma regex que ignore tags HTML e procure esses termos
    const startMarker = /ESBO[ÇC]O\s+DA\s+LI[ÇC]Ã[OA]/i;
    const endMarker = /TEXTO\s+I/i;

    const startMatch = html.match(startMarker);
    if (!startMatch) {
      console.log(`OK  | ${a.titulo.substring(0, 40).padEnd(45)} | No outline found`);
      continue;
    }

    // Para remover a seção completa, precisamos encontrar a TAG de abertura que contém o "ESBOÇO"
    // Vamos subir do index do texto até o início da tag (ex: <p> ou <h3>)
    let startIdx = startMatch.index;
    while (startIdx > 0 && html[startIdx - 1] !== '<') {
      startIdx--;
    }
    // Se chegamos ao '<', precisamos achar o início da tag completa
    if (startIdx > 0) {
       // This is a simplification. Let's just find the last '<' before the match.
    }

    // Agora procuramos o "TEXTO I" para saber onde parar a remoção
    const endMatch = html.match(endMarker);
    if (!endMatch) {
      console.log(`WARN| ${a.titulo.substring(0, 40).padEnd(45)} | Outline found but TEXTO I not found`);
      // Se não achou TEXTO I, vamos tentar remover até o primeiro <hr> ou h2/h3
      const fallbackEnd = html.indexOf('<hr>', startMatch.index);
      if (fallbackEnd === -1) {
          console.log(`  Could not find fallback end for ${a.titulo}`);
          continue;
      }
      const finalEndIdx = fallbackEnd;
      const newHtml = html.substring(0, startIdx) + html.substring(finalEndIdx);
      await upload(a, newHtml);
      fixedCount++;
    } else {
      // Removemos desde a tag que contém ESBOÇO até o início de TEXTO I
      // Mas precisamos garantir que não removemos o "TEXTO I" em si
      const finalEndIdx = endMatch.index;
      
      // Para ser mais preciso, vamos procurar a tag que abre o TEXTO I
      let tagStartIdx = finalEndIdx;
      while (tagStartIdx > 0 && html[tagStartIdx - 1] !== '<') {
        tagStartIdx--;
      }

      const newHtml = html.substring(0, startIdx) + html.substring(tagStartIdx);
      await upload(a, newHtml);
      fixedCount++;
    }
  }

  async function upload(aula, content) {
    const storagePath = aula.arquivo_url.split('/public/livros/')[1];
    const { error } = await supabase.storage.from('livros').upload(storagePath, content, {
      contentType: 'text/html; charset=utf-8',
      upsert: true
    });
    if (error) console.error(`  Upload Error for ${aula.titulo}:`, error.message);
    else console.log(`FIX | ${aula.titulo.substring(0, 40).padEnd(45)} | Outline removed`);
  }

  console.log(`\nFinished. Fixed ${fixedCount} lessons.`);
}

run();
