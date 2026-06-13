const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://jhqnitdmdlbagnfwwrwx.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const LOCAL_BASE = 'C:\\Users\\edino\\OneDrive\\Área de Trabalho\\Fatesa\\public\\licoes\\Curso Básico';

function normalize(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function findLocalFile(titulo) {
  const normTitle = normalize(titulo);
  const walkDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = walkDir(fullPath);
        if (found) return found;
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const fname = entry.name.replace('.html', '');
        const normFname = normalize(fname);
        if (normFname === normTitle) return fullPath;
        if (normTitle.includes(normFname) || normFname.includes(normTitle)) return fullPath;
      }
    }
    return null;
  };
  return walkDir(LOCAL_BASE);
}

async function main() {
  console.log('Fetching lessons from Supabase...');
  const { data: lessons, error } = await supabase
    .from('aulas')
    .select('id, titulo, arquivo_url, livro_id')
    .eq('tipo', 'licao')
    .not('arquivo_url', 'is', null);

  if (error) { console.error('Error:', error.message); return; }
  console.log(`Found ${lessons.length} lessons`);

  const { data: books } = await supabase.from('livros').select('id, titulo');
  const bookMap = {};
  if (books) books.forEach(b => bookMap[b.id] = b.titulo);

  const bucketUrl = `${SUPABASE_URL}/storage/v1/object/public/livros/`;
  let uploaded = 0, skipped = 0, errors = 0;

  for (const lesson of lessons) {
    if (!lesson.arquivo_url || !lesson.arquivo_url.startsWith(bucketUrl)) {
      skipped++;
      continue;
    }

    const localPath = findLocalFile(lesson.titulo);
    if (!localPath) {
      skipped++;
      continue;
    }

    const storagePath = lesson.arquivo_url.slice(bucketUrl.length);
    const content = fs.readFileSync(localPath, 'utf-8');

    const { error: uploadError } = await supabase.storage
      .from('livros')
      .upload(storagePath, content, {
        contentType: 'text/html; charset=utf-8',
        upsert: true
      });

    if (uploadError) {
      errors++;
      process.stdout.write(`FAILED: ${lesson.titulo} - ${uploadError.message}\n`);
    } else {
      uploaded++;
      process.stdout.write(`OK [${uploaded}]: ${lesson.titulo}\n`);
    }
  }

  console.log(`\nResults: Uploaded: ${uploaded}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch(console.error);
