import { Schema, model, models, type InferSchemaType } from 'mongoose';
import type { AttachmentMeta } from './Assignment';

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

const SubmissionSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    text: { type: String, default: '' },
    attachments: { type: [AttachmentSchema], default: [] },

    submittedAt: { type: Date, required: true },

    // Grading
    marks: { type: Number, default: null },
    feedback: { type: String, default: '' },
    gradedAt: { type: Date, default: null },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

SubmissionSchema.index({ orgId: 1, assignmentId: 1, studentId: 1 }, { unique: true });
// Grading queue (ungraded first) and learner history / inactivity checks.
SubmissionSchema.index({ orgId: 1, assignmentId: 1, marks: 1 });
SubmissionSchema.index({ orgId: 1, studentId: 1, submittedAt: -1 });

export type SubmissionDoc = InferSchemaType<typeof SubmissionSchema> & {
  _id: string;
};

export default models.Submission ||
  model('Submission', SubmissionSchema);