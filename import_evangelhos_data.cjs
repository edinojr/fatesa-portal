const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const LIVRO_ID = 'b2ab5400-399a-4f46-ae08-62452ba09be3';
const EXERCISES_FILE = 'C:\\Users\\edino\\OneDrive\\Área de Trabalho\\Fatesa\\public\\Gabarito - Exercícios\\os_evangelhos.json';
const EVALS_DIR = 'C:\\Users\\edino\\OneDrive\\Área de Trabalho\\Fatesa\\public\\json\\Os_Evangelhos';

async function insertExercises() {
  console.log('Inserting exercises...');
  const data = JSON.parse(fs.readFileSync(EXERCISES_FILE, 'utf8'));
  
  for (let i = 0; i < data.lessons.length; i++) {
    const lesson = data.lessons[i];
    const questions = [];

    // Map True/False
    (lesson.trueFalse || []).forEach((q, idx) => {
      questions.push({
        id: `tf-${idx}`,
        type: 'true_false',
        statement: q.statement,
        isTrue: q.answer === 'V',
        correct: q.answer === 'V'
      });
    });

    // Map Short Answer
    (lesson.shortAnswer || []).forEach((q, idx) => {
      questions.push({
        id: `sa-${idx}`,
        type: 'discursive',
        question: q.question,
        expectedAnswer: q.answer
      });
    });

    // Map Multiple Choice
    (lesson.multipleChoice || []).forEach((q, idx) => {
      questions.push({
        id: `mc-${idx}`,
        type: 'multiple_choice',
        question: q.question,
        options: q.options,
        correct: q.answerIndex
      });
    });

    // Map Matching
    if (lesson.matching) {
      questions.push({
        id: `m-1`,
        type: 'matching',
        columnA: lesson.matching.columnA,
        columnB: lesson.matching.columnB,
        matchingPairs: lesson.matching.columnA.map((a, idx) => {
          const targetIdx = lesson.matching.answers[idx] - 1;
          return { left: a, right: lesson.matching.columnB[targetIdx] };
        })
      });
    }

    const { error } = await supabase.from('aulas').upsert({
      livro_id: LIVRO_ID,
      titulo: `Exercícios - ${lesson.title}`,
      tipo: 'atividade',
      ordem: (i + 1) * 100, // Place after corresponding lessons
      questionario: questions,
      is_bloco_final: false
    }, { onConflict: 'titulo, livro_id' });

    if (error) console.error(`Error inserting exercise for ${lesson.title}:`, error.message);
    else console.log(`Inserted exercises for ${lesson.title}`);
  }
}

async function insertEvaluations() {
  console.log('\nInserting evaluations...');
  const files = fs.readdirSync(EVALS_DIR).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(EVALS_DIR, file), 'utf8'));
    const title = content.title || path.basename(file, '.json');
    
    const questions = [];
    // Assume eval JSONs have similar structure to exercises JSON
    if (content.questions) {
      content.questions.forEach((q, idx) => {
        // Simple mapping - adjust based on actual file content if different
        questions.push({
          id: `q-${idx}`,
          type: q.type || 'multiple_choice',
          question: q.question,
          options: q.options || [],
          correct: q.answerIndex || q.correct,
          isTrue: q.answer === 'V'
        });
      });
    } else if (content.lessons && content.lessons[0]) {
      // Handle case where it's a wrap of lessons
      const l = content.lessons[0];
      // Reuse logic from insertExercises...
    }

    const { error } = await supabase.from('aulas').upsert({
      livro_id: LIVRO_ID,
      titulo: title,
      tipo: 'avaliacao',
      ordem: 1000 + files.indexOf(file),
      questionario: questions,
      is_bloco_final: true,
      min_grade: 7.0
    }, { onConflict: 'titulo, livro_id' });

    if (error) console.error(`Error inserting evaluation ${title}:`, error.message);
    else console.log(`Inserted evaluation: ${title}`);
  }
}

(async () => {
  try {
    await insertExercises();
    await insertEvaluations();
    console.log('\nAll done!');
  } catch (e) {
    console.error(e);
  }
})();
