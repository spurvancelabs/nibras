import { Schema, model, models, type InferSchemaType } from 'mongoose';
import { MATERIAL_KINDS, type MaterialKind } from '@/lib/constants';

export { MATERIAL_KINDS };
export type { MaterialKind };

const MaterialSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
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
    description: { type: String, default: '' },
    kind: { type: String, enum: MATERIAL_KINDS, required: true },

    // For uploaded files (Cloudinary)
    url: { type: String, required: true },
    publicId: { type: String, default: '' }, // for deletion
    resourceType: { type: String, default: 'image' }, // image | raw | video
    format: { type: String, default: '' }, // pdf, pptx, link, …
    size: { type: Number, default: 0 }, // bytes
    originalName: { type: String, default: '' },

    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

MaterialSchema.index({ orgId: 1, sessionId: 1, createdAt: 1 });

export type MaterialDoc = InferSchemaType<typeof MaterialSchema> & {
  _id: string;
};

export default models.Material || model('Material', MaterialSchema);