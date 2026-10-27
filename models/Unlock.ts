// =============================================================================
// FILE: models/Unlock.ts   (NEW FILE)
// Items a person unlocked individually (e.g. a token-priced session).
// =============================================================================

import { Schema, model, models } from 'mongoose';

const UnlockSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    itemType: { type: String, enum: ['session'], required: true },
    itemId: { type: Schema.Types.ObjectId, required: true },
    via: { type: String, default: 'tokens' },
    tokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UnlockSchema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });

export default models.Unlock || model('Unlock', UnlockSchema);
