// =============================================================================
// FILE: models/CertificateConfig.ts   (NEW FILE)
// Per-program certificate design + completion rules. Missing = defaults from
// Settings → Certificates and no minimums.
// =============================================================================

import { Schema, model, models } from 'mongoose';

const CertificateConfigSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true, unique: true },
    title: { type: String, default: 'Certificate of Completion', maxlength: 80 },
    statement: { type: String, default: 'has successfully completed the program', maxlength: 200 },
    style: { type: String, enum: ['classic', 'modern', 'elegant'], default: 'classic' },
    signatoryName: { type: String, default: '', maxlength: 80 },
    signatoryTitle: { type: String, default: '', maxlength: 80 },
    signatureImage: { type: String, default: '', maxlength: 500 },
    // completion rules (0 = not required)
    minAttendance: { type: Number, default: 0, min: 0, max: 100 },
    minAssignments: { type: Number, default: 0, min: 0, max: 100 },
    minQuizzes: { type: Number, default: 0, min: 0, max: 100 },
    showScores: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default models.CertificateConfig || model('CertificateConfig', CertificateConfigSchema);
