import { Schema, model, models, type InferSchemaType } from 'mongoose';

export const ROLES = ['admin', 'mentor', 'student'] as const;
export type Role = (typeof ROLES)[number];

const UserSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    avatar: { type: String },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Email is unique *within* an org, not globally
UserSchema.index({ orgId: 1, email: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: string;
};

export default models.User || model('User', UserSchema);