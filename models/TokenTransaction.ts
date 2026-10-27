// =============================================================================
// FILE: models/TokenTransaction.ts   (NEW FILE)
// Ledger of every token movement. A user's balance (User.tokens) only ever
// changes together with one of these records. `key` makes automatic rewards
// idempotent: the same reward can never be given twice.
// =============================================================================

import { Schema, model, models } from 'mongoose';

const TokenTransactionSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['earn', 'grant', 'deduct', 'spend', 'refund', 'transfer_in', 'transfer_out'], required: true },
    /** Signed amount (+ in, − out). */
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, default: null },
    reason: { type: String, default: '', maxlength: 300 },
    rule: { type: String, default: '' },
    refType: { type: String, default: '' },
    refId: { type: String, default: '' },
    /** Idempotency key (unique per user when set). */
    key: { type: String, default: '' },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    counterpartyId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

TokenTransactionSchema.index({ userId: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $type: 'string', $gt: '' } } });
TokenTransactionSchema.index({ orgId: 1, userId: 1, createdAt: -1 });
TokenTransactionSchema.index({ orgId: 1, kind: 1, createdAt: -1 });

export default models.TokenTransaction || model('TokenTransaction', TokenTransactionSchema);
