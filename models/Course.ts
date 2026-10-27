// =============================================================================
// FILE: models/Course.ts   (NEW FILE)
// Pre-recorded video courses. Sections and lessons are stored inside the
// course (one document, saved atomically by the editor).
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';

const ResourceSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    url: { type: String, required: true, maxlength: 1000 },
    format: { type: String, default: '', maxlength: 20 },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const LessonSchema = new Schema(
  {
    id: { type: String, required: true, maxlength: 24 },
    title: { type: String, required: true, maxlength: 200 },
    /** 'video' (with explanation) or 'article' (text + resources only). */
    type: { type: String, enum: ['video', 'article'], default: 'video' },
    videoUrl: { type: String, default: '', maxlength: 1000 },
    /** Seconds (filled from the upload, or typed by the instructor). */
    duration: { type: Number, default: 0 },
    body: { type: String, default: '', maxlength: 20000 },
    resources: { type: [ResourceSchema], default: [] },
    /** Free preview: anyone who can see the course can watch it. */
    preview: { type: Boolean, default: false },
  },
  { _id: false }
);

const SectionSchema = new Schema(
  {
    id: { type: String, required: true, maxlength: 24 },
    title: { type: String, required: true, maxlength: 200 },
    lessons: { type: [LessonSchema], default: [] },
  },
  { _id: false }
);

const CourseSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, maxlength: 90 },
    subtitle: { type: String, default: '', maxlength: 300 },
    description: { type: String, default: '', maxlength: 10000 },
    cover: { type: String, default: '', maxlength: 1000 },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'all'], default: 'all' },
    category: { type: String, default: '', maxlength: 60 },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    access: { type: String, enum: ['free', 'premium', 'tokens'], default: 'free' },
    tokenPrice: { type: Number, default: 0, min: 0, max: 10_000_000 },
    /** Only members of these programs can see it (empty = everyone). */
    programIds: { type: [Schema.Types.ObjectId], default: [] },
    instructorIds: { type: [Schema.Types.ObjectId], default: [] },
    sections: { type: [SectionSchema], default: [] },
    lessonCount: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    enrolledCount: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

CourseSchema.index({ orgId: 1, slug: 1 }, { unique: true });
CourseSchema.index({ orgId: 1, status: 1, updatedAt: -1 });

export type CourseDoc = InferSchemaType<typeof CourseSchema> & { _id: string };

export default models.Course || model('Course', CourseSchema);
