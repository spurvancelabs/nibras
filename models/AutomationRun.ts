// =============================================================================
// FILE: models/AutomationRun.ts   (NEW FILE)
// Log of automation runs (preview / dry run / live, manual or scheduled)
// and of the other daily jobs (premium sweep, attendance alerts, retention).
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';

const AutomationRunSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    /** 'automation' | 'premium' | 'attendance' | 'retention' | 'daily' */
    job: { type: String, default: 'automation' },
    ruleId: { type: Schema.Types.ObjectId, ref: 'AutomationRule', default: null },
    ruleName: { type: String, default: '' },
    mode: { type: String, enum: ['dry', 'live'], default: 'dry' },
    /** 'schedule' or the user id who ran it */
    by: { type: String, default: 'schedule' },
    byName: { type: String, default: '' },
    startedAt: { type: Date, default: () => new Date() },
    finishedAt: { type: Date, default: null },
    ok: { type: Boolean, default: true },
    error: { type: String, default: '' },
    counts: { type: Schema.Types.Mixed, default: {} },
    /** Up to 50 example rows: { userId, name, action, reasons } */
    sample: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: false }
);

AutomationRunSchema.index({ orgId: 1, startedAt: -1 });
AutomationRunSchema.index({ orgId: 1, job: 1, startedAt: -1 });

export type AutomationRunDoc = InferSchemaType<typeof AutomationRunSchema> & { _id: string };

export default models.AutomationRun || model('AutomationRun', AutomationRunSchema);
