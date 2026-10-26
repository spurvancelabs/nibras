// =============================================================================
// FILE: models/AiUsage.ts   (NEW FILE)
// AI requests per organisation per month (cost control).
// =============================================================================

import { Schema, model, models } from 'mongoose';

const AiUsageSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    /** 'YYYY-MM' (UTC) */
    month: { type: String, required: true },
    requests: { type: Number, default: 0 },
    tokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AiUsageSchema.index({ orgId: 1, month: 1 }, { unique: true });

export default models.AiUsage || model('AiUsage', AiUsageSchema);
