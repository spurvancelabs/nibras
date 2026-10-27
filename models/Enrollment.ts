// =============================================================================
// FILE: models/Enrollment.ts   (NEW FILE)
// A learner's enrolment in a video course and their progress.
// =============================================================================

import { Schema, model, models } from 'mongoose';

const EnrollmentSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** How they got in: free · premium · tokens · admin */
    via: { type: String, default: 'free' },
    tokens: { type: Number, default: 0 },
    completedLessons: { type: [String], default: [] },
    lastLessonId: { type: String, default: '' },
    lastSeenAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ courseId: 1, userId: 1 }, { unique: true });
EnrollmentSchema.index({ orgId: 1, userId: 1, lastSeenAt: -1 });

export default models.Enrollment || model('Enrollment', EnrollmentSchema);
