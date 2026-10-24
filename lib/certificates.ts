// =============================================================================
// FILE: lib/certificates.ts   (NEW FILE — server only)
// Certificate rules per program, eligibility, issue / revoke, listing, and the
// public verification lookup.
// =============================================================================

import 'server-only';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { db } from './db';
import Program from '@/models/Program';
import Certificate from '@/models/Certificate';
import CertificateConfig from '@/models/CertificateConfig';
import { computeProgramProgress, type StudentProgress } from './progress';
import { getSettings } from './settings';
import { zonedParts } from './time';

/* eslint-disable @typescript-eslint/no-explicit-any */

const isId = (v: unknown): v is string => typeof v === 'string' && Types.ObjectId.isValid(v);

export type CertStyle = 'classic' | 'modern' | 'elegant';

export type CertConfig = {
  title: string;
  statement: string;
  style: CertStyle;
  signatoryName: string;
  signatoryTitle: string;
  signatureImage: string;
  minAttendance: number;
  minAssignments: number;
  minQuizzes: number;
  showScores: boolean;
};

export const DEFAULT_CERT_CONFIG: CertConfig = {
  title: 'Certificate of Completion',
  statement: 'has successfully completed the program',
  style: 'classic',
  signatoryName: '',
  signatoryTitle: '',
  signatureImage: '',
  minAttendance: 0,
  minAssignments: 0,
  minQuizzes: 0,
  showScores: false,
};

export async function getCertConfig(orgId: string, programId: string): Promise<CertConfig> {
  await db();
  const c = (await CertificateConfig.findOne({ orgId, programId }).lean()) as any;
  return c ? { ...DEFAULT_CERT_CONFIG, ...Object.fromEntries(Object.keys(DEFAULT_CERT_CONFIG).map((k) => [k, c[k] ?? (DEFAULT_CERT_CONFIG as any)[k]])) } : DEFAULT_CERT_CONFIG;
}

export async function saveCertConfig(orgId: string, programId: string, cfg: CertConfig) {
  await db();
  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));
  await CertificateConfig.updateOne(
    { orgId, programId },
    {
      $set: {
        title: cfg.title.trim().slice(0, 80) || DEFAULT_CERT_CONFIG.title,
        statement: cfg.statement.trim().slice(0, 200) || DEFAULT_CERT_CONFIG.statement,
        style: ['classic', 'modern', 'elegant'].includes(cfg.style) ? cfg.style : 'classic',
        signatoryName: cfg.signatoryName.trim().slice(0, 80),
        signatoryTitle: cfg.signatoryTitle.trim().slice(0, 80),
        signatureImage: /^https?:\/\//i.test(cfg.signatureImage) ? cfg.signatureImage.slice(0, 500) : '',
        minAttendance: clamp(cfg.minAttendance),
        minAssignments: clamp(cfg.minAssignments),
        minQuizzes: clamp(cfg.minQuizzes),
        showScores: !!cfg.showScores,
      },
      $setOnInsert: { orgId, programId },
    },
    { upsert: true }
  );
}

export type EligibilityRow = StudentProgress & {
  eligible: boolean;
  reasons: string[];
  certificate: { id: string; certNo: string; issuedAt: string } | null;
};

function check(p: StudentProgress, cfg: CertConfig): string[] {
  const out: string[] = [];
  const need = (label: string, have: number | null, min: number) => {
    if (min > 0 && (have === null || have < min)) out.push(`${label} ${have === null ? 'n/a' : `${have}%`} < ${min}%`);
  };
  need('Attendance', p.attendance.percent, cfg.minAttendance);
  need('Assignments', p.assignments.percent, cfg.minAssignments);
  need('Quizzes', p.quizzes.percent, cfg.minQuizzes);
  return out;
}

