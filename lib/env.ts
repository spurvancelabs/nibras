import { z } from 'zod';

const schema = z.object({
  MONGODB_URI: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().url().optional(),

  RESEND_API_KEY: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_PRESET: z.string().optional(),

  CRON_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid env vars:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;