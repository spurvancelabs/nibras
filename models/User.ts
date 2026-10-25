// =============================================================================
// FILE: models/User.ts
// User model.
// NEW (security, all optional — existing users need NO migration):
//   sessionVersion    bumped to sign a user out of every device
//   lastLoginAt/Ip    shown to admins ("never signed in" filter)
//   passwordChangedAt set when a password is set or reset
//   uiStyle           personal design style
//   twoFactor*        two-step sign-in with an authenticator app
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';
import { ROLES, type Role } from '@/lib/constants';

export { ROLES };
export type { Role };

const UserSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    avatar: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    programIds: [{ type: Schema.Types.ObjectId, ref: 'Program' }],

    // Organisation member / roll number. Optional; stored upper-case.
    memberId: { type: String, trim: true, uppercase: true, maxlength: 40 },

    // --- security (NEW) ---------------------------------------------------
    // Missing on old documents = 0, which matches sessions issued before this
    // field existed, so nobody is signed out when this is deployed.
    sessionVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String, maxlength: 64 },
    passwordChangedAt: { type: Date },

    // Royal admin: an admin who can manage other admins and see security logs.
    // Missing on old documents = false.
    royal: { type: Boolean, default: false },

    // Personal theme (preset id). '' = use the organisation's theme.
    themePreset: { type: String, default: '', maxlength: 60 },
    // Personal design style id. '' = use the organisation's style.
    uiStyle: { type: String, default: '', maxlength: 60 },

    // --- two-step sign-in (TOTP authenticator app) — all optional ----------
    twoFactorEnabled: { type: Boolean, default: false },
    /** AES-GCM sealed base32 secret (lib/secret-box). */
    twoFactorSecret: { type: String, select: false },
    /** Sealed secret waiting for the first code during setup. */
    twoFactorPending: { type: String, select: false },
    /** SHA-256 hashes of unused one-time recovery codes. */
    twoFactorRecovery: { type: [String], select: false, default: undefined },
    /** Last accepted 30-second step (blocks re-using a code). */
    twoFactorLastStep: { type: Number, select: false, default: 0 },
    twoFactorEnabledAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ orgId: 1, email: 1 }, { unique: true });
UserSchema.index({ orgId: 1, role: 1 });
UserSchema.index({ orgId: 1, programIds: 1 });
// Unique only when a member ID is actually set (users without one are allowed).
UserSchema.index(
  { orgId: 1, memberId: 1 },
  {
    unique: true,
    partialFilterExpression: { memberId: { $type: 'string', $gt: '' } },
  }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: string;
};

export default models.User || model('User', UserSchema);
