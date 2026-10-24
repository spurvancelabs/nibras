// =============================================================================
// FILE: models/Syllabus.ts   (NEW FILE)
// One syllabus per program: overview, outcomes, prerequisites, how students
// are assessed, and week-by-week modules (topics, linked sessions, resources).
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';

const ResourceSchema = new Schema(
  { title: { type: String, required: true, maxlength: 200 }, url: { type: String, required: true, maxlength: 500 } },
  { _id: false }
);

const ModuleSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    weekLabel: { type: String, default: '', maxlength: 60 },
    summary: { type: String, default: '', maxlength: 3000 },
    topics: { type: [String], default: [] },
    sessionIds: { type: [Schema.Types.ObjectId], default: [] },
    resources: { type: [ResourceSchema], default: [] },
  },
  { _id: true }
);

const SyllabusSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true, unique: true },
    overview: { type: String, default: '', maxlength: 6000 },
    outcomes: { type: [String], default: [] },
    prerequisites: { type: [String], default: [] },
    assessment: { type: String, default: '', maxlength: 3000 },
    modules: { type: [ModuleSchema], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export type SyllabusDoc = InferSchemaType<typeof SyllabusSchema> & { _id: string };

export default models.Syllabus || model('Syllabus', SyllabusSchema);
