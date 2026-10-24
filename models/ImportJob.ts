// =============================================================================
// FILE: models/ImportJob.ts   (NEW FILE)
// A validated CSV import, kept on the SERVER between "Preview" and "Create".
// The browser only gets the job ID back, so it can't change roles, programs or
// skip validation. Rows are encrypted (they contain temporary passwords) and the
// job deletes itself after 1 hour.
// =============================================================================

import { Schema, model, models } from 'mongoose';

const ImportJobSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sealedRows: { type: String, default: '' },
    summary: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['ready', 'committing', 'done'], default: 'ready' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false }
);

ImportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.ImportJob || model('ImportJob', ImportJobSchema);
