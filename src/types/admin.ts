export type QuestionType = 'multiple_choice' | 'true_false' | 'matching' | 'discursive';

export interface QuizQuestion {
  id: string; // unique key
  type: QuestionType;
  text: string;
  // Multiple Choice Specific
  options?: string[];
  correct?: number;
  // True False Specific
  isTrue?: boolean;
  // Matching Specific
  matchingPairs?: { left: string; right: string }[];
  // Discursive Specific
  expectedAnswer?: string;
  explanation?: string; // New field for feedback/gabarito
}
