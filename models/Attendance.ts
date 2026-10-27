import { Schema, model, models, type InferSchemaType } from 'mongoose';
import { ATTENDANCE_STATUSES, type AttendanceStatus } from '@/lib/constants';

export { ATTENDANCE_STATUSES };
export type { AttendanceStatus };

const AttendanceSchema = new Schema(
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
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      required: true,
    },
    note: { type: String, default: '', maxlength: 300 },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    markedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// One attendance record per (session, student)
AttendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
AttendanceSchema.index({ orgId: 1, studentId: 1, createdAt: -1 });
AttendanceSchema.index({ orgId: 1, programId: 1, studentId: 1 });
// Inactivity checks and alerts (recent attendance per learner).
AttendanceSchema.index({ orgId: 1, studentId: 1, markedAt: -1 });

export type AttendanceDoc = InferSchemaType<typeof AttendanceSchema> & {
  _id: string;
};

export default models.Attendance ||
  model('Attendance', AttendanceSchema);