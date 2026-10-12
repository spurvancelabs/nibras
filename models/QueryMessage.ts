import { Schema, model, models, type InferSchemaType } from 'mongoose';

export type MessageAttachment = {
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
  size: number;
  originalName: string;
};

const AttachmentSchema = new Schema<MessageAttachment>(
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

const QueryMessageSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    queryId: {
      type: Schema.Types.ObjectId,
      ref: 'Query',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: { type: [AttachmentSchema], default: [] },
  },
  { timestamps: true }
);

QueryMessageSchema.index({ orgId: 1, queryId: 1, createdAt: 1 });

export type QueryMessageDoc = InferSchemaType<typeof QueryMessageSchema> & {
  _id: string;
};

export default models.QueryMessage ||
  model('QueryMessage', QueryMessageSchema);