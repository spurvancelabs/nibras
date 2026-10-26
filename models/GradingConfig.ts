// =============================================================================
// FILE: models/GradingConfig.ts   (NEW FILE)
// Per-assignment grading setup: rubric criteria, a PRIVATE reference answer
// (never shown to learners, never returned to the browser for learners) and
// extra guidance for AI-assisted grading.
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';

const CriterionSchema = new Schema(
  {
    id: { type: String, required: true, maxlength: 24 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 1000 },
    maxPoints: { type: Number, required: true, min: 0.5, max: 1000 },
  },
  { _id: false }
);

const GradingConfigSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    rubric: { type: [CriterionSchema], default: [] },
    /** Model answer / key points. Private to staff. */
    referenceAnswer: { type: String, default: '', maxlength: 20000, select: false },
    /** Extra instructions for the AI (tone, what to look for). */
    guidance: { type: String, default: '', maxlength: 4000 },
    aiEnabled: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

GradingConfigSchema.index({ orgId: 1, assignmentId: 1 }, { unique: true });

export type GradingConfigDoc = InferSchemaType<typeof GradingConfigSchema> & { _id: string };

export default models.GradingConfig || model('GradingConfig', GradingConfigSchema);
