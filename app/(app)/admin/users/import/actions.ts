'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth-helpers';
import {
  validateImport,
  commitImport,
  type ImportRowValidation,
  type ValidateResult,
  type CommitResult,
} from '@/lib/user-import';

const validateSchema = z.object({
  csv: z.string().min(1).max(500_000), // ~500 KB
  memberIdFormat: z.string().optional(),
  memberIdRequired: z.boolean().optional(),
});

const rowSchema = z.object({
  line: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['admin', 'mentor', 'student']),
  program: z.string(),
  password: z.string(),
  hasExplicitPassword: z.boolean().optional().default(false),
  memberId: z.string().optional(),
  memberIdSource: z.enum(['csv', 'generated', 'none']).optional(),
  status: z.enum(['ok', 'error', 'warning']),
  error: z.string().optional(),
  programId: z.string().optional(),
  programName: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

const commitSchema = z.object({
  rows: z.array(rowSchema).max(500),
  sendEmails: z.boolean(),
});

export type ValidateActionResult = ValidateResult;

export async function validateImportAction(
  raw: unknown
): Promise<ValidateActionResult> {
  const admin = await requireRole('admin');

  const parsed = validateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input' };
  }

  const res = await validateImport(admin.orgId, parsed.data.csv, {
    memberIdFormat: parsed.data.memberIdFormat,
    memberIdRequired: parsed.data.memberIdRequired,
  });
  return res;
}

export type CommitActionResult = CommitResult;
export async function commitImportAction(
  raw: unknown
): Promise<CommitActionResult> {
  const admin = await requireRole('admin');

  const parsed = commitSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input' };
  }

  // Best-effort origin for email links
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;

  return commitImport({
    orgId: admin.orgId,
    rows: parsed.data.rows as ImportRowValidation[],
    sendEmails: parsed.data.sendEmails,
    origin,
  });
}