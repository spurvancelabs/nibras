// =============================================================================
// FILE: models/Quiz.ts   (NEW FILE)
// A quiz belongs to a program and (optionally) one session.
// Question types: single / multiple choice, true-false, short text, number.
// Correct answers live here and are NEVER sent to students before results
// are allowed (see lib/quizzes.ts).
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';
import { QUESTION_TYPES, QUIZ_STATUSES, QUIZ_RESULT_VISIBILITY } from '@/lib/constants';

const OptionSchema = new Schema(
  {
    text: { type: String, required: true, maxlength: 500 },
  },
  { _id: true }
);

const QuestionSchema = new Schema(
  {
    type: { type: String, enum: QUESTION_TYPES, required: true },
    prompt: { type: String, required: true, maxlength: 3000 },
    image: { type: String, default: '' },
    options: { type: [OptionSchema], default: [] },
    /** ids of correct options (single / multiple / true_false) */
    correct: { type: [Schema.Types.ObjectId], default: [] },
    /** accepted answers for short text (case/space-insensitive) */
    acceptedAnswers: { type: [String], default: [] },
    numericAnswer: { type: Number, default: null },
    tolerance: { type: Number, default: 0, min: 0 },
    points: { type: Number, default: 1, min: 0, max: 100 },
    explanation: { type: String, default: '', maxlength: 2000 },
  },
  { _id: true }
);

const QuizSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 4000 },
    questions: { type: [QuestionSchema], default: [] },

    // settings
    timeLimitMin: { type: Number, default: 0, min: 0, max: 600 }, // 0 = no limit
    maxAttempts: { type: Number, default: 1, min: 0, max: 20 }, // 0 = unlimited
    opensAt: { type: Date, default: null },
    closesAt: { type: Date, default: null },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showResults: { type: String, enum: QUIZ_RESULT_VISIBILITY, default: 'immediately' },
    showCorrectAnswers: { type: Boolean, default: true },
    passPercent: { type: Number, default: 50, min: 0, max: 100 },

    status: { type: String, enum: QUIZ_STATUSES, default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

QuizSchema.index({ orgId: 1, programId: 1, status: 1, createdAt: -1 });

export type QuizDoc = InferSchemaType<typeof QuizSchema> & { _id: string };

export default models.Quiz || model('Quiz', QuizSchema);
