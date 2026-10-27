// =============================================================================
// FILE: models/PremiumPlan.ts   (NEW FILE)
// Premium plans shown on the Premium page. Can be bought with tokens (when
// tokens are on) or just describe what an admin grants.
// =============================================================================

import { Schema, model, models } from 'mongoose';

const PremiumPlanSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: '', maxlength: 500 },
    /** Membership length (0 = lifetime). */
    days: { type: Number, default: 30, min: 0, max: 3650 },
    /** Price in tokens (0 = not for sale with tokens). */
    tokenPrice: { type: Number, default: 0, min: 0, max: 10_000_000 },
    /** Shown as text, e.g. "PKR 500" — informational; paid offline. */
    priceLabel: { type: String, default: '', maxlength: 40 },
    highlight: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PremiumPlanSchema.index({ orgId: 1, active: 1, sort: 1 });

export default models.PremiumPlan || model('PremiumPlan', PremiumPlanSchema);
