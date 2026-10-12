import { Schema, model, models, type InferSchemaType } from 'mongoose';

export type AttachmentMeta = {
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
  size: number;
  originalName: string;
};

const AttachmentSchema = new Schema<AttachmentMeta>(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    resourceType: { type: String, default: 'image' },
    format: { type: String, default: '' },
    size: { type: Number, default: 0 },
    originalName: { type: String, default: '' },
  },
  { _id: false }
);

const AssignmentSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    programId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    dueAt: { type: Date, required: true, index: true },
    maxMarks: { type: Number, required: true, min: 1, default: 100 },
    allowLate: { type: Boolean, default: true },

    attachments: { type: [AttachmentSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

AssignmentSchema.index({ orgId: 1, programId: 1, dueAt: -1 });

export type AssignmentDoc = InferSchemaType<typeof AssignmentSchema> & {
  _id: string;
};

export default models.Assignment ||
  model('Assignment', AssignmentSchema);