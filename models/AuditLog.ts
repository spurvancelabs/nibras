// =============================================================================
// FILE: models/AuditLog.ts   (NEW FILE)
// Who did what, when, from where. Kept ~13 months, then removed automatically.
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';

const AuditLogSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String, default: '' },
    actorName: { type: String, default: '' },
    action: { type: String, required: true },
    targetIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    summary: { type: String, default: '' },
    meta: { type: Schema.Types.Mixed },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    // HMAC-SHA256 of the entry (see lib/audit.ts). Lets the Security page
    // detect entries that were edited directly in the database.
    sig: { type: String, default: '' },
  },
  { versionKey: false }
);

AuditLogSchema.index({ orgId: 1, at: -1 });
AuditLogSchema.index({ orgId: 1, action: 1, at: -1 });
AuditLogSchema.index({ orgId: 1, targetIds: 1, at: -1 });
AuditLogSchema.index({ orgId: 1, actorId: 1, at: -1 });
AuditLogSchema.index({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & { _id: string };

export default models.AuditLog || model('AuditLog', AuditLogSchema);
