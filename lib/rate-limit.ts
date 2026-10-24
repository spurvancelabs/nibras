// =============================================================================
// FILE: lib/rate-limit.ts   (NEW FILE)
// Fixed-window counters stored in MongoDB.
// FAIL-OPEN: if the database hiccups, requests are allowed (availability first)
// and the problem is logged.
// =============================================================================

import 'server-only';
import { db } from './db';
import RateLimit from '@/models/RateLimit';

/** Current counts for the given keys (expired windows count as 0). */
export async function getCounts(keys: string[]): Promise<Map<string, number>> {
  try {
    await db();
    const rows = await RateLimit.find({ key: { $in: keys }, expiresAt: { $gt: new Date() } })
      .select('key count')
      .lean();
    return new Map(
      (rows as { key: string; count: number }[]).map((r) => [String(r.key), Number(r.count) || 0])
    );
  } catch (e) {
    console.error('[rate-limit] read failed (allowing):', e);
    return new Map();
  }
}

/** Add 1 to a counter; starts a new window when the old one has expired. */
export async function hit(key: string, windowSeconds: number): Promise<number> {
  try {
    await db();
    const now = new Date();
    const inWindow = await RateLimit.findOneAndUpdate(
      { key, expiresAt: { $gt: now } },
      { $inc: { count: 1 } },
      { new: true }
    ).lean();
    if (inWindow) return Number((inWindow as { count: number }).count) || 1;
    await RateLimit.updateOne(
      { key },
      { $set: { count: 1, expiresAt: new Date(now.getTime() + windowSeconds * 1000) } },
      { upsert: true }
    );
    return 1;
  } catch (e) {
    // A duplicate-key race on first insert is harmless.
    if ((e as { code?: number }).code !== 11000) console.error('[rate-limit] write failed:', e);
    return 0;
  }
}

export async function clear(keys: string[]): Promise<void> {
  try {
    await db();
    await RateLimit.deleteMany({ key: { $in: keys } });
  } catch (e) {
    console.error('[rate-limit] clear failed:', e);
  }
}
