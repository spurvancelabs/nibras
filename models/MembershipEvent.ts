// =============================================================================
// FILE: models/MembershipEvent.ts   (NEW FILE)
// History of premium memberships: granted, extended, revoked, redeemed,
// expired. Shown on the member's Premium page and in Admin → Premium.
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';

export const MEMBERSHIP_EVENTS = ['granted', 'extended', 'revoked', 'redeemed', 'expired'] as const;
export type MembershipEventType = (typeof MEMBERSHIP_EVENTS)[number];

const MembershipEventSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: MEMBERSHIP_EVENTS, required: true },
    /** Membership end after this event (null = none). */
    until: { type: Date, default: null },
    previousUntil: { type: Date, default: null },
    /** 'admin' | 'code' | 'system' */
    source: { type: String, default: 'admin' },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: '' },
    codeId: { type: Schema.Types.ObjectId, ref: 'PremiumCode', default: null },
    note: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

MembershipEventSchema.index({ orgId: 1, userId: 1, createdAt: -1 });
MembershipEventSchema.index({ orgId: 1, createdAt: -1 });

export type MembershipEventDoc = InferSchemaType<typeof MembershipEventSchema> & { _id: string };

export default models.MembershipEvent || model('MembershipEvent', MembershipEventSchema);
