'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth-helpers';
import {
  validateImport,
  commitImport,
  type ImportRowValidation,
} from '@/lib/user-import';

const validateSchema = z.object({
  csv: z.string().min(1).max(500_000), // ~500 KB
});

const rowSchema = z.object({
  line: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['admin', 'mentor', 'student']),
  program: z.string(),
  password: z.string(),
  hasExplicitPassword: z.boolean().optional().default(false),
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

export type ValidateActionResult =
  | {
      ok: true;
      rows: ImportRowValidation[];
      summary: { total: number; ok: number; errors: number; warnings: number };
    }
  | { ok: false; error: string };

export async function validateImportAction(
  raw: unknown
): Promise<ValidateActionResult> {
  const admin = await requireRole('admin');

  const parsed = validateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input' };
  }

  const res = await validateImport(admin.orgId, parsed.data.csv);
  if (!res.ok) return res;

  return { ok: true, rows: res.rows, summary: res.summary };
}

export type CommitActionResult =
  | {
      ok: true;
      created: number;
      skipped: number;
      failed: { line: number; email: string; reason: string }[];
      credentials: {
        name: string;
        email: string;
        password: string;
        hasExplicitPassword: boolean;
      }[];
    }
  | { ok: false; error: string };
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