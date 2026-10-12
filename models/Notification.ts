import { Schema, model, models, type InferSchemaType } from 'mongoose';
import { NOTIFICATION_TYPES, type NotificationType } from '@/lib/constants';

export { NOTIFICATION_TYPES };
export type { NotificationType };

const NotificationSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    link: { type: String, default: '' }, // relative path in app, e.g. /assignments/abc

    readAt: { type: Date, default: null, index: true },

    // Optional dedupe key for cron-style notifications. Indexed below.
    dedupeKey: { type: String, default: '', index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ orgId: 1, userId: 1, createdAt: -1 });
NotificationSchema.index({ orgId: 1, userId: 1, readAt: 1 });
NotificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeKey: { $type: 'string', $gt: '' } },
  }
);

export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & {
  _id: string;
};

export default models.Notification ||
  model('Notification', NotificationSchema);