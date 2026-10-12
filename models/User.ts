import { Schema, model, models, type InferSchemaType } from 'mongoose';
import { ROLES, type Role } from '@/lib/constants';

export { ROLES };
export type { Role };

const UserSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    avatar: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    programIds: [{ type: Schema.Types.ObjectId, ref: 'Program' }],
  },
  { timestamps: true }
);

UserSchema.index({ orgId: 1, email: 1 }, { unique: true });
UserSchema.index({ orgId: 1, role: 1 });
UserSchema.index({ orgId: 1, programIds: 1 });

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: string;
};

export default models.User || model('User', UserSchema);