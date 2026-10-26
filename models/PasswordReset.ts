// =============================================================================
// FILE: models/PasswordReset.ts   (NEW FILE)
// One-time password reset links. Only a SHA-256 hash of the token is stored;
// links expire after 30 minutes and are deleted automatically afterwards.
// =============================================================================

import { Schema, model, models } from 'mongoose';

const PasswordResetSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    ip: { type: String, default: '', maxlength: 64 },
  },
  { timestamps: true }
);

PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86_400 });
PasswordResetSchema.index({ userId: 1, usedAt: 1 });

export default models.PasswordReset || model('PasswordReset', PasswordResetSchema);
