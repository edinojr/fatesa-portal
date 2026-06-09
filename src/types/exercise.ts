// Types for the exercise JSON format (from public/Gabarito - Exercícios/*.json)
// These JSONs have a specific structure that needs to be parsed to QuizQuestion format

export interface ExerciseTrueFalse {
  id: string;
  statement: string;
  answer: 'V' | 'F';
}

export interface ExerciseShortAnswer {
  id: string;
  question: string;
  answer: string;
}

export interface ExerciseMultipleChoice {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
}

export interface ExerciseMatching {
  id: string;
  columnA: string[];
  columnB: string[];
  answers: number[]; // Indexes indicating which columnA item matches which columnB item
}

export interface ExerciseLesson {
  id: string; // e.g., "licao-01"
  title: string; // e.g., "Lição 01"
  trueFalse: ExerciseTrueFalse[];
  shortAnswer: ExerciseShortAnswer[];
  multipleChoice: ExerciseMultipleChoice[];
  matching: ExerciseMatching;
}

export interface ExerciseModule {
  id: string; // e.g., "angelologia"
  title: string; // e.g., "Angelologia"
  lessons: ExerciseLesson[];
}
