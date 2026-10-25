'use server';

// =============================================================================
// FILE: app/(app)/search-actions.ts   (NEW FILE)
// Server action behind the command palette search. Rate-limited per user.
// =============================================================================

import { requireAuth } from '@/lib/auth-helpers';
import { quickSearch, type SearchHit } from '@/lib/search';
import { hit } from '@/lib/rate-limit';

export async function searchAction(q: string): Promise<SearchHit[]> {
  const me = await requireAuth({ allowWithout2fa: true });
  if (typeof q !== 'string' || q.trim().length < 2) return [];
  // 120 searches per minute per user is plenty for typing.
  const n = await hit(`search:${me.id}`, 60);
  if (n > 120) return [];
  try {
    return await quickSearch(me.orgId, me, q);
  } catch (e) {
    console.error('[search] failed', e);
    return [];
  }
}
