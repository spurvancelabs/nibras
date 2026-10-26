// =============================================================================
// FILE: models/PremiumCode.ts   (NEW FILE)
// Redeemable premium codes created by Royal Admins (or whoever the Super
// Admin delegates to). Only a SHA-256 hash of the code is stored; the plain
// code is shown once when created. Codes can be limited by uses, an expiry
// date and a program.
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';

const PremiumCodeSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    hash: { type: String, required: true },
    /** Last 4 characters, to recognise a code in lists. */
    hint: { type: String, default: '' },
    label: { type: String, default: '', maxlength: 80 },
    /** Membership length granted on redeem (0 = lifetime). */
    days: { type: Number, default: 30, min: 0, max: 3650 },
    maxUses: { type: Number, default: 1, min: 1, max: 10000 },
    uses: { type: Number, default: 0 },
    /** Users who redeemed (one use per user). */
    redeemedBy: { type: [Schema.Types.ObjectId], default: [] },
    /** Only members of this program may redeem (optional). */
    programId: { type: Schema.Types.ObjectId, ref: 'Program', default: null },
    expiresAt: { type: Date, default: null },
    disabled: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

PremiumCodeSchema.index({ orgId: 1, hash: 1 }, { unique: true });
PremiumCodeSchema.index({ orgId: 1, createdAt: -1 });

export type PremiumCodeDoc = InferSchemaType<typeof PremiumCodeSchema> & { _id: string };

export default models.PremiumCode || model('PremiumCode', PremiumCodeSchema);
