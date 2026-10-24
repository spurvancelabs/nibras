// =============================================================================
// FILE: lib/quiz-types.ts   (NEW FILE — client-safe)
// Shapes shared by the quiz builder, the quiz player and the server, plus the
// validation rules (so the builder shows the same errors the server enforces).
// =============================================================================

import type { QuestionType, QuizResultVisibility, QuizStatus } from './constants';

export type OptionInput = { id?: string; text: string; correct: boolean };

export type QuestionInput = {
  id?: string;
  type: QuestionType;
  prompt: string;
  image: string;
  options: OptionInput[];
  acceptedAnswers: string[];
  numericAnswer: number | null;
  tolerance: number;
  points: number;
  explanation: string;
};

export type QuizInput = {
  id?: string;
  programId: string;
  sessionId: string; // '' = whole program
  title: string;
  description: string;
  timeLimitMin: number;
  maxAttempts: number;
  opensAt: string; // ISO or ''
  closesAt: string; // ISO or ''
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: QuizResultVisibility;
  showCorrectAnswers: boolean;
  passPercent: number;
  questions: QuestionInput[];
};

export type QuizEditorData = QuizInput & { id: string; status: QuizStatus; attemptCount: number };

export type MyQuizState = {
  attempts: number;
  bestPercent: number | null;
  inProgressId: string | null;
  lastAttemptId: string | null;
  canStart: boolean;
  reason: string;
};

export type QuizListItem = {
  id: string;
  title: string;
  description: string;
  programId: string;
  programName: string;
  sessionId: string;
  sessionTitle: string;
  status: QuizStatus;
  questionCount: number;
  totalPoints: number;
  timeLimitMin: number;
  maxAttempts: number;
  opensAt: string | null;
  closesAt: string | null;
  passPercent: number;
  showResults: QuizResultVisibility;
  createdAt: string;
  /** staff only */
  attemptCount?: number;
  avgPercent?: number | null;
  /** students only */
  my?: MyQuizState;
};

/** A question as sent to a student while taking the quiz (no answers!). */
export type PlayerQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  image: string;
  points: number;
  options: { id: string; text: string }[];
};

export type PlayerAnswer = { questionId: string; selected: string[]; text: string; number: number | null };

export type PlayerData = {
  attemptId: string;
  quizId: string;
  title: string;
  description: string;
  attemptNo: number;
  maxAttempts: number;
  deadlineAt: string | null;
  serverNow: string;
  questions: PlayerQuestion[];
  answers: PlayerAnswer[];
};

export type ResultQuestion = PlayerQuestion & {
  answer: PlayerAnswer | null;
  awarded: number | null;
  correct: boolean | null;
  feedback: string;
  /** only when correct answers may be shown */
  correctOptionIds?: string[];
  acceptedAnswers?: string[];
  numericAnswer?: number | null;
  tolerance?: number;
  explanation?: string;
};

export type ResultData = {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  attemptNo: number;
  submittedAt: string | null;
  startedAt: string;
  autoSubmitted: boolean;
  /** false when the quiz hides results from students (yet) */
  scoreVisible: boolean;
  detailVisible: boolean;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  passPercent: number;
  needsReview: boolean;
  questions: ResultQuestion[];
};

export const EMPTY_QUESTION = (type: QuestionType = 'single'): QuestionInput => ({
  type,
  prompt: '',
  image: '',
  options:
    type === 'true_false'
      ? [
          { text: 'True', correct: true },
          { text: 'False', correct: false },
        ]
      : type === 'single' || type === 'multiple'
      ? [
          { text: '', correct: true },
          { text: '', correct: false },
          { text: '', correct: false },
          { text: '', correct: false },
        ]
      : [],
  acceptedAnswers: [],
  numericAnswer: null,
  tolerance: 0,
  points: 1,
  explanation: '',
});

/** Problems that block publishing (empty array = OK). */
export function questionProblems(q: QuestionInput, index: number): string[] {
  const n = `Question ${index + 1}`;
  const out: string[] = [];
  if (!q.prompt.trim()) out.push(`${n}: write the question`);
  if (!(q.points >= 0)) out.push(`${n}: points must be 0 or more`);
  if (q.type === 'single' || q.type === 'multiple' || q.type === 'true_false') {
    const filled = q.options.filter((o) => o.text.trim());
    if (filled.length < 2) out.push(`${n}: add at least 2 options`);
    const correct = filled.filter((o) => o.correct).length;
    if (correct === 0) out.push(`${n}: mark the correct answer`);
    if ((q.type === 'single' || q.type === 'true_false') && correct > 1) out.push(`${n}: only one answer can be correct`);
  }
  if (q.type === 'numeric' && (q.numericAnswer === null || Number.isNaN(q.numericAnswer))) {
    out.push(`${n}: enter the correct number`);
  }
  return out;
}

export function quizProblems(q: Pick<QuizInput, 'title' | 'programId' | 'questions' | 'opensAt' | 'closesAt'>): string[] {
  const out: string[] = [];
  if (!q.title.trim()) out.push('Give the quiz a title');
  if (!q.programId) out.push('Choose a program');
  if (q.questions.length === 0) out.push('Add at least one question');
  if (q.opensAt && q.closesAt && new Date(q.closesAt) <= new Date(q.opensAt)) out.push('Closing time must be after opening time');
  q.questions.forEach((qq, i) => out.push(...questionProblems(qq, i)));
  return out;
}

/** "case  Insensitive " → "case insensitive" */
export function normalizeText(s: string): string {
  return (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}
