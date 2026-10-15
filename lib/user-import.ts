import 'server-only';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';
import User from '@/models/User';
import Program from '@/models/Program';
import type { Role } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportRow = {
  line: number; // 1-based, excludes header
  name: string;
  email: string;
  role: Role;
  program: string;
  password: string;
  hasExplicitPassword: boolean;
};

export type ImportRowValidation = ImportRow & {
  status: 'ok' | 'error' | 'warning';
  error?: string;
  programId?: string;
  programName?: string;
  warnings?: string[];
};

export type ValidateResult =
  | { ok: true; rows: ImportRowValidation[]; summary: ImportSummary }
  | { ok: false; error: string };

export type CommitResult =
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

export type ImportSummary = {
  total: number;
  ok: number;
  errors: number;
  warnings: number;
};

// ---------------------------------------------------------------------------
// CSV parser (RFC-4180-lite)
// ---------------------------------------------------------------------------

export function parseCsv(input: string): {
  header: string[];
  rows: Record<string, string>[];
  error?: string;
} {
  const text = input.replace(/^\uFEFF/, ''); // strip BOM
  const records = parseCsvRecords(text);
  if (records.length === 0) return { header: [], rows: [], error: 'No data found' };

  const header = records[0].map((h) => h.trim().toLowerCase());
  const required = ['name', 'email'];
  for (const r of required) {
    if (!header.includes(r)) {
      return { header, rows: [], error: `Missing required column: ${r}` };
    }
  }

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < records.length; i++) {
    const cells = records[i];
    if (cells.every((c) => c.trim() === '')) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = (cells[j] ?? '').trim();
    }
    rows.push(row);
  }
  return { header, rows };
}

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        records.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  return records.filter((r) => r.length > 0);
}

// ---------------------------------------------------------------------------
// Password generation (used when CSV has no password column)
// ---------------------------------------------------------------------------

