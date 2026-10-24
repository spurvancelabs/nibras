// =============================================================================
// FILE: app/(app)/admin/users/import/actions.ts
// CSV import actions.
// SECURITY FIX: "Create users" now sends only the preview's job ID; the rows
// that are imported are the ones the SERVER validated (see lib/user-import.ts).
// Welcome emails run in after() through the batch sender, and the result
// (sent / failed) is written to the audit log.
// =============================================================================

'use server';

import { z } from 'zod';
import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireRole, isRoyal } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { appOrigin } from '@/lib/request-info';
import { audit } from '@/lib/audit';
import {
  validateImport,
  commitImport,
  sendWelcomeEmails,
  type ValidateResult,
  type CommitResult,
} from '@/lib/user-import';

const validateSchema = z.object({
  csv: z.string().min(1).max(500_000), // ~500 KB
  memberIdFormat: z.string().max(40).optional(),
  memberIdRequired: z.boolean().optional(),
});

const commitSchema = z.object({
  jobId: z.string().regex(/^[a-f0-9]{24}$/i),
  sendEmails: z.boolean(),
});

type Admin = { id: string; orgId: string; email?: string | null; name?: string | null };

export type ValidateActionResult = ValidateResult;

export async function validateImportAction(raw: unknown): Promise<ValidateActionResult> {
  const admin = (await requireRole('admin')) as Admin;

  const parsed = validateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  // The org setting always applies, even if the page sent "not required".
  const settings = await getSettings();
  return validateImport(admin.orgId, parsed.data.csv, {
    createdBy: admin.id,
    memberIdFormat: parsed.data.memberIdFormat,
    memberIdRequired: parsed.data.memberIdRequired === true || settings.memberIdRequired === true,
    allowAdmins: await isRoyal(admin as never),
  });
}

export type CommitActionResult = CommitResult;

export async function commitImportAction(raw: unknown): Promise<CommitActionResult> {
  const admin = (await requireRole('admin')) as Admin;

  const parsed = commitSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'This page is out of date — reload it and validate the CSV again.' };
  }

  const res = await commitImport({ orgId: admin.orgId, jobId: parsed.data.jobId, actorId: admin.id });
  if (!res.ok) return res;

  const who = { orgId: admin.orgId, actorId: admin.id, actorEmail: admin.email ?? '', actorName: admin.name ?? '' };
  await audit({
    ...who,
    action: 'user.import',
    targetIds: res.createdIds,
    summary: `Imported ${res.created} user${res.created === 1 ? '' : 's'} · ${res.skipped} skipped · ${res.failed.length} failed`,
    meta: { created: res.created, skipped: res.skipped, failed: res.failed.slice(0, 100), emails: parsed.data.sendEmails },
  });

  let emailsQueued = 0;
  if (parsed.data.sendEmails && res.credentials.length > 0) {
    const origin = await appOrigin();
    const list = res.credentials;
    emailsQueued = list.length;
    after(async () => {
      try {
        const r = await sendWelcomeEmails(list, origin);
        await audit({
          ...who,
          action: 'user.welcome_emails',
          targetIds: res.createdIds,
          summary: `Welcome emails: ${r.sent} sent, ${r.failed.length} failed`,
          meta: { sent: r.sent, failed: r.failed.slice(0, 200) },
          ip: '',
        });
      } catch (e) {
        console.error('[import] welcome emails failed', e);
        await audit({
          ...who,
          action: 'user.welcome_emails',
          targetIds: res.createdIds,
          summary: `Welcome emails FAILED: ${(e as Error)?.message ?? 'unknown error'}`,
          ip: '',
        });
      }
    });
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin/programs');
  return { ...res, emailsQueued };
}
