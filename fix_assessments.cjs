const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  // 1. Get all books to have the IDs
  const { data: livros } = await supabase.from('livros').select('id, titulo');
  if (!livros) return;

  const findLivro = (titlePart) => {
    return livros.find(l => l.titulo.toLowerCase().includes(titlePart.toLowerCase()));
  };

  const paulinasI = findLivro('Paulinas I');
  const paulinasII = findLivro('Paulinas II');
  const paulinasIII = findLivro('Paulinas III');

  console.log('Mapping:');
  console.log('Paulinas I:', paulinasI?.id);
  console.log('Paulinas II:', paulinasII?.id);
  console.log('Paulinas III:', paulinasIII?.id);

  // 2. Get all assessments
  const { data: assessments } = await supabase.from('aulas').select('id, titulo, versao, livro_id').eq('tipo', 'prova');
  if (!assessments) return;

  for (const assessment of assessments) {
    let targetLivroId = assessment.livro_id;
    const title = assessment.titulo;
    const version = assessment.versao;

    // Fix Paulinas Mapping
    if (title.includes('Paulinas_1') || title.includes('Paulinas I')) {
      targetLivroId = paulinasI?.id;
    } else if (title.includes('Paulinas_2') || title.includes('Paulinas II')) {
      targetLivroId = paulinasII?.id;
    } else if (title.includes('Paulinas_3') || title.includes('Paulinas III')) {
      targetLivroId = paulinasIII?.id;
    }

    // Standardize Name
    let newTitle = title;
    if (version === 1) newTitle = 'Avaliação';
    else if (version === 2) newTitle = 'Recuperação';
    else if (version === 3) newTitle = '2ª Recuperação';

    if (targetLivroId !== assessment.livro_id || newTitle !== title) {
      console.log(`Updating assessment ${assessment.id}: ${title} (V${version}) -> ${newTitle} in livro ${targetLivroId}`);
      const { error } = await supabase.from('aulas').update({
        livro_id: targetLivroId,
        titulo: newTitle
      }).eq('id', assessment.id);
      if (error) console.error(`Error updating ${assessment.id}:`, error);
    }
  }
  console.log('Assessment cleanup completed!');
}

run().catch(console.error);
