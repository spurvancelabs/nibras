// =============================================================================
// FILE: models/Certificate.ts   (NEW FILE)
// An issued certificate. Names, scores and the design are SNAPSHOTS taken at
// issue time, so later edits don't change a certificate already given out.
// `certNo` is random and unguessable; it powers the public /verify page.
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';

const CertificateSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    certNo: { type: String, required: true, unique: true },
    status: { type: String, enum: ['issued', 'revoked'], default: 'issued', index: true },
    issuedAt: { type: Date, required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    revokedReason: { type: String, default: '', maxlength: 300 },

    // snapshot
    studentName: { type: String, required: true },
    memberId: { type: String, default: '' },
    programName: { type: String, required: true },
    programStart: { type: Date, default: null },
    programEnd: { type: Date, default: null },
    attendancePercent: { type: Number, default: null },
    assignmentPercent: { type: Number, default: null },
    quizPercent: { type: Number, default: null },
    title: { type: String, default: 'Certificate of Completion' },
    statement: { type: String, default: 'has successfully completed the program' },
    style: { type: String, default: 'classic' },
    issuerName: { type: String, default: '' },
    signatoryName: { type: String, default: '' },
    signatoryTitle: { type: String, default: '' },
    signatureImage: { type: String, default: '' },
    logo: { type: String, default: '' },
    showScores: { type: Boolean, default: false },
    footerText: { type: String, default: '' },
  },
  { timestamps: true }
);

// One active certificate per student per program (re-issue after revoking is fine).
CertificateSchema.index(
  { programId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { status: 'issued' } }
);

export type CertificateDoc = InferSchemaType<typeof CertificateSchema> & { _id: string };

export default models.Certificate || model('Certificate', CertificateSchema);
