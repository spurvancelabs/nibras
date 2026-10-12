import { Schema, model, models, type InferSchemaType } from 'mongoose';
import { QUERY_STATUSES, type QueryStatus } from '@/lib/constants';

export { QUERY_STATUSES };
export type { QueryStatus };

const QuerySchema = new Schema(
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

    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Auto-assigned to the first mentor who replies
    assignedMentorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    subject: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: QUERY_STATUSES,
      default: 'open',
      index: true,
    },

    lastMessageAt: { type: Date, default: () => new Date(), index: true },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

QuerySchema.index({ orgId: 1, programId: 1, lastMessageAt: -1 });
QuerySchema.index({ orgId: 1, studentId: 1, lastMessageAt: -1 });

export type QueryDoc = InferSchemaType<typeof QuerySchema> & {
  _id: string;
};

export default models.Query || model('Query', QuerySchema);