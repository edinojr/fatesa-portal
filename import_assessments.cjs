const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials
const supabaseUrl = 'https://jhqnitdmdlbagnfwwrwx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4';
const supabase = createClient(supabaseUrl, supabaseKey);

// Book name to ID mapping (DB titles -> IDs)
const bookTitleToIdMap = {
  'Angeologia': 'angelologia',
  'Apocalipse': 'apocalipse',
  'Atos dos Apóstolos': 'atos',
  'Bibliologia': 'bibliologia',
  'Cristologia': 'cristologia',
  'Doutrina da Salvacao': 'doutrina_da_salvacao',
  'Doutrina de Deus': 'doutrina_de_deus',
  'Eclesiologia': 'eclesiologia',
  'Epistolas Gerais': 'epistolas_gerais',
  'Epistolas Paulinas I': 'epistolas_paulinas_1',
  'Epistolas Paulinas II': 'epistolas_paulinas_ii',
  'Epistolas Paulinas III': 'epistolas_paulinas_iii',
  'Escatologia Bíblica': 'escatologia_biblica',
  'Doutrina do Espirito Santo.': 'espirito_santo',
  'Epístola aos Hebreus': 'hebreus',
  'Heresiologia': 'heresiologia',
  'História da Igreja': 'historia_da_igreja',
  'História de Israel II': 'historia_de_israel_2',
  'História de Israel I': 'historia_de_israel_i',
  'Os Evangelhos': 'os_evangelhos',
  'Pentateuco': 'pentateuco',
  'Livros Poéticos I': 'poeticos_i',
  'Livros Poéticos II': 'poeticos_ii',
  'Profetas Maiores': 'profetas_maiores',
  'Profetas Menores': 'profetas_menores',
  'Teologia do Obreiro': 'teologia_obreiro',
  'Teologia Prática': 'teologia_pratica',
  // JSON folder names -> DB titles (for folders with accents)
  'Angelologia': 'Angeologia',
  'Atos_dos_Apóstolos': 'Atos dos Apóstolos',
  'Doutrina_da_Salvação': 'Doutrina da Salvacao',
  'Epístolas_Gerais': 'Epistolas Gerais',
  'Epístolas_Paulinas_I': 'Epistolas Paulinas I',
  'Epístolas_Paulinas_II': 'Epistolas Paulinas II',
  'Epístolas_Paulinas_III': 'Epistolas Paulinas III',
  'Espírito_Santo': 'Doutrina do Espirito Santo.',
  'Hebreus': 'Epístola aos Hebreus',
  'História_da_Igreja': 'História da Igreja',
  'História_de_Israel_I': 'História de Israel I',
  'História_de_Israel_II': 'História de Israel II',
  'Poéticos_I': 'Livros Poéticos I',
  'Poéticos_II': 'Livros Poéticos II',
  'Teologia_Prática': 'Teologia Prática'
};

// Version to ordem mapping
const versionToOrdem = {
  'Avaliação': 1000,
  'Recuperação': 2000,
  '2ª Recuperação': 3000
};

/**
 * Convert assessment JSON to QuizQuestion array
 */
function convertAssessmentToQuizQuestions(assessment) {
  const questions = [];

  // True/False (10 questions, 0.5pts each = 5pts)
  if (assessment.tfQuestions) {
    for (const tf of assessment.tfQuestions) {
      questions.push({
        id: tf.id,
        type: 'true_false',
        text: tf.question,
        isTrue: tf.answer === 'V',
        points: 0.5
      });
    }
  }

  // Multiple Choice (4 questions, 0.5pts each = 2pts)
  if (assessment.mcQuestions) {
    for (const mc of assessment.mcQuestions) {
      questions.push({
        id: mc.id,
        type: 'multiple_choice',
        text: mc.question,
        options: mc.options,
        correct: mc.answer,
        points: 0.5
      });
    }
  }

  // Matching (1 question with 6 pairs, 0.5pts each = 3pts)
  if (assessment.matchingPairs && assessment.matchingPairs.length > 0) {
    const matchingPairs = assessment.matchingPairs.map(pair => ({
      left: pair.left,
      right: pair.right
    }));

    questions.push({
      id: assessment.matchingPairs[0].id.replace(/-mp-1$/, '-mp'),
      type: 'matching',
      text: 'Enumere a coluna B de acordo com a coluna A:',
      matchingPairs,
      points: 3.0
    });
  }

  return questions;
}

/**
 * Extract book name from JSON title
 */
function extractBookName(title) {
  return title.split(' - ')[0].trim();
}

/**
 * Extract version from JSON title and return proper name
 */
function extractVersion(title) {
  const parts = title.split(' - ');
  const version = parts.length > 1 ? parts[1].trim() : 'V1';
  
  // Map version codes to proper names
  const versionNames = {
    'V1': 'Avaliação',
    'V2': 'Recuperação',
    'V3': '2ª Recuperação'
  };
  
  return versionNames[version] || version;
}

/**
 * Map JSON book name to database book title
 */
