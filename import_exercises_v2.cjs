const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jhqnitdmdlbagnfwwrwx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const GABARITO_PATH = path.join(__dirname, 'public', 'Gabarito - Exercícios');

// ─────────────────────────────────────────────────────────────
// Maps JSON folder/file names to book titles in the database
// ─────────────────────────────────────────────────────────────
const folderToBookMap = {
  'angelologia': 'Angeologia',
  'apocalipse': 'Apocalipse',
  'atos': 'Atos dos Apóstolos',
  'bibliologia': 'Bibliologia',
  'cristologia': 'Cristologia',
  'dout-salvacao': 'Doutrina da Salvacao',
  'dout-deus': 'Doutrina de Deus',
  'eclesiologia': 'Eclesiologia',
  'ep-gerais': 'Epistolas Gerais',
  'ep-paulinas-1': 'Epistolas Paulinas I',
  'ep-paulinas-2': 'Epistolas Paulinas II',
  'ep-paulinas-3': 'Epistolas Paulinas III',
  'esc-biblica': 'Escatologia Bíblica',
  'espirito-santo': 'Doutrina do Espirito Santo.',
  'hebreus': 'Epístola aos Hebreus',
  'heresiologia': 'Heresiologia',
  'hist-igreja': 'História da Igreja',
  'hist-israel-2': 'História de Israel II',
  'hist-israel-1': 'História de Israel I',
  'evangelhos': 'Os Evangelhos',
  'pentateuco': 'Pentateuco',
  'poeticos-1': 'Livros Poéticos I',
  'poeticos-2': 'Livros Poéticos II',
  'profetas-maiores': 'Profetas Maiores',
  'profetas-menores': 'Profetas Menores',
  'teologia-obreiro': 'Teologia do Obreiro',
  'teo-pratica': 'Teologia Prática'
};

// ─────────────────────────────────────────────────────────────
// Helper: Extract lesson number from ID
// ─────────────────────────────────────────────────────────────
function extractLessonNumber(lessonId) {
  const match = lessonId.match(/licao-(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

// ─────────────────────────────────────────────────────────────
// Convert JSON lesson to QuizQuestion array
// ─────────────────────────────────────────────────────────────
function convertJsonToQuizQuestions(lesson) {
  const questions = [];

  // True/False
  if (lesson.trueFalse) {
    for (const tf of lesson.trueFalse) {
      questions.push({
        id: tf.id,
        type: 'true_false',
        text: tf.statement,
        isTrue: tf.answer === 'V'
      });
    }
  }

  // Short Answer (Discursive)
  if (lesson.shortAnswer) {
    for (const sa of lesson.shortAnswer) {
      questions.push({
        id: sa.id,
        type: 'discursive',
        text: sa.question,
        expectedAnswer: sa.answer
      });
    }
  }

  // Multiple Choice
  if (lesson.multipleChoice) {
    for (const mc of lesson.multipleChoice) {
      questions.push({
        id: mc.id,
        type: 'multiple_choice',
        text: mc.question,
        options: mc.options,
        correct: mc.answerIndex
      });
    }
  }

  // Matching
  if (lesson.matching) {
    const matchingPairs = lesson.matching.columnA.map((left, idx) => ({
      left,
      right: lesson.matching.columnB[idx] || ''
    }));

    questions.push({
      id: lesson.matching.id,
      type: 'matching',
      text: 'Enumere a coluna B de acordo com a coluna A:',
      matchingPairs
    });
  }

  return questions;
}

// ─────────────────────────────────────────────────────────────
// Main import function
// ─────────────────────────────────────────────────────────────
async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  IMPORTAÇÃO DE EXERCÍCIOS DE FIXAÇÃO');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Verify the path exists
  if (!fs.existsSync(GABARITO_PATH)) {
    console.error(`❌ Caminho não encontrado: ${GABARITO_PATH}`);
    process.exit(1);
  }

  // 2. Fetch all books from database
  console.log('📚 Buscando livros no banco de dados...');
  const { data: books, error: booksError } = await supabase
    .from('livros')
    .select('id, titulo');

  if (booksError) {
    console.error('❌ Erro ao buscar livros:', booksError);
    process.exit(1);
  }

  console.log(`   Encontrados ${books.length} livros.\n`);

  // 3. Read JSON files
  const jsonFiles = fs.readdirSync(GABARITO_PATH)
    .filter(f => f.endsWith('.json'));

  console.log(`📂 Encontrados ${jsonFiles.length} arquivos JSON de exercícios.\n`);

  let totalImported = 0;
  let totalErrors = 0;

  // 4. Process each JSON file
  for (const jsonFile of jsonFiles) {
    const filePath = path.join(GABARITO_PATH, jsonFile);
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const bookTitle = folderToBookMap[jsonData.id];
    if (!bookTitle) {
      console.warn(`⚠️  Sem mapeamento para: ${jsonData.id}`);
      continue;
    }

    const book = books.find(b => b.titulo === bookTitle);
    if (!book) {
      console.warn(`⚠️  Livro não encontrado no DB: ${bookTitle}`);
      continue;
    }

    console.log(`\n📖 Processando: ${jsonData.title} (${jsonData.id})`);

    // 5. Delete existing exercises for this book (if any)
    const { error: deleteError } = await supabase
      .from('aulas')
      .delete()
      .eq('livro_id', book.id)
      .eq('tipo', 'exercicio');

    if (deleteError) {
      console.error(`   ❌ Erro ao limpar exercícios antigos: ${deleteError.message}`);
    } else {
      console.log(`   🗑️  Exercícios antigos removidos.`);
    }

    // 6. Insert new exercises
    for (const lesson of jsonData.lessons) {
      const lessonNum = extractLessonNumber(lesson.id);
      const questions = convertJsonToQuizQuestions(lesson);

      const { error: insertError } = await supabase
        .from('aulas')
        .insert({
          livro_id: book.id,
          titulo: `Exercícios - Lição ${String(lessonNum).padStart(2, '0')}`,
          tipo: 'exercicio',
          ordem: lessonNum * 100,
          questionario: questions
        });

      if (insertError) {
        console.error(`   ❌ Lição ${lessonNum}: ${insertError.message}`);
        totalErrors++;
      } else {
        console.log(`   ✅ Lição ${lessonNum}: ${questions.length} questões importadas`);
        totalImported++;
      }
    }
  }

  // 7. Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESUMO DA IMPORTAÇÃO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✅ Sucesso: ${totalImported} exercícios importados`);
  console.log(`  ❌ Erros: ${totalErrors}`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

run().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
