// =============================================================================
// FILE: models/RateLimit.ts   (NEW FILE)
// Counters for sign-in throttling. Shared by every server instance (works on
// Vercel, unlike in-memory limits). Documents delete themselves when expired.
// Keys never contain raw emails — they are hashed.
// =============================================================================

import { Schema, model, models } from 'mongoose';

const RateLimitSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.RateLimit || model('RateLimit', RateLimitSchema);
