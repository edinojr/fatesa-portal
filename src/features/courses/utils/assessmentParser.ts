import { QuizQuestion } from '../../../types/admin';

/**
 * Assessment JSON structure from the JSON files
 */
export interface AssessmentTFQuestion {
  id: string;
  question: string;
  answer: 'V' | 'F';
}

export interface AssessmentMCQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
}

export interface AssessmentMatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface AssessmentModule {
  id: string;
  title: string;
  tfQuestions: AssessmentTFQuestion[];
  mcQuestions: AssessmentMCQuestion[];
  matchingPairs: AssessmentMatchingPair[];
}

/**
 * Extract book name from JSON title (e.g., "Angelologia - V1" -> "Angeologia")
 */
export function extractBookNameFromTitle(title: string): string {
  return title.split(' - ')[0].trim();
}

/**
 * Extract version from JSON title (e.g., "Angelologia - V1" -> "V1")
 */
export function extractVersionFromTitle(title: string): string {
  const parts = title.split(' - ');
  return parts.length > 1 ? parts[1].trim() : 'V1';
}

/**
 * Convert assessment JSON to QuizQuestion array for the database
 * Structure: 10 TF (0.5pts each) + 4 MC (0.5pts each) + 1 matching (0.5pts each = 3pts)
 * Total: 10 points
 */
export function convertAssessmentToQuizQuestions(assessment: AssessmentModule): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  // 1. Convert True/False questions (10 questions, 0.5pts each = 5pts)
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

  // 2. Convert Multiple Choice questions (4 questions, 0.5pts each = 2pts)
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

  // 3. Convert Matching question (1 question with 6 pairs, 0.5pts each = 3pts)
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
      points: 3.0 // 6 pairs × 0.5pts each
    });
  }

  return questions;
}

/**
 * Convert a complete assessment JSON to database record
 */
export function convertAssessmentToDbRecord(
  assessment: AssessmentModule,
  bookId: string,
  version: string
): {
  livro_id: string;
  titulo: string;
  tipo: 'avaliacao';
  ordem: number;
  questionario: QuizQuestion[];
  min_grade: number;
  versao: string;
} {
  const questions = convertAssessmentToQuizQuestions(assessment);

  // Map version to ordem
  const ordemMap: Record<string, number> = {
    'V1': 1000,
    'V2': 2000,
    'V3': 3000
  };

  return {
    livro_id: bookId,
    titulo: assessment.title,
    tipo: 'avaliacao',
    ordem: ordemMap[version] || 1000,
    questionario: questions,
    min_grade: 7.0,
    versao: version
  };
}