function mapJsonBookToDbTitle(jsonBookName) {
  // Direct mapping from JSON title to DB title
  const jsonTitleToDbTitle = {
    'Angelologia': 'Angeologia',
    'Atos dos Apóstolos': 'Atos dos Apóstolos',
    'Doutrina da Salvação': 'Doutrina da Salvacao',
    'Doutrina de Deus': 'Doutrina de Deus',
    'Epístolas Gerais': 'Epistolas Gerais',
    'Epístolas Paulinas I': 'Epistolas Paulinas I',
    'Epístolas Paulinas 1': 'Epistolas Paulinas I',
    'Epístolas Paulinas II': 'Epistolas Paulinas II',
    'Epístolas Paulinas III': 'Epistolas Paulinas III',
    'Espírito Santo': 'Doutrina do Espirito Santo.',
    'Hebreus': 'Epístola aos Hebreus',
    'História da Igreja': 'História da Igreja',
    'História de Israel I': 'História de Israel I',
    'História de Israel 1': 'História de Israel I',
    'História de Israel II': 'História de Israel II',
    'História de Israel 2': 'História de Israel II',
    'Poéticos I': 'Livros Poéticos I',
    'Poéticos 1': 'Livros Poéticos I',
    'Poéticos II': 'Livros Poéticos II',
    'Poéticos 2': 'Livros Poéticos II',
    'Teologia Obreiro': 'Teologia do Obreiro',
    'Teologia Prática': 'Teologia Prática'
  };
  
  return jsonTitleToDbTitle[jsonBookName] || jsonBookName;
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  IMPORTAÇÃO DE AVALIAÇÕES');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Get all books from database
  console.log('📚 Buscando livros no banco de dados...');
  const { data: books, error: booksError } = await supabase
    .from('livros')
    .select('id, titulo');

  if (booksError) {
    console.error('❌ Erro ao buscar livros:', booksError.message);
    return;
  }

  console.log(`   Encontrados ${books.length} livros.\n`);

  // Create book title to ID lookup
  const bookLookup = {};
  for (const book of books) {
    bookLookup[book.titulo] = book.id;
  }

  // 2. Find all assessment folders
  const jsonDir = path.join(__dirname, 'public', 'json');
  
  if (!fs.existsSync(jsonDir)) {
    console.error('❌ Pasta não encontrada:', jsonDir);
    return;
  }

  const folders = fs.readdirSync(jsonDir).filter(f => {
    const fullPath = path.join(jsonDir, f);
    return fs.statSync(fullPath).isDirectory();
  });

  console.log(`📂 Encontradas ${folders.length} pastas de avaliações.\n`);

  let totalImported = 0;
  let totalErrors = 0;

  // 3. Process each folder
  for (const folder of folders) {
    const folderPath = path.join(jsonDir, folder);
    const jsonFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));

    if (jsonFiles.length === 0) continue;

    console.log(`📖 Processando: ${folder}`);

    // Get first JSON to extract book name
    const firstJson = JSON.parse(fs.readFileSync(path.join(folderPath, jsonFiles[0]), 'utf8'));
    const jsonBookName = extractBookName(firstJson.title);
    const bookName = mapJsonBookToDbTitle(jsonBookName);
    
    // Find book ID
    const bookId = bookLookup[bookName] || bookTitleToIdMap[bookName];
    
    if (!bookId) {
      console.log(`   ⚠️  Livro não encontrado: ${bookName}`);
      totalErrors++;
      continue;
    }

    // Delete existing assessments for this book
    const { error: deleteError } = await supabase
      .from('aulas')
      .delete()
      .eq('livro_id', bookId)
      .eq('tipo', 'avaliacao');

    if (deleteError) {
      console.log(`   ⚠️  Erro ao limpar avaliações antigas: ${deleteError.message}`);
    } else {
      console.log(`   🗑️  Avaliações antigas removidas.`);
    }

    // Process each JSON file (V1, V2, V3)
    for (const jsonFile of jsonFiles) {
      try {
        const filePath = path.join(folderPath, jsonFile);
        const assessment = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const version = extractVersion(assessment.title);
        const questions = convertAssessmentToQuizQuestions(assessment);
        const bookTitle = extractBookName(assessment.title);
        
        // Create aula record with proper name
        const aulaRecord = {
          livro_id: bookId,
          titulo: `${bookTitle} - ${version}`,
          tipo: 'avaliacao',
          ordem: versionToOrdem[version] || 1000,
          questionario: questions,
          min_grade: 7.0
        };

        const { error: insertError } = await supabase
          .from('aulas')
          .insert(aulaRecord);

        if (insertError) {
          console.log(`   ❌ ${version}: Erro - ${insertError.message}`);
          totalErrors++;
        } else {
          console.log(`   ✅ ${version}: ${questions.length} questões importadas`);
          totalImported++;
        }
      } catch (err) {
        console.log(`   ❌ Erro ao processar ${jsonFile}: ${err.message}`);
        totalErrors++;
      }
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESUMO DA IMPORTAÇÃO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✅ Sucesso: ${totalImported} avaliações importadas`);
  console.log(`  ❌ Erros: ${totalErrors}`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
