// =============================================================================
// FILE: models/AccountFlag.ts   (NEW FILE)
// Where each person is in an automation rule's pipeline, and the review
// queue for admins (open flags, suspensions, resolutions).
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';

export const FLAG_STAGES = ['reminded', 'flagged', 'suspended', 'resolved'] as const;
export type FlagStage = (typeof FLAG_STAGES)[number];

const AccountFlagSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    ruleId: { type: Schema.Types.ObjectId, ref: 'AutomationRule', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stage: { type: String, enum: FLAG_STAGES, required: true },
    reasons: { type: [String], default: [] },
    remindedAt: { type: Date, default: null },
    flaggedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    lastMatchedAt: { type: Date, default: null },
    /** 'reactivated' | 'exempted' | 'dismissed' | 'active-again' */
    resolution: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedNote: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

// One live record per rule + person (resolved ones are kept for history).
AccountFlagSchema.index(
  { ruleId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { stage: { $in: ['reminded', 'flagged', 'suspended'] } } }
);
AccountFlagSchema.index({ orgId: 1, stage: 1, updatedAt: -1 });
AccountFlagSchema.index({ orgId: 1, userId: 1 });

export type AccountFlagDoc = InferSchemaType<typeof AccountFlagSchema> & { _id: string };

export default models.AccountFlag || model('AccountFlag', AccountFlagSchema);
