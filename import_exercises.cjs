
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');

const SUPABASE_URL = 'https://jhqnitdmdlbagnfwwrwx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW5pdGRtZGxiYWduZnd3cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgwNDc1MSwiZXhwIjoyMDg5MzgwNzUxfQ.xPoL3OisadNHlB_Yn3gj6x0Kv7Z8nGGtD28g2Spu-D4';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const GABARITO_PATH = 'C:\\Users\\edino\\OneDrive\\Área de Trabalho\\Fatesa\\public\\gabarito';

function cleanText(text) {
  return text.replace(/^(\d+\.\s*)+/, '').trim();
}

const folderToBookMap = {
  'angeologia': 'Angeologia',
  'apocalipse': 'Apocalipse',
  'atos_dos_apostolos': 'Atos dos Apóstolos',
  'bibliologia': 'Bibliologia',
  'cristologia': 'Cristologia',
  'doutrina_da_salvacao': 'Doutrina da Salvacao',
  'doutrina_de_deus': 'Doutrina de Deus',
  'eclesiologia': 'Eclesiologia',
  'epistolas_gerais': 'Epistolas Gerais',
  'epistolas_paulinas_1': 'Epistolas Paulinas I',
  'epistolas_paulinas_ii': 'Epistolas Paulinas II',
  'epistolas_paulinas_iii': 'Epistolas Paulinas III',
  'escatologia_biblica': 'Escatologia Bíblica',
  'espirito_santo': 'Doutrina do Espirito Santo.',
  'hebreus': 'Epístola aos Hebreus',
  'heresiologia': 'Heresiologia',
  'historia_da_igreja': 'História da Igreja',
  'historia_de_israel_2': 'História de Israel II',
  'historia_de_israel_i': 'História de Israel I',
  'os_evangelhos': 'Os Evangelhos',
  'pentateuco': 'Pentateuco',
  'poeticos_i': 'Livros Poéticos I',
  'poeticos_ii': 'Livros Poéticos II',
  'profetas_maiores': 'Profetas Maiores',
  'profetas_menores': 'Profetas Menores',
  'teologia_obreiro': 'Teologia do Obreiro',
  'teologia_pratica': 'Teologia Prática'
};

async function run() {
  console.log('Starting exercise import...');

  // 1. Fetch books to get IDs
  const { data: books, error: booksError } = await supabase.from('livros').select('id, titulo');
  if (booksError) {
    console.error('Error fetching books:', booksError);
    process.exit(1);
  }

  const folders = fs.readdirSync(GABARITO_PATH).filter(f => fs.lstatSync(path.join(GABARITO_PATH, f)).isDirectory());

  for (const folder of folders) {
    const bookTitle = folderToBookMap[folder];
    if (!bookTitle) {
      console.warn(`No mapping for folder: ${folder}`);
      continue;
    }

    const book = books.find(b => b.titulo === bookTitle);
    if (!book) {
      console.warn(`Book not found in DB for: ${bookTitle}`);
      continue;
    }

    console.log(`Processing module: ${bookTitle} (${folder})`);
    const files = fs.readdirSync(path.join(GABARITO_PATH, folder)).filter(f => f.endsWith('.html')).sort();

    for (const file of files) {
      const filePath = path.join(GABARITO_PATH, folder, file);
      const html = fs.readFileSync(filePath, 'utf8');
      const $ = cheerio.load(html);

      const questionario = [];
      let qIndex = 0;

       $('.question').each((i, el) => {
         const $el = $(el);
         const text = cleanText($el.find('.q-text').text().trim());
         if (!text) return;

        const qId = `q_${qIndex++}`;
        
        // True/False
        const tfInput = $el.find('input[type="radio"][value="V"], input[type="radio"][value="F"]').filter('[checked]');
        if (tfInput.length > 0) {
          const isTrue = tfInput.attr('value') === 'V';
          questionario.push({
            id: qId,
            type: 'true_false',
            text: text,
            isTrue: isTrue
          });
          return;
        }

        // Multiple Choice
        const mcInput = $el.find('input[type="radio"]').filter('[checked]');
        if (mcInput.length > 0 && $el.find('ul').length > 0) {
          const correctIdx = parseInt($el.find('input[type="radio"][checked]').attr('value') || '0');
          const options = [];
          $el.find('ul li label span').each((_, opt) => {
            options.push($(opt).text().trim());
          });
          questionario.push({
            id: qId,
            type: 'multiple_choice',
            text: text,
            options: options,
            correct: correctIdx
          });
          return;
        }

        // Discursive/Citation
        const textarea = $el.find('textarea');
        if (textarea.length > 0) {
          questionario.push({
            id: qId,
            type: 'discursive',
            text: text,
            expectedAnswer: textarea.val() || ''
          });
          return;
        }

        // Matching
        const selects = $el.find('select');
        if (selects.length > 0) {
          const matchingPairs = [];
          // We need the a-column and b-column. 
          // The HTML structure for matching:
          // Col A: list of strings
          // Col B: list of selects with selected values
          const colA = [];
          $el.find('div:contains("Coluna A") ul li').each((_, li) => {
            colA.push($(li).text().replace(/^\\d+-\\s*/, '').trim());
          });
          
          const colB = [];
          $el.find('div:contains("Coluna B") ul li').each((_, li) => {
            const selectedValue = $(li).find('select option[selected]').val() || $(li).find('select').val();
            const rightText = $(li).find('div:last-child').text().trim();
            colB.push({ 
              left: colA[colB.length] || '', 
              right: rightText, 
              correctIdx: parseInt(selectedValue) - 1 
            });
          });

          // Format for DB: matchingPairs: {left, right}[]
          // In the system, for matching, student answers index of Right column.
          // So the correct answer is that left[i] matches right[i].
          const pairs = colB.map(b => ({ left: b.left, right: b.right }));
          
          questionario.push({
            id: qId,
            type: 'matching',
            text: 'Relacione as colunas',
            matchingPairs: pairs
          });
          return;
        }
      });

      const lessonNumMatch = file.match(/licao_(\d+)/i);
      const lessonNum = lessonNumMatch ? parseInt(lessonNumMatch[1]) : 0;

      const { error: insertError } = await supabase.from('aulas').insert({
        livro_id: book.id,
        titulo: `Exercícios - Lição ${lessonNum}`,
        tipo: 'atividade',
        ordem: lessonNum * 100, // Higher order to place them after lessons if needed, or just use lessonNum
        questionario: questionario
      });

      if (insertError) {
        console.error(`Error inserting exercises for ${file}:`, insertError);
      } else {
        console.log(`Successfully imported ${file}`);
      }
    }
  }
  console.log('Import completed.');
}

run();
