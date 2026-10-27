// =============================================================================
// FILE: lib/cache.ts   (NEW FILE — server only)
// Short-lived caching for expensive, per-user read-only summaries (dashboard
// tiles, progress). Values are plain JSON. If the cache layer fails, the
// function simply runs normally — caching never breaks a page.
// =============================================================================

import 'server-only';
import { unstable_cache } from 'next/cache';

export async function cached<T>(key: string[], seconds: number, fn: () => Promise<T>, tags: string[] = []): Promise<T> {
  try {
    return await unstable_cache(fn, ['v4', ...key], { revalidate: seconds, tags })();
  } catch (e) {
    console.warn('[cache] bypassed', key.join(':'), e);
    return fn();
  }
}

/** Drop cached summaries for these users right away (e.g. after grading). */
export async function invalidateUserCaches(userIds: string[]): Promise<void> {
  try {
    const mod = await import('next/cache');
    for (const id of userIds) {
      try {
        mod.updateTag(`user-summary:${id}`);
      } catch {
        mod.revalidateTag(`user-summary:${id}`, { expire: 0 });
      }
    }
  } catch {
    /* expires on its own */
  }
}
