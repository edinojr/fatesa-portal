const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://jhqnitdmdlbagnfwwrwx.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const LOCAL_BASE = 'C:\\Users\\edino\\OneDrive\\Área de Trabalho\\Fatesa\\public\\licoes\\Curso Básico';

function normalize(t) { return t.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' '); }

async function main() {
  const { data: lessons } = await supabase.from('aulas').select('id, titulo, arquivo_url, livro_id').eq('tipo', 'licao').not('arquivo_url', 'is', null);
  const { data: books } = await supabase.from('livros').select('id, titulo');
  const bookMap = {};
  if (books) books.forEach(b => bookMap[b.id] = b.titulo);

  // Get all local files
  const localFiles = [];
  const walkDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) walkDir(fp);
      else if (e.name.endsWith('.html')) localFiles.push(fp);
    }
  };
  walkDir(LOCAL_BASE);

  console.log(`Local files: ${localFiles.length}`);
  console.log(`DB lessons: ${lessons.length}\n`);

  let matchCount = 0;
  let missCount = 0;

  for (const lesson of lessons) {
    if (!lesson.arquivo_url) continue;
    const normTitle = normalize(lesson.titulo);
    const bname = bookMap[lesson.livro_id] || '';

    let found = null;
    for (const fp of localFiles) {
      const fname = path.basename(fp).replace('.html', '');
      const normFname = normalize(fname);
      if (normFname === normTitle) { found = fp; break; }
    }

    if (found) {
      matchCount++;
    } else {
      missCount++;
      if (missCount <= 10) {
        console.log(`NO MATCH for: "${lesson.titulo}" (norm="${normTitle}")`);
        console.log(`  book: ${bname}`);
        // Show first 5 local files as hint
        console.log(`  first local files: ${localFiles.slice(0, 3).map(f => path.basename(f)).join(', ')}\n`);
      }
    }
  }

  console.log(`\nMatched: ${matchCount}, Not matched: ${missCount}`);
}

main().catch(console.error);
