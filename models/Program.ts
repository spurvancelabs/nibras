import { Schema, model, models, type InferSchemaType } from 'mongoose';

const ProgramSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'active',
    },
    mentors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    students: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ProgramSchema.index({ orgId: 1, name: 1 });
ProgramSchema.index({ orgId: 1, status: 1 });

export type ProgramDoc = InferSchemaType<typeof ProgramSchema> & {
  _id: string;
};

export default models.Program || model('Program', ProgramSchema);