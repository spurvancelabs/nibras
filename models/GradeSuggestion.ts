// =============================================================================
// FILE: models/GradeSuggestion.ts   (NEW FILE)
// AI-suggested grades. A suggestion is NEVER shown to the learner: a mentor
// reviews it and approves (possibly edited), rejects it, or grades by hand.
// Only the approved result is written to the Submission.
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';

export const SUGGESTION_STATUSES = ['queued', 'processing', 'ready', 'failed', 'approved', 'rejected', 'superseded'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

const ScoreSchema = new Schema(
  {
    criterionId: { type: String, required: true },
    points: { type: Number, required: true },
    comment: { type: String, default: '', maxlength: 1500 },
  },
  { _id: false }
);

const GradeSuggestionSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: SUGGESTION_STATUSES, default: 'queued' },

    scores: { type: [ScoreSchema], default: [] },
    /** Suggested marks, already scaled to the assignment's max marks. */
    marks: { type: Number, default: null },
    feedback: { type: String, default: '', maxlength: 6000 },
    /** 0–1, combined model confidence and safety checks. */
    confidence: { type: Number, default: null },
    /** e.g. injection_suspected, truncated, attachment_unread, low_confidence, empty */
    flags: { type: [String], default: [] },
    model: { type: String, default: '' },
    /** NEW: what the AI looked at (attachments read / skipped and why). */
    sources: {
      type: [new Schema({ name: String, kind: String, status: String, note: String, chars: Number }, { _id: false })],
      default: [],
    },
    tokens: { type: Number, default: 0 },
    error: { type: String, default: '', maxlength: 300 },
    attempts: { type: Number, default: 0 },
    /** Submission's last update when the suggestion was made (stale check). */
    submissionAt: { type: Date, default: null },

    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    claimedAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },

    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    finalMarks: { type: Number, default: null },
    finalFeedback: { type: String, default: '', maxlength: 6000 },
    edited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

GradeSuggestionSchema.index({ orgId: 1, submissionId: 1, createdAt: -1 });
GradeSuggestionSchema.index({ orgId: 1, assignmentId: 1, status: 1 });
GradeSuggestionSchema.index({ orgId: 1, status: 1, claimedAt: 1 });

export type GradeSuggestionDoc = InferSchemaType<typeof GradeSuggestionSchema> & { _id: string };

export default models.GradeSuggestion || model('GradeSuggestion', GradeSuggestionSchema);
