import { Schema, model, models, type InferSchemaType } from 'mongoose';

const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: { type: String },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export type OrganizationDoc = InferSchemaType<typeof OrganizationSchema> & {
  _id: string;
};

export default models.Organization ||
  model('Organization', OrganizationSchema);