export async function getEligibility(orgId: string, programId: string) {
  const [progress, cfg] = await Promise.all([computeProgramProgress(orgId, programId), getCertConfig(orgId, programId)]);
  if (!progress) return null;
  const certs = (await Certificate.find({ orgId, programId, status: 'issued' }).select('studentId certNo issuedAt').lean()) as any[];
  const byStudent = new Map(certs.map((c) => [String(c.studentId), c]));
  const rows: EligibilityRow[] = progress.students.map((s) => {
    const reasons = check(s, cfg);
    const c = byStudent.get(s.studentId);
    return {
      ...s,
      eligible: reasons.length === 0,
      reasons,
      certificate: c ? { id: String(c._id), certNo: c.certNo, issuedAt: new Date(c.issuedAt).toISOString() } : null,
    };
  });
  return { cfg, rows };
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomBlock(n: number) {
  let s = '';
  for (let i = 0; i < n; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return s;
}

export async function issueCertificates(
  orgId: string,
  actorId: string,
  programId: string,
  studentIds: string[],
  opts: { override?: boolean } = {}
): Promise<{ ok: true; issued: { studentId: string; certNo: string; id: string; name: string }[]; skipped: { studentId: string; name: string; reason: string }[] } | { ok: false; error: string }> {
  if (!isId(programId)) return { ok: false, error: 'Program not found' };
  await db();
  const program = (await Program.findOne({ _id: programId, orgId }).lean()) as any;
  if (!program) return { ok: false, error: 'Program not found' };
  const elig = await getEligibility(orgId, programId);
  if (!elig) return { ok: false, error: 'Program not found' };
  const settings = await getSettings();
  const year = zonedParts(new Date()).year;
  const prefix = (settings.certPrefix || 'CERT').toUpperCase();

  const issued: { studentId: string; certNo: string; id: string; name: string }[] = [];
  const skipped: { studentId: string; name: string; reason: string }[] = [];
  for (const sid of Array.from(new Set(studentIds)).slice(0, 1000)) {
    const row = elig.rows.find((r) => r.studentId === sid);
    if (!row) {
      skipped.push({ studentId: sid, name: 'Unknown', reason: 'Not a student of this program' });
      continue;
    }
    if (row.certificate) {
      skipped.push({ studentId: sid, name: row.name, reason: 'Already has a certificate' });
      continue;
    }
    if (!row.eligible && !opts.override) {
      skipped.push({ studentId: sid, name: row.name, reason: row.reasons.join(', ') });
      continue;
    }
    const cfg = elig.cfg;
    for (let tries = 0; tries < 5; tries++) {
      const certNo = `${prefix}-${year}-${randomBlock(4)}-${randomBlock(4)}`;
      try {
        const doc = await Certificate.create({
          orgId,
          programId,
          studentId: sid,
          certNo,
          status: 'issued',
          issuedAt: new Date(),
          issuedBy: actorId,
          studentName: row.name,
          memberId: row.memberId,
          programName: program.name,
          programStart: program.startDate ?? null,
          programEnd: program.endDate ?? null,
          attendancePercent: row.attendance.percent,
          assignmentPercent: row.assignments.percent,
          quizPercent: row.quizzes.percent,
          title: cfg.title,
          statement: cfg.statement,
          style: cfg.style,
          issuerName: settings.certIssuerName || settings.orgName,
          signatoryName: cfg.signatoryName || settings.certSignatoryName,
          signatoryTitle: cfg.signatoryTitle || settings.certSignatoryTitle,
          signatureImage: cfg.signatureImage || settings.certSignatureImage,
          logo: settings.logo,
          showScores: cfg.showScores,
          footerText: settings.certFooterText,
        });
        issued.push({ studentId: sid, certNo, id: String(doc._id), name: row.name });
        break;
      } catch (e) {
        const err = e as { code?: number; keyPattern?: Record<string, unknown> };
        if (err.code === 11000 && err.keyPattern?.certNo) continue; // number clash — try another
        if (err.code === 11000) {
          skipped.push({ studentId: sid, name: row.name, reason: 'Already has a certificate' });
          break;
        }
        throw e;
      }
    }
  }
  return { ok: true, issued, skipped };
}

export async function revokeCertificate(orgId: string, actorId: string, certId: string, reason: string) {
  if (!isId(certId)) return { ok: false as const, error: 'Certificate not found' };
  await db();
  const c = (await Certificate.findOne({ _id: certId, orgId }).lean()) as any;
  if (!c) return { ok: false as const, error: 'Certificate not found' };
  if (c.status === 'revoked') return { ok: false as const, error: 'Already revoked' };
  await Certificate.updateOne(
    { _id: certId, orgId },
    { $set: { status: 'revoked', revokedAt: new Date(), revokedBy: actorId, revokedReason: reason.slice(0, 300) } }
  );
  return { ok: true as const, certNo: c.certNo as string, studentId: String(c.studentId), programId: String(c.programId), studentName: c.studentName as string };
}

export type CertificateView = {
  id: string;
  certNo: string;
  status: 'issued' | 'revoked';
  issuedAt: string;
  revokedAt: string | null;
  revokedReason: string;
  studentId: string;
  studentName: string;
  memberId: string;
  programId: string;
  programName: string;
  programStart: string | null;
  programEnd: string | null;
  attendancePercent: number | null;
  assignmentPercent: number | null;
  quizPercent: number | null;
  title: string;
  statement: string;
  style: CertStyle;
  issuerName: string;
  signatoryName: string;
  signatoryTitle: string;
  signatureImage: string;
  logo: string;
  showScores: boolean;
  footerText: string;
};

function toView(c: any): CertificateView {
  const iso = (d: any) => (d ? new Date(d).toISOString() : null);
  return {
    id: String(c._id),
    certNo: c.certNo,
    status: c.status,
    issuedAt: new Date(c.issuedAt).toISOString(),
    revokedAt: iso(c.revokedAt),
    revokedReason: c.revokedReason ?? '',
    studentId: String(c.studentId),
    studentName: c.studentName,
    memberId: c.memberId ?? '',
    programId: String(c.programId),
    programName: c.programName,
    programStart: iso(c.programStart),
    programEnd: iso(c.programEnd),
    attendancePercent: c.attendancePercent ?? null,
    assignmentPercent: c.assignmentPercent ?? null,
    quizPercent: c.quizPercent ?? null,
    title: c.title,
    statement: c.statement,
    style: (c.style as CertStyle) ?? 'classic',
    issuerName: c.issuerName ?? '',
    signatoryName: c.signatoryName ?? '',
    signatoryTitle: c.signatoryTitle ?? '',
    signatureImage: c.signatureImage ?? '',
    logo: c.logo ?? '',
    showScores: !!c.showScores,
    footerText: c.footerText ?? '',
  };
}

/** Certificates the viewer may see: own (student), their programs (mentor), all (admin). */
export async function listCertificates(orgId: string, user: { id: string; role: string }, programId?: string): Promise<CertificateView[]> {
  await db();
  const q: Record<string, unknown> = { orgId };
  if (user.role === 'student') q.studentId = user.id;
  else if (user.role === 'mentor') {
    const mine = ((await Program.find({ orgId, mentors: user.id }).select('_id').lean()) as any[]).map((p) => p._id);
    q.programId = { $in: mine };
  }
  if (isId(programId)) {
    if (user.role === 'mentor' && !(await Program.exists({ _id: programId, orgId, mentors: user.id }))) return [];
    q.programId = programId;
  }
  const rows = (await Certificate.find(q).sort({ issuedAt: -1 }).limit(1000).lean()) as any[];
  return rows.map(toView);
}

export async function getCertificate(orgId: string, user: { id: string; role: string }, id: string): Promise<CertificateView | null> {
  if (!isId(id)) return null;
  await db();
  const c = (await Certificate.findOne({ _id: id, orgId }).lean()) as any;
  if (!c) return null;
  if (user.role === 'student' && String(c.studentId) !== user.id) return null;
  if (user.role === 'mentor' && !(await Program.exists({ _id: c.programId, orgId, mentors: user.id }))) return null;
  return toView(c);
}

/** Public: look up by certificate number. Only returns what a certificate shows anyway. */
export async function verifyCertificate(certNo: string) {
  const no = (certNo ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{8,40}$/.test(no)) return null;
  await db();
  const c = (await Certificate.findOne({ certNo: no }).lean()) as any;
  if (!c) return null;
  return {
    certNo: c.certNo as string,
    status: c.status as 'issued' | 'revoked',
    studentName: c.studentName as string,
    programName: c.programName as string,
    issuedAt: new Date(c.issuedAt).toISOString(),
    revokedAt: c.revokedAt ? new Date(c.revokedAt).toISOString() : null,
    revokedReason: (c.revokedReason as string) || '',
    issuerName: (c.issuerName as string) || '',
    title: c.title as string,
    id: String(c._id),
  };
}
