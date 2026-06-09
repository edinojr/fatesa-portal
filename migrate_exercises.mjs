import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => {
  const match = env.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY');
const GABARITO_DIR = 'C:\\Users\\edino\\OneDrive\\Área de Trabalho\\gabarito';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function parseHtml(html, topic) {
  const $ = cheerio.load(html);
  const questions = [];
  let questionId = 1;

  $('.question').each((i, el) => {
    const $el = $(el);
    const qText = $el.find('.q-text').text().trim();
    if (!qText) return;

    // True/False
    const tfInput = $el.find('input[type="radio"][value="V"], input[type="radio"][value="F"]');
    if (tfInput.length === 2 && (tfInput.first().attr('value') === 'V' || tfInput.first().attr('value') === 'F')) {
      const checked = tfInput.filter(':checked').first().attr('value');
      questions.push({
        id: `q${questionId++}`,
        text: qText,
        type: 'true_false',
        isTrue: checked === 'V'
      });
      return;
    }

    // Multiple Choice
    const mcInputs = $el.find('input[type="radio"]');
    if (mcInputs.length > 2) {
      const options = [];
      mcInputs.each((j, input) => {
        options.push($(input).closest('label').find('span').text().trim());
      });
      const correctIndex = parseInt($el.find('input[type="radio"]:checked').attr('value') || '0', 10);
      questions.push({
        id: `q${questionId++}`,
        text: qText,
        type: 'multiple_choice',
        options: options,
        correct: correctIndex
      });
      return;
    }

    // Discursive
    const textarea = $el.find('textarea');
    if (textarea.length > 0) {
      questions.push({
        id: `q${questionId++}`,
        text: qText,
        type: 'discursive',
        expectedAnswer: $(textarea).val() || ''
      });
      return;
    }

    // Matching
    const selects = $el.find('select');
    if (selects.length > 0) {
      const leftItems = [];
      $el.find('div:contains("Coluna A") ul li').each((j, li) => {
        leftItems.push($(li).text().replace(/^\d+-\s*/, '').trim());
      });

      const matchingPairs = [];
      $el.find('div:contains("Coluna B") ul li').each((j, li) => {
        const select = $(li).find('select');
        const selectedValue = select.find('option:selected').val();
        const rightText = $(li).find('div:not(:has(select))').text().trim();
        
        if (selectedValue) {
          const leftIndex = parseInt(selectedValue, 10) - 1;
          if (leftItems[leftIndex]) {
            matchingPairs.push({
              left: leftItems[leftIndex],
              right: rightText
            });
          }
        }
      });

      questions.push({
        id: `q${questionId++}`,
        text: qText,
        type: 'matching',
        matchingPairs: matchingPairs
      });
    }
  });

  return questions;
}

async function migrate() {
  const folders = fs.readdirSync(GABARITO_DIR).filter(f => fs.lstatSync(path.join(GABARITO_DIR, f)).isDirectory());
  let updatedCount = 0;
  let failureCount = 0;

  for (const topic of folders) {
    console.log(`Processing topic: ${topic}`);
    const folderPath = path.join(GABARITO_DIR, topic);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.html'));

    for (const file of files) {
      try {
        const lessonMatch = file.match(/(\d+)_licao_(\d+)\.html/);
        if (!lessonMatch) continue;
        const lessonNumber = lessonMatch[2];
        
        const html = fs.readFileSync(path.join(folderPath, file), 'utf8');
        const questions = await parseHtml(html, topic);

        // Search for the record in 'aulas' table
        // We'll search for titulo matching the pattern and then filter by topic in JS.
        const { data: aulas, error: aulaError } = await supabase
          .from('aulas')
          .select('id, titulo, livros(titulo)')
          .ilike('titulo', `%licao_${lessonNumber}%`);

        if (aulaError) throw aulaError;

        if (!aulas || aulas.length === 0) {
          console.error(`Could not find aula for ${topic} Lição ${lessonNumber}`);
          failureCount++;
          continue;
        }

        // Find the best match based on topic
        const bestMatch = aulas.find(aula => {
          const topicClean = topic.toLowerCase().replace(/_/g, ' ');
          const tituloMatch = aula.titulo.toLowerCase().includes(topicClean);
          const libroMatch = aula.livros && aula.livros.titulo && aula.livros.titulo.toLowerCase().includes(topicClean);
          return tituloMatch || libroMatch;
        });

        if (!bestMatch) {
          console.error(`No matching aula found for topic ${topic} among results for Lição ${lessonNumber}`);
          failureCount++;
          continue;
        }

        const { error: updateError } = await supabase
          .from('aulas')
          .update({ questionario: questions })
          .eq('id', bestMatch.id);

        if (updateError) throw updateError;

        updatedCount++;
        console.log(`Updated ${topic} Lição ${lessonNumber}`);
      } catch (err) {
        console.error(`Error processing ${topic}/${file}:`, err);
        failureCount++;
      }
    }
  }

  console.log(`\\nMigration finished.`);
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Failures: ${failureCount}`);
}

migrate();

