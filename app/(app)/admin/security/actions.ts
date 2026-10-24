// =============================================================================
// FILE: app/(app)/admin/security/actions.ts   (NEW FILE)
// Royal-only security actions.
// =============================================================================

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole, isRoyal } from '@/lib/auth-helpers';
import { revokeAllSessions } from '@/lib/users';
import { audit } from '@/lib/audit';

export async function emergencySignOutAction(
  raw: unknown
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const admin = await requireRole('admin');
  if (!(await isRoyal(admin))) return { ok: false, error: 'Only a royal admin can do this.' };
  const parsed = z.object({ confirm: z.string() }).safeParse(raw);
  if (!parsed.success || parsed.data.confirm.trim().toUpperCase() !== 'SIGN OUT EVERYONE') {
    return { ok: false, error: 'Type SIGN OUT EVERYONE to confirm.' };
  }
  const count = await revokeAllSessions(admin.orgId, admin.id);
  await audit({
    orgId: admin.orgId,
    action: 'security.emergency_signout',
    actorId: admin.id,
    actorEmail: admin.email ?? '',
    actorName: admin.name ?? '',
    summary: `Signed out ${count} account${count === 1 ? '' : 's'} on every device`,
  });
  revalidatePath('/admin/security');
  return { ok: true, count };
}
