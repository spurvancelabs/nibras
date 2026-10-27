import { Schema, model, models, type InferSchemaType } from 'mongoose';
import { SESSION_STATUSES, type SessionStatus } from '@/lib/constants';

export { SESSION_STATUSES };
export type { SessionStatus };

const SessionSchema = new Schema(
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
    title: { type: String, required: true, trim: true },
    agenda: { type: String, default: '' },
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    meetingUrl: { type: String, default: '' },
    recordingUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: SESSION_STATUSES,
      default: 'scheduled',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    /** Who can open the meeting link, recording and materials. */
    access: { type: String, enum: ['free', 'premium', 'tokens'], default: 'free' },
    /** Price when access = 'tokens' (premium members get it free). */
    tokenPrice: { type: Number, default: 0, min: 0, max: 1_000_000 },
  },
  { timestamps: true }
);

SessionSchema.index({ orgId: 1, programId: 1, startsAt: -1 });
SessionSchema.index({ orgId: 1, startsAt: 1 });

export type SessionDoc = InferSchemaType<typeof SessionSchema> & {
  _id: string;
};

export default models.Session || model('Session', SessionSchema);