const SAFE = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generatePassword(len = 10): string {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += SAFE[bytes[i] % SAFE.length];
  return out;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES: Role[] = ['admin', 'mentor', 'student'];

export async function validateImport(
  orgId: string,
  csv: string
): Promise<ValidateResult> {
  if (!csv.trim()) return { ok: false, error: 'CSV is empty' };

  const { rows, error } = parseCsv(csv);
  if (error) return { ok: false, error };
  if (rows.length === 0) return { ok: false, error: 'No data rows found' };
  if (rows.length > 500) return { ok: false, error: 'Max 500 rows per import' };

  await db();

  const programs = await Program.find({ orgId }).select('_id name').lean();
  const programByName = new Map<string, { id: string; name: string }>();
  for (const p of programs) {
    programByName.set(String(p.name).trim().toLowerCase(), {
      id: String(p._id),
      name: p.name as string,
    });
  }

  const incomingEmails = rows
    .map((r) => (r.email ?? '').toLowerCase().trim())
    .filter(Boolean);

  const existingUsers = await User.find({
    orgId,
    email: { $in: incomingEmails },
  })
    .select('email')
    .lean();
  const existingEmails = new Set(
    existingUsers.map((u) => String(u.email).toLowerCase())
  );

  const seenInBatch = new Set<string>();
  const validated: ImportRowValidation[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 2;

    const name = (r.name ?? '').trim();
    const email = (r.email ?? '').trim().toLowerCase();
    const roleRaw = (r.role ?? '').trim().toLowerCase();
    const role: Role = roleRaw ? (roleRaw as Role) : 'student';
    const programRaw = (r.program ?? '').trim();
    const explicitPassword = (r.password ?? '').trim();

    const hasExplicitPassword = explicitPassword.length > 0;
    const password = hasExplicitPassword ? explicitPassword : generatePassword();

    const base: ImportRow = {
      line,
      name,
      email,
      role,
      program: programRaw,
      password,
      hasExplicitPassword,
    };

    // --- errors ---
    if (!name) {
      validated.push({ ...base, status: 'error', error: 'Name is required' });
      continue;
    }
    if (!email) {
      validated.push({ ...base, status: 'error', error: 'Email is required' });
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      validated.push({ ...base, status: 'error', error: 'Invalid email format' });
      continue;
    }
    if (!ALLOWED_ROLES.includes(role)) {
      validated.push({
        ...base,
        status: 'error',
        error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`,
      });
      continue;
    }
    if (existingEmails.has(email)) {
      validated.push({
        ...base,
        status: 'error',
        error: 'Email already exists in this organization',
      });
      continue;
    }
    if (seenInBatch.has(email)) {
      validated.push({
        ...base,
        status: 'error',
        error: 'Duplicate email within this file',
      });
      continue;
    }

    // --- explicit password rules ---
    if (hasExplicitPassword && explicitPassword.length < 6) {
      validated.push({
        ...base,
        status: 'error',
        error: 'Password must be at least 6 characters',
      });
      continue;
    }
    if (hasExplicitPassword && explicitPassword.length > 100) {
      validated.push({
        ...base,
        status: 'error',
        error: 'Password must be 100 characters or fewer',
      });
      continue;
    }

    // --- warnings ---
    const warnings: string[] = [];
    let programId: string | undefined;
    let programName: string | undefined;

    if (programRaw) {
      const found = programByName.get(programRaw.toLowerCase());
      if (found) {
        programId = found.id;
        programName = found.name;
      } else {
        warnings.push(
          `Program "${programRaw}" not found — user will be created without it`
        );
      }
    }

    seenInBatch.add(email);
    validated.push({
      ...base,
      status: warnings.length > 0 ? 'warning' : 'ok',
      programId,
      programName,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  }

  const summary: ImportSummary = {
    total: validated.length,
    ok: validated.filter((r) => r.status === 'ok').length,
    errors: validated.filter((r) => r.status === 'error').length,
    warnings: validated.filter((r) => r.status === 'warning').length,
  };

  return { ok: true, rows: validated, summary };
}

// ---------------------------------------------------------------------------
// Commit
// ---------------------------------------------------------------------------

export async function commitImport(input: {
  orgId: string;
  rows: ImportRowValidation[];
  sendEmails: boolean;
  origin: string;
}): Promise<CommitResult> {
  await db();

  const created: {
    name: string;
    email: string;
    password: string;
    hasExplicitPassword: boolean;
  }[] = [];
  const failed: { line: number; email: string; reason: string }[] = [];
  let skipped = 0;

  for (const row of input.rows) {
    if (row.status === 'error') {
      skipped++;
      continue;
    }

    try {
      const passwordHash = await bcrypt.hash(row.password, 10);

      // Verify the hash round-trips. If this fails, something is deeply wrong
      // (corrupt password string, encoding issue, etc.) — surface it instead
      // of silently creating a user who can't log in.
      const verified = await bcrypt.compare(row.password, passwordHash);
      if (!verified) {
        failed.push({
          line: row.line,
          email: row.email,
          reason: 'Password hash verification failed — user not created',
        });
        continue;
      }

      const doc = await User.create({
        orgId: input.orgId,
        name: row.name,
        email: row.email,
        passwordHash,
        role: row.role,
        status: 'active',
        avatar: '',
        programIds: row.programId ? [row.programId] : [],
      });

      if (row.programId) {
        const field = row.role === 'mentor' ? 'mentors' : 'students';
        await Program.updateOne(
          { _id: row.programId, orgId: input.orgId },
          { $addToSet: { [field]: doc._id } }
        );
      }

      created.push({
        name: row.name,
        email: row.email,
        password: row.password,
        hasExplicitPassword: row.hasExplicitPassword,
      });
    } catch (e) {
      const err = e as { code?: number; message?: string };
      failed.push({
        line: row.line,
        email: row.email,
        reason:
          err.code === 11000
            ? 'Email already exists'
            : err.message ?? 'Unknown error',
      });
    }
  }

  if (input.sendEmails && created.length > 0) {
    void sendWelcomeEmails(input.orgId, created, input.origin);
  }

  return {
    ok: true,
    created: created.length,
    skipped,
    failed,
    credentials: created,
  };
}

// ---------------------------------------------------------------------------
// Welcome emails (fire-and-forget)
// ---------------------------------------------------------------------------

async function sendWelcomeEmails(
  orgId: string,
  users: {
    name: string;
    email: string;
    password: string;
    hasExplicitPassword: boolean;
  }[],
  origin: string
): Promise<void> {
  const { sendEmail } = await import('./email');
  const { getSettings } = await import('./settings');
  const settings = await getSettings();
  const loginUrl = `${origin.replace(/\/$/, '')}/login`;

  const chunks: typeof users[] = [];
  for (let i = 0; i < users.length; i += 10) {
    chunks.push(users.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map((u) =>
        sendEmail({
          to: u.email,
          subject: `Your ${settings.orgName} account`,
          heading: `Welcome to ${settings.orgName}`,
          body:
            `Hi ${u.name},\n\n` +
            `An account has been created for you.\n\n` +
            `Email: ${u.email}\n` +
            (u.hasExplicitPassword
              ? `Password: use the one provided by your administrator.\n\n`
              : `Temporary password: ${u.password}\n\n`) +
            `Please sign in and change your password from your profile.`,
          link: loginUrl,
          ctaLabel: 'Sign in',
        })
      )
    );
  }
}