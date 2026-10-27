// =============================================================================
// FILE: models/EmailVerification.ts   (NEW FILE)
// One-time "confirm your email" links for self-registration. Only a hash of
// the token is stored; links expire after 24 hours.
// =============================================================================

import { Schema, model, models } from 'mongoose';

const EmailVerificationSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 86_400 });

export default models.EmailVerification || model('EmailVerification', EmailVerificationSchema);
