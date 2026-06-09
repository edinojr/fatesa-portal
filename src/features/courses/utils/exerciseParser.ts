import { QuizQuestion } from '../../../types/admin';
import { ExerciseLesson, ExerciseModule } from '../../../types/exercise';

/**
 * Maps JSON folder names to book titles in the database
 */
export const folderToBookMap: Record<string, string> = {
  'angelologia': 'Angelologia',
  'apocalipse': 'Apocalipse',
  'atos_dos_apostolos': 'Atos dos Apóstolos',
  'bibliologia': 'Bibliologia',
  'cristologia': 'Cristologia',
  'doutrina_da_salvacao': 'Doutrina da Salvação',
  'doutrina_de_deus': 'Doutrina de Deus',
  'eclesiologia': 'Eclesiologia',
  'epistolas_gerais': 'Epístolas Gerais',
  'epistolas_paulinas_1': 'Epístolas Paulinas I',
  'epistolas_paulinas_ii': 'Epístolas Paulinas II',
  'epistolas_paulinas_iii': 'Epístolas Paulinas III',
  'escatologia_biblica': 'Escatologia Bíblica',
  'espirito_santo': 'A Doutrina do Espírito Santo',
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

/**
 * Extract lesson number from JSON lesson ID (e.g., "licao-01" -> 1)
 */
export function extractLessonNumber(lessonId: string): number {
  const match = lessonId.match(/licao-(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Convert a JSON exercise lesson to QuizQuestion array for the database
 * Preserves the exact structure from the JSON file
 */
export function convertJsonToQuizQuestions(lesson: ExerciseLesson): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  // 1. Convert True/False questions
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

  // 2. Convert Short Answer (Discursive) questions
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

  // 3. Convert Multiple Choice questions
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

  // 4. Convert Matching question (single question with multiple pairs)
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

/**
 * Convert a complete JSON module to database records
 * Returns an array of objects ready for insertion into the 'aulas' table
 */
export function convertJsonModuleToDbRecords(
  module: ExerciseModule,
  bookId: string
): Array<{
  livro_id: string;
  titulo: string;
  tipo: 'exercicio';
  ordem: number;
  questionario: QuizQuestion[];
}> {
  const records: Array<{
    livro_id: string;
    titulo: string;
    tipo: 'exercicio';
    ordem: number;
    questionario: QuizQuestion[];
  }> = [];

  for (const lesson of module.lessons) {
    const lessonNum = extractLessonNumber(lesson.id);
    const questions = convertJsonToQuizQuestions(lesson);

    records.push({
      livro_id: bookId,
      titulo: `Exercícios - Lição ${String(lessonNum).padStart(2, '0')}`,
      tipo: 'exercicio',
      ordem: lessonNum * 100, // Place after regular lessons
      questionario: questions
    });
  }

  return records;
}

/**
 * Convert QuizQuestion array back to JSON lesson format
 * Used for exporting/editing gabaritos
 */
export function convertQuizQuestionsToJsonLesson(
  questions: QuizQuestion[],
  lessonId: string,
  lessonTitle: string
): ExerciseLesson {
  const trueFalse: ExerciseLesson['trueFalse'] = [];
  const shortAnswer: ExerciseLesson['shortAnswer'] = [];
  const multipleChoice: ExerciseLesson['multipleChoice'] = [];
  let matching: ExerciseLesson['matching'] | null = null;

  for (const q of questions) {
    switch (q.type) {
      case 'true_false':
        trueFalse.push({
          id: q.id,
          statement: q.text,
          answer: q.isTrue ? 'V' : 'F'
        });
        break;

      case 'discursive':
        shortAnswer.push({
          id: q.id,
          question: q.text,
          answer: q.expectedAnswer || ''
        });
        break;

      case 'multiple_choice':
        multipleChoice.push({
          id: q.id,
          question: q.text,
          options: q.options || [],
          answerIndex: q.correct ?? 0
        });
        break;

      case 'matching':
        if (q.matchingPairs) {
          matching = {
            id: q.id,
            columnA: q.matchingPairs.map(p => p.left),
            columnB: q.matchingPairs.map(p => p.right),
            answers: q.matchingPairs.map((_, idx) => idx + 1)
          };
        }
        break;
    }
  }

  return {
    id: lessonId,
    title: lessonTitle,
    trueFalse,
    shortAnswer,
    multipleChoice,
    matching: matching || {
      id: 'm1',
      columnA: [],
      columnB: [],
      answers: []
    }
  };
}
