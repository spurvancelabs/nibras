// =============================================================================
// FILE: models/QuizAttempt.ts   (NEW FILE)
// One student's attempt at a quiz. Answers autosave while in progress; the
// server grades on submit (or automatically when time runs out).
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';

const AnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    selected: { type: [Schema.Types.ObjectId], default: [] },
    text: { type: String, default: '', maxlength: 2000 },
    number: { type: Number, default: null },
    /** points awarded (null = waiting for manual review) */
    awarded: { type: Number, default: null },
    correct: { type: Boolean, default: null },
    /** mentor's note when grading by hand */
    feedback: { type: String, default: '', maxlength: 1000 },
    /** true when a mentor set the points by hand (kept on re-grading) */
    manual: { type: Boolean, default: false },
  },
  { _id: false }
);

const QuizAttemptSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    attemptNo: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress', index: true },
    startedAt: { type: Date, required: true },
    /** hard deadline (time limit and/or quiz close time); null = none */
    deadlineAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    /** true when the server submitted it because time ran out */
    autoSubmitted: { type: Boolean, default: false },

    /** order shown to this student (shuffling is per attempt) */
    questionOrder: { type: [Schema.Types.ObjectId], default: [] },
    optionOrder: { type: [{ q: Schema.Types.ObjectId, o: [Schema.Types.ObjectId] }], default: [] },

    answers: { type: [AnswerSchema], default: [] },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    needsReview: { type: Boolean, default: false },
  },
  { timestamps: true }
);

QuizAttemptSchema.index({ quizId: 1, studentId: 1, attemptNo: 1 }, { unique: true });
QuizAttemptSchema.index({ orgId: 1, studentId: 1, createdAt: -1 });

export type QuizAttemptDoc = InferSchemaType<typeof QuizAttemptSchema> & { _id: string };

export default models.QuizAttempt || model('QuizAttempt', QuizAttemptSchema);
