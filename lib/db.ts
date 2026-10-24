// =============================================================================
// FILE: lib/db.ts
// SECURITY FIX: the database password was hard-coded here as a fallback.
// It is now read ONLY from the MONGODB_URI environment variable.
// -> Make sure MONGODB_URI is set in Vercel (Settings → Environment Variables)
//    BEFORE deploying, then rotate the old database password in MongoDB Atlas.
// =============================================================================

import mongoose from 'mongoose';

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as { _mongoose?: Cached };

const cached: Cached =
  globalForMongoose._mongoose ?? (globalForMongoose._mongoose = { conn: null, promise: null });

export async function db(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // Checked at call time (not import time) so `next build` still works.
    throw new Error('Missing MONGODB_URI in environment');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      // Vercel-optimized connection pooling
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      w: 'majority',
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}
